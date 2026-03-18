---
phase: 50
slug: testing-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                               |
| ---------------------- | --------------------------------------------------- |
| **Framework**          | Vitest 4.x + Playwright + Testcontainers            |
| **Config file**        | `vitest.config.ts`, `apps/web/e2e/playwright.config.ts`, `vitest.integration.config.ts` |
| **Quick run command**  | `pnpm test`                                         |
| **Full suite command** | `pnpm test:coverage && pnpm test:integration`       |
| **Estimated runtime**  | ~60 seconds (unit), ~120 seconds (integration CI)   |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Test Type    | Automated Command                  | File Exists | Status     |
| --------- | ---- | ---- | ----------- | ------------ | ---------------------------------- | ----------- | ---------- |
| 50-01-01  | 01   | 1    | TEST-01     | unit         | `pnpm test:coverage`               | ❌ W0       | ⬜ pending |
| 50-01-02  | 01   | 1    | TEST-01     | unit         | `pnpm test:coverage`               | ❌ W0       | ⬜ pending |
| 50-02-01  | 02   | 1    | TEST-02     | e2e          | `pnpm --filter web test:e2e`       | ✅ partial  | ⬜ pending |
| 50-02-02  | 02   | 1    | TEST-03     | integration  | `pnpm test:integration`            | ✅ partial  | ⬜ pending |
| 50-03-01  | 03   | 2    | TEST-04     | manual       | `pnpm storybook`                   | ❌ W0       | ⬜ pending |
| 50-04-01  | 04   | 2    | HARD-01     | integration  | `pnpm test:integration`            | ❌ W0       | ⬜ pending |
| 50-04-02  | 04   | 2    | HARD-02     | integration  | `pnpm test:integration`            | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] Test stub files for booking-service, payment saga, availability engine, transitions
- [ ] Mock helpers for Drizzle transaction pattern (`dbTx.transaction` callback invocation)
- [ ] Admin auth setup for Playwright (`admin.setup.ts`)
- [ ] Storybook 8 + @storybook/nextjs installation and config

_Existing infrastructure covers Vitest, Playwright, Testcontainers — only additions needed._

---

## Manual-Only Verifications

| Behavior                        | Requirement | Why Manual             | Test Instructions                              |
| ------------------------------- | ----------- | ---------------------- | ---------------------------------------------- |
| Storybook visual rendering      | TEST-04     | Visual inspection      | Run `pnpm storybook`, verify glass variants    |
| DB partition explain plan       | HARD-01     | Query plan inspection  | Run EXPLAIN on partitioned query, verify prune |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
