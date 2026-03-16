---
phase: 45
slug: infrastructure-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                               |
| ---------------------- | --------------------------------------------------- |
| **Framework**          | vitest + manual verification (infrastructure phase) |
| **Config file**        | vitest.config.ts                                    |
| **Quick run command**  | `pnpm test`                                         |
| **Full suite command** | `pnpm test && curl -s http://localhost:3000/api/health` |
| **Estimated runtime**  | ~30 seconds                                         |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green + Vercel deployment accessible
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status     |
| --------- | ---- | ---- | ----------- | --------- | ----------------- | ----------- | ---------- |
| 45-01-01 | 01   | 1    | INFRA-01    | build     | `pnpm build`       | ✅          | ⬜ pending |
| 45-01-02 | 01   | 1    | INFRA-05    | check     | `grep '"next"' apps/web/package.json` | ✅ | ⬜ pending |
| 45-01-03 | 01   | 1    | FIX-01      | manual    | Check billing page UI | N/A       | ⬜ pending |
| 45-02-01 | 02   | 2    | INFRA-02    | build     | `pnpm build`       | ✅          | ⬜ pending |
| 45-02-02 | 02   | 2    | INFRA-03    | build     | `pnpm build`       | ✅          | ⬜ pending |
| 45-03-01 | 03   | 3    | INFRA-04    | manual    | `curl -s https://schedulebox.vercel.app/api/health` | N/A | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework setup needed.

---

## Manual-Only Verifications

| Behavior   | Requirement | Why Manual | Test Instructions |
| ---------- | ----------- | ---------- | ----------------- |
| Vercel deploy accessible | INFRA-04 | Requires live Vercel deployment | Push to main, verify schedulebox.vercel.app loads |
| AI-Powered plan shows unlimited | FIX-01 | UI rendering check | Log in as owner, go to Settings > Billing, verify AI-Powered shows "Unlimited" |
| No RabbitMQ errors in logs | INFRA-01 | Runtime log inspection | Check Vercel function logs for amqp/RabbitMQ errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
