"""
Upselling Recommender

Item-based collaborative filtering for service upselling recommendations.
Falls back to popularity-based recommendations when no similarity matrix is available.
"""

import logging
from typing import Optional

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class UpsellRecommender:
    """
    Recommends additional services based on item-item collaborative filtering.

    Uses cosine similarity on a customer-service interaction matrix to find
    services commonly booked together. Falls back to popularity-based
    recommendations when no trained model (similarity matrix) is available.
    """

    def __init__(
        self,
        similarity_matrix: Optional[np.ndarray] = None,
        service_ids: Optional[list[int]] = None,
        popularity_fallback: Optional[list[int]] = None,
        model_version: str = "v1.0.0",
    ):
        """
        Initialize the upselling recommender.

        Args:
            similarity_matrix: Pre-computed item-item cosine similarity matrix,
                or None for popularity-only fallback mode.
            service_ids: List of service IDs corresponding to matrix columns.
            popularity_fallback: List of top service IDs by booking count (up to 10).
            model_version: Version string for the loaded model.
        """
        self.similarity_matrix = similarity_matrix
        self.service_ids = service_ids or []
        self.service_id_to_idx: dict[int, int] = {}
        if service_ids:
            self.service_id_to_idx = {sid: idx for idx, sid in enumerate(service_ids)}
        self.popularity_fallback = popularity_fallback or []
        self.model_version = model_version

    def recommend(
        self,
        current_service_id: int,
        customer_history: list[int],
        n_recommendations: int = 3,
    ) -> list[dict]:
        """
        Recommend services based on current selection and customer history.

        Falls back to popularity-based recommendations if no similarity matrix
        is available or the current service is not in the matrix.

        Args:
            current_service_id: The service the customer is currently booking.
            customer_history: List of service IDs previously booked by the customer.
            n_recommendations: Number of recommendations to return.

        Returns:
            List of recommendation dicts with service_id, confidence, and reason.
        """
        if (
            self.similarity_matrix is None
            or current_service_id not in self.service_id_to_idx
        ):
            return self._popularity_fallback(current_service_id, n_recommendations)

        idx = self.service_id_to_idx[current_service_id]

        # Get similarity scores for current service
        if hasattr(self.similarity_matrix, "toarray"):
            scores = self.similarity_matrix[idx].toarray().flatten()
        else:
            scores = self.similarity_matrix[idx].flatten()

        # Exclude already-booked services and current service
        exclude_ids = set(customer_history + [current_service_id])
        for eid in exclude_ids:
            if eid in self.service_id_to_idx:
                scores[self.service_id_to_idx[eid]] = -1

        # Get top-N indices by score (descending)
        top_indices = np.argsort(scores)[::-1][:n_recommendations]

        recommendations = []
        for idx_rec in top_indices:
            if scores[idx_rec] <= 0:
                continue
            recommendations.append(
                {
                    "service_id": self.service_ids[idx_rec],
                    "confidence": float(scores[idx_rec]),
                    "reason": "collaborative_filtering",
                }
            )

        # Pad with popularity fallback if insufficient results
        if len(recommendations) < n_recommendations:
            already_recommended = {r["service_id"] for r in recommendations}
            fallback = self._popularity_fallback(
                current_service_id,
                n_recommendations - len(recommendations),
                exclude_ids=already_recommended,
            )
            recommendations.extend(fallback)

        return recommendations[:n_recommendations]

    def _popularity_fallback(
        self,
        exclude_service_id: int,
        n: int,
        exclude_ids: Optional[set[int]] = None,
    ) -> list[dict]:
        """
        Return popular services as fallback recommendations.

        Args:
            exclude_service_id: Service ID to exclude (currently selected).
            n: Number of recommendations to return.
            exclude_ids: Additional service IDs to exclude.

        Returns:
            List of recommendation dicts with confidence=0.3 and reason="popular_service".
        """
        all_excluded = {exclude_service_id}
        if exclude_ids:
            all_excluded.update(exclude_ids)

        return [
            {"service_id": sid, "confidence": 0.3, "reason": "popular_service"}
            for sid in self.popularity_fallback
            if sid not in all_excluded
        ][:n]

    @classmethod
    def build_from_bookings(cls, booking_data: list[dict]) -> "UpsellRecommender":
        """
        Build similarity matrix from booking history.

        Args:
            booking_data: List of dicts with customer_id, service_id, count keys.

        Returns:
            UpsellRecommender instance with pre-computed similarity matrix.
        """
        if not booking_data:
            return cls(similarity_matrix=None)

        customer_ids = sorted(set(b["customer_id"] for b in booking_data))
        service_ids = sorted(set(b["service_id"] for b in booking_data))

        cust_idx = {cid: i for i, cid in enumerate(customer_ids)}
        svc_idx = {sid: i for i, sid in enumerate(service_ids)}

        rows, cols, data = [], [], []
        for b in booking_data:
            rows.append(cust_idx[b["customer_id"]])
            cols.append(svc_idx[b["service_id"]])
            data.append(b["count"])

        # Build sparse customer-service matrix
        matrix = csr_matrix(
            (data, (rows, cols)), shape=(len(customer_ids), len(service_ids))
        )

        # Compute item-item similarity (transpose to get service-service)
        sim_matrix = cosine_similarity(matrix.T)

        # Compute popularity fallback (total bookings per service, top 10)
        svc_totals = matrix.sum(axis=0).A1
        top_services = [service_ids[i] for i in np.argsort(svc_totals)[::-1][:10]]

        return cls(
            similarity_matrix=sim_matrix,
            service_ids=service_ids,
            popularity_fallback=top_services,
        )
