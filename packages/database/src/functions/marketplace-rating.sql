-- Update marketplace listing rating after review change
-- Recalculates: average_rating, review_count based on published reviews

CREATE OR REPLACE FUNCTION update_marketplace_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE marketplace_listings SET
        average_rating = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE company_id = COALESCE(NEW.company_id, OLD.company_id) AND is_published = TRUE), 0),
        review_count = (SELECT COUNT(*) FROM reviews WHERE company_id = COALESCE(NEW.company_id, OLD.company_id) AND is_published = TRUE)
    WHERE company_id = COALESCE(NEW.company_id, OLD.company_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Idempotent: drop before create
DROP TRIGGER IF EXISTS trg_review_marketplace_rating ON reviews;
CREATE TRIGGER trg_review_marketplace_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_marketplace_rating();
