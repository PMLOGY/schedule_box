# Requirements: ScheduleBox v3.1

**Defined:** 2026-03-18
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

## v3.1 Requirements

Requirements for go-live and first revenue. Each maps to roadmap phases.
Source: v3.0 completion review + production readiness assessment.

### Per-Company Payments

- [x] **PAY-01**: Business owner can enter their Comgate merchant credentials in Settings > Payments
- [x] **PAY-02**: Customer booking payments route through the business's Comgate account (not platform account)
- [x] **PAY-03**: Payment provider config stored in provider-agnostic DB schema (payment_providers table, ready for future Stripe)
- [x] **PAY-04**: Platform subscription billing still uses platform Comgate account (separation verified)

### Verification

- [x] **VER-01**: Dev server boots with zero errors on Vercel-compatible config (Neon + Upstash)
- [x] **VER-02**: Full sign-up → onboarding → create service → create employee flow works end-to-end
- [ ] **VER-03**: Customer booking flow works: select service → pick slot → enter info → pay → confirmation
- [ ] **VER-04**: Admin panel verified: impersonation, feature flags, suspend, broadcast, metrics, audit log
- [ ] **VER-05**: Marketplace search, firm detail page, and "Book Now" link work end-to-end
- [ ] **VER-06**: Email notifications send correctly (booking confirmation, status change, reminders)
- [ ] **VER-07**: Playwright E2E suite passes green (all 7 specs + new per-company payment spec)
- [ ] **VER-08**: All v3.0 bugs found during manual testing are fixed

### Deployment

- [ ] **DEP-01**: App deployed to Vercel with production environment variables
- [ ] **DEP-02**: Custom domain configured with SSL (when domain provided)
- [ ] **DEP-03**: Neon production database seeded with demo company for showcase
- [ ] **DEP-04**: Comgate recurring subscription billing verified working on production

## Future Requirements (v3.2+)

### Payment Providers
- **PAY-05**: Stripe Connect integration as alternative payment provider
- **PAY-06**: Per-company Stripe onboarding flow with OAuth

### Mobile
- **MOB-01**: White-label React Native mobile app for companies
- **MOB-02**: App Store / Play Store CI/CD pipeline

### Enterprise
- **ENT-01**: Microservices decomposition (when scale requires)
- **ENT-02**: API Gateway (Kong/Traefik)
- **ENT-03**: S3/R2 file storage for photos and avatars
- **ENT-04**: ClamAV file scanning

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe integration | v3.1 is Comgate-only; DB design supports future Stripe |
| React Native mobile app | 200+ hours, separate milestone |
| Microservices migration | Monolith correct for <500 companies |
| File upload/storage | No active upload feature |
| WebSocket real-time | 30s polling sufficient for Vercel serverless |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAY-01 | Phase 51 | Complete |
| PAY-02 | Phase 51 | Complete |
| PAY-03 | Phase 51 | Complete |
| PAY-04 | Phase 51 | Complete |
| VER-01 | Phase 52 | Complete |
| VER-02 | Phase 52 | Complete |
| VER-03 | Phase 52 | Pending |
| VER-04 | Phase 52 | Pending |
| VER-05 | Phase 52 | Pending |
| VER-06 | Phase 52 | Pending |
| VER-07 | Phase 53 | Pending |
| VER-08 | Phase 52 | Pending |
| DEP-01 | Phase 53 | Pending |
| DEP-02 | Phase 53 | Pending |
| DEP-03 | Phase 53 | Pending |
| DEP-04 | Phase 53 | Pending |

**Coverage:**

- v3.1 requirements: 16 total
- Mapped to phases: 16 (100%)
- Unmapped: 0

---

_Requirements defined: 2026-03-18_
_Last updated: 2026-03-18 after v3.1 roadmap created_
