---
phase: 46
slug: security-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 46-01-01  | 01   | 1    | SEC-01      | smoke      | Verify Sentry DSN env + build succeeds             | Manual only | ⬜ pending |
| 46-02-01  | 02   | 1    | SEC-02      | unit       | `pnpm vitest run lib/security/sanitize.test.ts`    | ❌ W0       | ⬜ pending |
| 46-02-02  | 02   | 1    | SEC-02      | unit       | `pnpm vitest run lib/security/sanitize.test.ts`    | ❌ W0       | ⬜ pending |
| 46-03-01  | 03   | 2    | SEC-03      | unit       | `pnpm vitest run lib/security/encryption.test.ts`  | ❌ W0       | ⬜ pending |
| 46-03-02  | 03   | 2    | SEC-03      | unit       | `pnpm vitest run lib/security/encryption.test.ts`  | ❌ W0       | ⬜ pending |
| 46-04-01  | 04   | 1    | SEC-04      | unit+mock  | `pnpm vitest run lib/auth/hibp.test.ts`            | ❌ W0       | ⬜ pending |
| 46-04-02  | 04   | 1    | SEC-04      | unit+mock  | `pnpm vitest run lib/auth/hibp.test.ts`            | ❌ W0       | ⬜ pending |
| 46-05-01  | 05   | 1    | SEC-05      | unit       | `pnpm vitest run lib/security/ssrf.test.ts`        | ❌ W0       | ⬜ pending |
| 46-06-01  | 06   | 1    | SEC-06      | audit      | Manual code review                                 | N/A         | ⬜ pending |
| 46-07-01  | 07   | 1    | SEC-07      | smoke      | `pnpm vitest run` (build check)                    | Manual only | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/web/lib/security/encryption.test.ts` — stubs for SEC-03 round-trip + determinism
- [ ] `apps/web/lib/security/sanitize.test.ts` — stubs for SEC-02 XSS stripping
- [ ] `apps/web/lib/auth/hibp.test.ts` — stubs for SEC-04 breach detection + fail-open
- [ ] `apps/web/lib/security/ssrf.test.ts` — stubs for SEC-05 private IP blocking

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
