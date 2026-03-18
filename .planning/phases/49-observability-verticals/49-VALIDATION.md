---
phase: 49
slug: observability-verticals
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 49 — Validation Strategy

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

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command                              | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ---------------------------------------------- | ----------- | ---------- |
| 49-01-01 | 01   | 1    | OBS-01      | manual    | `npx tsc --noEmit`                             | N/A         | ⬜ pending |
| 49-01-02 | 01   | 1    | OBS-02      | api+unit  | `npx tsc --noEmit`                             | N/A         | ⬜ pending |
| 49-02-01 | 02   | 1    | VERT-01     | api+unit  | `npx tsc --noEmit`                             | N/A         | ⬜ pending |
| 49-02-02 | 02   | 1    | VERT-02     | manual    | N/A                                            | N/A         | ⬜ pending |
| 49-03-01 | 03   | 2    | VERT-03     | manual    | N/A                                            | N/A         | ⬜ pending |
| 49-03-02 | 03   | 2    | VERT-04     | manual    | N/A                                            | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. Vitest already configured.

---

## Manual-Only Verifications

| Behavior                          | Requirement | Why Manual                              | Test Instructions                                                         |
| --------------------------------- | ----------- | --------------------------------------- | ------------------------------------------------------------------------- |
| Traces in Vercel dashboard        | OBS-01      | Requires deployed Vercel environment    | Deploy, trigger API calls, check Vercel observability for traces           |
| Medical vertical booking fields   | VERT-01     | UI interaction + visual verification    | Set company to medical, open booking form, verify birth_number field       |
| Automotive vertical booking fields| VERT-02     | UI interaction + visual verification    | Set company to automotive, open booking form, verify license_plate field   |
| Industry label changes            | VERT-03     | Visual verification across locales      | Switch company industry, verify "Patient"/"Vehicle" labels appear          |
| AI config per industry            | VERT-04     | Requires AI service interaction         | Set industry config, verify AI prompts use industry-specific terminology   |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
