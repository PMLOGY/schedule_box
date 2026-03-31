# Requirements: ScheduleBox v4.0

**Defined:** 2026-03-31
**Core Value:** SMB owners can accept online bookings 24/7 with integrated payments, reducing no-shows and increasing revenue through AI optimization

## v4.0 Requirements

Requirements for 90% documentation coverage. Source: 454-feature audit against schedulebox_complete_documentation.md.

### Push Notifications

- [ ] **PUSH-01**: System can send web push notifications to subscribed browsers
- [ ] **PUSH-02**: User can subscribe/unsubscribe to push notifications in settings
- [ ] **PUSH-03**: Booking confirmation/reminder/cancellation triggers push notification
- [ ] **PUSH-04**: Automation rules can use "send_push" as action type
- [ ] **PUSH-05**: Service worker registered for push notification handling

### Recurring Bookings

- [ ] **RECUR-01**: Admin can create a recurring booking (weekly/biweekly/monthly repeat)
- [ ] **RECUR-02**: Admin can edit a single occurrence without affecting series
- [ ] **RECUR-03**: Admin can edit the entire recurring series
- [ ] **RECUR-04**: Admin can cancel a single occurrence or entire series
- [ ] **RECUR-05**: Recurring bookings respect availability and prevent double-booking

### Memberships & Passes

- [ ] **MEMB-01**: Admin can create membership types (monthly/annual/punch card)
- [ ] **MEMB-02**: Admin can assign a membership to a customer
- [ ] **MEMB-03**: System validates membership at booking time (active, not expired, has punches)
- [ ] **MEMB-04**: Membership status visible on customer detail page

### Waitlist

- [ ] **WAIT-01**: Customer can join waitlist when group class is full
- [ ] **WAIT-02**: System auto-promotes first waitlisted customer when spot opens
- [ ] **WAIT-03**: Customer receives notification when promoted from waitlist

### Industry Verticals UI

- [ ] **VERT-01**: Medical: health records / medical notes editable in customer detail
- [ ] **VERT-02**: Medical: insurance company and birth number form fields in customer detail
- [ ] **VERT-03**: Auto service: vehicle records UI (SPZ, VIN, make, model) in customer detail
- [ ] **VERT-04**: Auto service: per-vehicle service history view
- [ ] **VERT-05**: Cleaning: address field on booking form
- [ ] **VERT-06**: Tutoring: lesson notes / homework field on booking detail
- [ ] **VERT-07**: Industry-specific UI config fully wired (calendar slot size, labels, capacity display)

### OAuth & Calendar Sync

- [ ] **OAUTH-01**: User can login via Google OAuth (full PKCE flow, not 501 stub)
- [ ] **OAUTH-02**: User can login via Facebook OAuth (full flow, not 501 stub)
- [ ] **OAUTH-03**: User can connect Google Calendar in settings
- [ ] **OAUTH-04**: Bookings export to connected Google Calendar as events
- [ ] **OAUTH-05**: External Google Calendar events shown as blocked time in availability

### Admin Features

- [ ] **ADM-01**: Super-admin can send broadcast message to all companies (email + in-app banner)
- [ ] **ADM-02**: Super-admin can toggle maintenance mode (Redis flag, middleware check, branded page)
- [ ] **ADM-03**: Super-admin cohort analysis shows retention by signup month

### Accessibility (WCAG 2.1 AA)

- [ ] **A11Y-01**: All interactive elements have aria-labels
- [ ] **A11Y-02**: Full keyboard navigation works across all pages
- [ ] **A11Y-03**: Focus visible indicators on all focusable elements
- [ ] **A11Y-04**: Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] **A11Y-05**: Skip-to-content link on all pages

### PARTIAL → DONE Fixes

- [ ] **FIX-01**: PDF invoice endpoint generates real PDF (not stubbed)
- [ ] **FIX-02**: Analytics export supports Excel (XLSX) format in addition to CSV
- [ ] **FIX-03**: Notification open/click tracking wired (tracking pixels/links)
- [ ] **FIX-04**: Calendar drag-to-resize wired for duration changes
- [ ] **FIX-05**: Service list supports drag-and-drop reordering
- [ ] **FIX-06**: Onboarding step 6 guides user through test booking
- [ ] **FIX-07**: Cookie consent banner with full category management (analytics, marketing, necessary)
- [ ] **FIX-08**: PII encryption verified working on stored name/email/phone fields
- [ ] **FIX-09**: Marketplace Premium billing integration (upgrade CTA triggers payment)
- [ ] **FIX-10**: Embeddable widget works as Web Component (not just iframe)
- [ ] **FIX-11**: Offline/degraded state banner when server unreachable

### Cron & Data Lifecycle

- [ ] **CRON-01**: GDPR auto-deletion cron anonymizes customer data older than 3 years
- [ ] **CRON-02**: Cron endpoint authenticated with CRON_SECRET

## Out of Scope

| Feature | Reason |
|---------|--------|
| SMS notifications (Twilio) | No Twilio account — push notifications replace SMS |
| AI Voice Booking (Whisper) | Needs audio processing pipeline, defer to v5 |
| Competitor Intelligence | Legal grey area in EU, web scraping infrastructure |
| Photo gallery per service | Needs file storage (S3/R2), separate initiative |
| White-label mobile app | Separate product (~200-400h), not a feature |
| Apple/Google Wallet passes | Needs developer accounts ($99+/yr) |
| Zoom/Meet/Teams video | Needs OAuth app registration per provider |
| Kubernetes/Terraform | Coolify is correct for current scale |
| HashiCorp Vault | .env + Coolify secrets sufficient |
| Prometheus/Grafana | Infrastructure monitoring, separate setup |
| Polish/German languages | Outside CZ/SK market scope for v4.0 |
| Apple OAuth | Needs Apple Developer account ($99/yr) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PUSH-01 | Phase 54 | Pending |
| PUSH-02 | Phase 54 | Pending |
| PUSH-03 | Phase 54 | Pending |
| PUSH-04 | Phase 54 | Pending |
| PUSH-05 | Phase 54 | Pending |
| RECUR-01 | Phase 55 | Pending |
| RECUR-02 | Phase 55 | Pending |
| RECUR-03 | Phase 55 | Pending |
| RECUR-04 | Phase 55 | Pending |
| RECUR-05 | Phase 55 | Pending |
| MEMB-01 | Phase 55 | Pending |
| MEMB-02 | Phase 55 | Pending |
| MEMB-03 | Phase 55 | Pending |
| MEMB-04 | Phase 55 | Pending |
| WAIT-01 | Phase 55 | Pending |
| WAIT-02 | Phase 55 | Pending |
| WAIT-03 | Phase 55 | Pending |
| VERT-01 | Phase 56 | Pending |
| VERT-02 | Phase 56 | Pending |
| VERT-03 | Phase 56 | Pending |
| VERT-04 | Phase 56 | Pending |
| VERT-05 | Phase 56 | Pending |
| VERT-06 | Phase 56 | Pending |
| VERT-07 | Phase 56 | Pending |
| FIX-01 | Phase 57 | Pending |
| FIX-02 | Phase 57 | Pending |
| FIX-03 | Phase 57 | Pending |
| FIX-04 | Phase 57 | Pending |
| FIX-05 | Phase 57 | Pending |
| FIX-06 | Phase 57 | Pending |
| FIX-07 | Phase 57 | Pending |
| FIX-08 | Phase 57 | Pending |
| FIX-09 | Phase 57 | Pending |
| FIX-10 | Phase 57 | Pending |
| FIX-11 | Phase 57 | Pending |
| A11Y-01 | Phase 57 | Pending |
| A11Y-02 | Phase 57 | Pending |
| A11Y-03 | Phase 57 | Pending |
| A11Y-04 | Phase 57 | Pending |
| A11Y-05 | Phase 57 | Pending |
| ADM-01 | Phase 58 | Pending |
| ADM-02 | Phase 58 | Pending |
| ADM-03 | Phase 58 | Pending |
| CRON-01 | Phase 58 | Pending |
| CRON-02 | Phase 58 | Pending |
| OAUTH-01 | Phase 59 | Pending |
| OAUTH-02 | Phase 59 | Pending |
| OAUTH-03 | Phase 59 | Pending |
| OAUTH-04 | Phase 59 | Pending |
| OAUTH-05 | Phase 59 | Pending |

**Coverage:**

- v4.0 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0

---

_Requirements defined: 2026-03-31_
_Last updated: 2026-03-31 after v4.0 roadmap creation_
