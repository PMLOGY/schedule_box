---
phase: 46
slug: security-hardening
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                     |
| ---------------------- | ----------------------------------------- |
| **Framework**          | Vitest (existing)                         |
| **Config file**        | `vitest.config.ts` (root)                 |
| **Quick run command**  | `pnpm vitest run --reporter=verbose`      |
| **Full suite command** | `pnpm test:coverage`                      |
| **Estimated runtime**  | ~30 seconds                               |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Test Type  | Automated Command                                  | File Exists | Status     |
| --------- | ---- | ---- | ----------- | ---------- | -------------------------------------------------- | ----------- | ---------- |
| 46-01-01  | 01   | 1    | SEC-02      | unit       | `pnpm vitest run lib/security/sanitize.test.ts`    | Created in task (TDD) | ⬜ pending |
| 46-01-02  | 01   | 1    | SEC-02      | unit       | `pnpm vitest run lib/security/sanitize.test.ts`    | Created in task (TDD) | ⬜ pending |
| 46-02-01  | 02   | 1    | SEC-01      | smoke      | `cd apps/web && pnpm build 2>&1; echo "Exit: $?"`  | Manual only | ⬜ pending |
| 46-02-02  | 02   | 1    | SEC-06,07   | smoke      | `cd apps/web && pnpm build 2>&1; echo "Exit: $?"`  | Manual only | ⬜ pending |
| 46-03-01  | 03   | 1    | SEC-03      | unit       | `pnpm vitest run lib/security/encryption.test.ts`  | Created in task (TDD) | ⬜ pending |
| 46-03-02  | 03   | 1    | SEC-03      | unit       | `pnpm vitest run lib/security/encryption.test.ts`  | Created in task (TDD) | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

All test files are created within their respective TDD tasks — no separate Wave 0 scaffolding needed:
- [x] `apps/web/lib/security/encryption.test.ts` — created in 46-03-01 (TDD task)
- [x] `apps/web/lib/security/sanitize.test.ts` — created in 46-01-01 (TDD task)
- [x] `apps/web/lib/auth/hibp.test.ts` — created in 46-01-01 (TDD task)
- [x] `apps/web/lib/security/ssrf.test.ts` — created in 46-01-01 (TDD task)

---

## Manual-Only Verifications

| Behavior                             | Requirement | Why Manual                         | Test Instructions                                                   |
| ------------------------------------ | ----------- | ---------------------------------- | ------------------------------------------------------------------- |
| Sentry captures runtime errors       | SEC-01      | Requires deployed env with DSN     | Trigger error in production, verify in Sentry dashboard             |
| Cookie policy page renders           | SEC-07      | Static page, build check sufficient | Navigate to `/cs/cookie-policy` and `/en/cookie-policy` in browser  |
| CSRF audit — webhook routes excluded | SEC-06      | Code review, not unit testable     | Grep for webhook routes, verify no auth requirement on inbound hooks |

_All other phase behaviors have automated verification._

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are created within TDD tasks
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covered by TDD task creation
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
