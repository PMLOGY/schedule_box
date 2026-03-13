# Requirements: ScheduleBox v2.0

**Defined:** 2026-03-13
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

## v2.0 Requirements

Requirements for making the app fully functional across all 4 user views and production-ready.

### Authentication & Session

- [ ] **AUTH-01**: User session persists across browser refresh without random logouts
- [ ] **AUTH-02**: Token refresh works silently — no mid-session expiration
- [ ] **AUTH-03**: Each role routes to correct view after login (admin→admin panel, owner→dashboard, employee→dashboard, customer→portal)
- [ ] **AUTH-04**: Owner can create employee accounts with credentials/invite

### Business Owner

- [ ] **OWNER-01**: Owner can see and copy their public booking URL from the dashboard
- [ ] **OWNER-02**: Service CRUD fully functional — create, edit, delete services with all fields persisting
- [ ] **OWNER-03**: Employee CRUD fully functional — create, edit, deactivate employees with service assignments
- [ ] **OWNER-04**: Incoming bookings visible with confirm, cancel, complete, no-show actions working
- [ ] **OWNER-05**: Calendar displays real bookings with correct times and employee assignments
- [ ] **OWNER-06**: All dashboard pages load real data — settings, payments, customers, reviews, loyalty, analytics

### Employee

- [ ] **EMP-01**: Employee can set weekly working hours (per-day start/end times)
- [ ] **EMP-02**: Employee can request days off with reason
- [ ] **EMP-03**: Employee sees only their assigned bookings
- [ ] **EMP-04**: Employee can confirm, complete, or mark no-show on their bookings

### End Customer (Public Booking)

- [ ] **CUST-01**: Public booking wizard works end-to-end — select service → pick slot → enter details → booking created
- [ ] **CUST-02**: Booking confirmation shows booking ID and status, trackable via URL
- [ ] **CUST-03**: Customer can leave a review after completed booking
- [ ] **CUST-04**: Loyalty points accumulate for returning customers and discounts apply

### Admin (Platform)

- [ ] **ADMIN-01**: Admin dashboard shows real platform-wide stats (total companies, users, bookings, revenue)
- [ ] **ADMIN-02**: Admin can view, activate, and deactivate company accounts
- [ ] **ADMIN-03**: Admin can view and manage all users across companies

### Production Deployment

- [ ] **DEPLOY-01**: Production Docker Compose with Next.js, PostgreSQL, Redis, and proper environment config
- [ ] **DEPLOY-02**: Production build succeeds with no errors
- [ ] **DEPLOY-03**: Environment variable configuration documented and validated on startup

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
| AUTH-01 | Phase 39 | Pending |
| AUTH-02 | Phase 39 | Pending |
| AUTH-03 | Phase 39 | Pending |
| AUTH-04 | Phase 39 | Pending |
| OWNER-01 | Phase 40 | Pending |
| OWNER-02 | Phase 40 | Pending |
| OWNER-03 | Phase 40 | Pending |
| OWNER-04 | Phase 40 | Pending |
| OWNER-05 | Phase 40 | Pending |
| OWNER-06 | Phase 40 | Pending |
| EMP-01 | Phase 41 | Pending |
| EMP-02 | Phase 41 | Pending |
| EMP-03 | Phase 41 | Pending |
| EMP-04 | Phase 41 | Pending |
| CUST-01 | Phase 42 | Pending |
| CUST-02 | Phase 42 | Pending |
| CUST-03 | Phase 42 | Pending |
| CUST-04 | Phase 42 | Pending |
| ADMIN-01 | Phase 43 | Pending |
| ADMIN-02 | Phase 43 | Pending |
| ADMIN-03 | Phase 43 | Pending |
| DEPLOY-01 | Phase 44 | Pending |
| DEPLOY-02 | Phase 44 | Pending |
| DEPLOY-03 | Phase 44 | Pending |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 — Phase mapping complete (roadmap created)*
