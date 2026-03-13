# Requirements: ScheduleBox v2.0

**Defined:** 2026-03-13
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

## v2.0 Requirements

Requirements for making the app fully functional across all 4 user views and production-ready.

### Authentication & Session

- [x] **AUTH-01**: User session persists across browser refresh without random logouts
- [x] **AUTH-02**: Token refresh works silently — no mid-session expiration
- [x] **AUTH-03**: Each role routes to correct view after login (admin→admin panel, owner→dashboard, employee→dashboard, customer→portal)
- [x] **AUTH-04**: Owner can create employee accounts with credentials/invite

### Business Owner

- [x] **OWNER-01**: Owner can see and copy their public booking URL from the dashboard
- [x] **OWNER-02**: Service CRUD fully functional — create, edit, delete services with all fields persisting
- [x] **OWNER-03**: Employee CRUD fully functional — create, edit, deactivate employees with service assignments
- [x] **OWNER-04**: Incoming bookings visible with confirm, cancel, complete, no-show actions working
- [x] **OWNER-05**: Calendar displays real bookings with correct times and employee assignments
- [x] **OWNER-06**: All dashboard pages load real data — settings, payments, customers, reviews, loyalty, analytics

### Employee

- [x] **EMP-01**: Employee can set weekly working hours (per-day start/end times)
- [x] **EMP-02**: Employee can request days off with reason
- [x] **EMP-03**: Employee sees only their assigned bookings
- [x] **EMP-04**: Employee can confirm, complete, or mark no-show on their bookings

### End Customer (Public Booking)

- [x] **CUST-01**: Public booking wizard works end-to-end — select service → pick slot → enter details → booking created
- [x] **CUST-02**: Booking confirmation shows booking ID and status, trackable via URL
- [x] **CUST-03**: Customer can leave a review after completed booking
- [x] **CUST-04**: Loyalty points accumulate for returning customers and discounts apply

### Admin (Platform)

- [x] **ADMIN-01**: Admin dashboard shows real platform-wide stats (total companies, users, bookings, revenue)
- [x] **ADMIN-02**: Admin can view, activate, and deactivate company accounts
- [x] **ADMIN-03**: Admin can view and manage all users across companies

### Production Deployment

- [x] **DEPLOY-01**: Production Docker Compose with Next.js, PostgreSQL, Redis, and proper environment config
- [x] **DEPLOY-02**: Production build succeeds with no errors
- [x] **DEPLOY-03**: Environment variable configuration documented and validated on startup

## Future Requirements

### Customer Portal (Deferred)

- **PORTAL-01**: Customer can create account to view booking history across businesses
- **PORTAL-02**: Customer can manage profile and notification preferences

### Advanced Admin (Deferred)

- **ADMN-01**: Admin can create companies directly
- **ADMN-02**: Admin analytics deep-dive with charts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Customer accounts for booking | Public booking works without auth — simpler for users |
| CI/CD pipeline setup | Deployment config only, CI/CD is a separate concern |
| Kubernetes/Helm deployment | Docker Compose on VPS is the target |
| New feature development | This milestone is about making existing features work |
| Mobile native app | Web-first, PWA sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 39 | Complete |
| AUTH-02 | Phase 39 | Complete |
| AUTH-03 | Phase 39 | Complete |
| AUTH-04 | Phase 39 | Complete |
| OWNER-01 | Phase 40 | Complete |
| OWNER-02 | Phase 40 | Complete |
| OWNER-03 | Phase 40 | Complete |
| OWNER-04 | Phase 40 | Complete |
| OWNER-05 | Phase 40 | Complete |
| OWNER-06 | Phase 40 | Complete |
| EMP-01 | Phase 41 | Complete |
| EMP-02 | Phase 41 | Complete |
| EMP-03 | Phase 41 | Complete |
| EMP-04 | Phase 41 | Complete |
| CUST-01 | Phase 42 | Complete |
| CUST-02 | Phase 42 | Complete |
| CUST-03 | Phase 42 | Complete |
| CUST-04 | Phase 42 | Complete |
| ADMIN-01 | Phase 43 | Complete |
| ADMIN-02 | Phase 43 | Complete |
| ADMIN-03 | Phase 43 | Complete |
| DEPLOY-01 | Phase 44 | Complete |
| DEPLOY-02 | Phase 44 | Complete |
| DEPLOY-03 | Phase 44 | Complete |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 — Phase mapping complete (roadmap created)*
