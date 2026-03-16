---
phase: 47
slug: notifications-super-admin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                |
| ---------------------- | ------------------------------------ |
| **Framework**          | vitest + manual verification         |
| **Config file**        | vitest.config.ts                     |
| **Quick run command**  | `pnpm test`                          |
| **Full suite command** | `pnpm test && pnpm build`           |
| **Estimated runtime**  | ~45 seconds                          |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status     |
| --------- | ---- | ---- | ----------- | --------- | ----------------- | ----------- | ---------- |
| 47-01-01 | 01   | 1    | NOTIF-01..04 | build    | `pnpm build`       | ✅          | ⬜ pending |
| 47-02-01 | 02   | 1    | ADMIN-01    | build     | `pnpm build`       | ✅          | ⬜ pending |
| 47-02-02 | 02   | 1    | ADMIN-07    | build     | `pnpm build`       | ✅          | ⬜ pending |
| 47-03-01 | 03   | 2    | ADMIN-02..05 | build   | `pnpm build`       | ✅          | ⬜ pending |
| 47-04-01 | 04   | 2    | ADMIN-06    | build     | `pnpm build`       | ✅          | ⬜ pending |
| 47-04-02 | 04   | 2    | ADMIN-03..04 | build   | `pnpm build`       | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
| -------- | ----------- | ---------- | ----------------- |
| Email actually delivered | NOTIF-01 | Requires SMTP credentials + real email | Create booking, check inbox |
| SMS delivered | NOTIF-02 | Requires Twilio + real phone | Trigger cron, check phone |
| Impersonation red banner | ADMIN-01 | Visual UI check | Impersonate user, verify banner |
| Maintenance page shows | ADMIN-05 | Visual + middleware | Enable maintenance, visit app |
| Broadcast banner shows | ADMIN-04 | Visual + timing | Create broadcast, check dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
