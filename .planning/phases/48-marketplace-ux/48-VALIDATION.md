---
phase: 48
slug: marketplace-ux
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                          |
| ---------------------- | ---------------------------------------------- |
| **Framework**          | vitest 3.x                                     |
| **Config file**        | apps/web/vitest.config.ts                      |
| **Quick run command**  | `pnpm --filter @schedulebox/web test -- --run` |
| **Full suite command** | `pnpm --filter @schedulebox/web test -- --run` |
| **Estimated runtime**  | ~30 seconds                                    |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @schedulebox/web test -- --run`
- **After every plan wave:** Run `pnpm --filter @schedulebox/web test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type  | Automated Command                              | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------- | ---------------------------------------------- | ----------- | ---------- |
| 48-01-01 | 01   | 1    | MKT-01      | api+unit   | `pnpm --filter @schedulebox/web test -- --run` | ❌ W0       | ⬜ pending |
| 48-01-02 | 01   | 1    | MKT-02      | api+unit   | `pnpm --filter @schedulebox/web test -- --run` | ❌ W0       | ⬜ pending |
| 48-02-01 | 02   | 1    | MKT-03      | manual     | N/A                                            | N/A         | ⬜ pending |
| 48-02-02 | 02   | 1    | MKT-04      | manual     | N/A                                            | N/A         | ⬜ pending |
| 48-03-01 | 03   | 2    | UX-01       | manual     | N/A                                            | N/A         | ⬜ pending |
| 48-03-02 | 03   | 2    | UX-02       | manual     | N/A                                            | N/A         | ⬜ pending |
| 48-04-01 | 04   | 2    | UX-03       | api+unit   | `pnpm --filter @schedulebox/web test -- --run` | ❌ W0       | ⬜ pending |
| 48-04-02 | 04   | 2    | UX-04       | manual     | N/A                                            | N/A         | ⬜ pending |
| 48-05-01 | 05   | 2    | UX-05       | api+unit   | `pnpm --filter @schedulebox/web test -- --run` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. Vitest already configured.

_If none: "Existing infrastructure covers all phase requirements."_

---

## Manual-Only Verifications

| Behavior                          | Requirement | Why Manual                           | Test Instructions                                                         |
| --------------------------------- | ----------- | ------------------------------------ | ------------------------------------------------------------------------- |
| Marketplace search/filter UI      | MKT-01      | Browser interaction required         | Navigate to /marketplace, type search, verify filter results              |
| Geolocation radius filter         | MKT-02      | Requires GPS/address input           | Enter address, set 10km radius, verify distance-sorted results            |
| Firm detail page layout           | MKT-03      | Visual layout verification           | Click listing, verify description/photos/reviews/map/Book Now button      |
| Featured badge/section            | MKT-04      | Visual verification                  | Check AI-Powered tier businesses show featured badge                      |
| Booking detail modal              | UX-01       | Interactive UI component             | Click booking row, verify modal opens with actions                        |
| Auto-refresh indicator            | UX-02       | Timed behavior                       | Wait 30s, verify "Last updated" counter and new bookings appear           |
| Video meeting link management     | UX-04       | Settings page interaction            | Navigate to video settings, add/edit meeting link                         |

_If none: "All phase behaviors have automated verification."_

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
