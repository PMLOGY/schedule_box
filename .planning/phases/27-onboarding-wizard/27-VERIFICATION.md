---
phase: 27-onboarding-wizard
verified: 2026-02-24T16:13:46Z
status: human_needed
score: 12/12 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/12
  gaps_closed:
    - Dashboard page imports useOnboardingRedirect, calls router.replace when shouldRedirect=true, renders welcome banner card when onboarding_completed=false
    - OnboardingChecklist returns null when companySettings?.onboarding_completed === false (guard at line 51)
  gaps_remaining: []
  regressions: []
human_verification:
  - test: 5-minute end-to-end wizard flow
    expected: New user visits /dashboard, gets redirected to /onboarding, completes 4 steps, sees live booking URL at step 4, Complete setup redirects to /dashboard
    why_human: Redirect behavior depends on runtime auth state and browser navigation
  - test: Welcome banner on fresh account
    expected: Dashboard shows welcome banner with Vitejte v ScheduleBox heading and Spustit pruvodce CTA linking to /onboarding; OnboardingChecklist does not render
    why_human: Requires auth session with onboarding_completed=false in DB; visual inspection required
  - test: Driver.js tour triggers once after onboarding
    expected: First dashboard visit after completing wizard shows 3-step tooltip tour; second visit does not
    why_human: localStorage and timing behavior require a live browser session
  - test: QR code renders and is downloadable
    expected: Step 4 shows 200x200px QR code encoding the booking URL; Download QR code button saves a PNG
    why_human: qrcode.toDataURL() runs client-side only
---
# Phase 27: Onboarding Wizard Verification Report

**Phase Goal:** New business owner goes from registration to sharing their live booking link in under 5 minutes, with guided setup and helpful empty states throughout
**Verified:** 2026-02-24T16:13:46Z
**Status:** human_needed
**Re-verification:** Yes -- after gap closure plan 27-05

---

## Re-verification Summary

Previous status was gaps_found (9/12, verified 2026-02-24T15:39:18Z).

Plan 27-05 executed 3 commits:
- 53de124 -- feat(frontend): wire useOnboardingRedirect and welcome banner into dashboard page
- ad8f858 -- feat(frontend): add onboarding_completed guard to OnboardingChecklist
- f82c31b -- fix(frontend): add onboarding_completed and industry_type to CompanySettings type

All 3 commits confirmed in git log. Both gaps are now closed. All 12 must-haves verified. No regressions.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 4-step wizard completion under 5 minutes | VERIFIED | All 4 step components exist with react-hook-form + API calls. SetupWizard orchestrator wires them. Regression: all step files confirmed present. |
| 2 | Final step shows live booking URL + QR code with copy-to-clipboard | VERIFIED | share-link-step.tsx: QRCode.toDataURL(), copy button, download QR. |
| 3 | Wizard uses existing APIs (company, services, working-hours) | VERIFIED | All 3 steps call respective endpoints. Regression: no change to step files. |
| 4 | onboarding_completed flag set to true on wizard completion | VERIFIED | share-link-step.tsx line 75: onboarding_completed: true in PUT body. |
| 5 | Unauthenticated users blocked from onboarding route | VERIFIED | onboarding/layout.tsx: AuthGuard wraps content at lines 5 and 19. |
| 6 | Dashboard shows checklist widget tracking 5 setup items | VERIFIED | useOnboardingChecklist wired at lines 11 and 19. OnboardingChecklist rendered in dashboard page at line 54. |
| 7 | Checklist dismissible when all 5 items complete | VERIFIED | Dismiss button gated by isAllComplete (line 58). Guard at line 51 now correctly hides checklist until onboarding_completed=true. Both conditions satisfied. |
| 8 | Every blank table/list shows action-oriented empty state | VERIFIED | All 6 empty state components confirmed: analytics-empty.tsx, bookings-empty.tsx, calendar-empty.tsx, customers-empty.tsx, employees-empty.tsx, services-empty.tsx. |
| 9 | Dashboard shows welcome banner + redirects to /onboarding when wizard not done | VERIFIED | dashboard/page.tsx imports useOnboardingRedirect (line 12), calls router.replace in useEffect (lines 23-27), renders welcome banner card with all 3 i18n keys when shouldRedirect=true (lines 33-47). Hook returns shouldRedirect=true when onboarding_completed=false (use-onboarding.ts lines 32-33). |
| 10 | Demo data seeds Beauty Studio Praha clearly labeled + removable | VERIFIED | demo-data-seeder.ts: seedDemoData (line 50) + removeDemoData (line 339). DemoDataCard rendered in dashboard. |
| 11 | Driver.js tooltips appear on first dashboard visit + never repeat | VERIFIED | DashboardTour imported and rendered in dashboard layout (lines 6 and 26). |
| 12 | 8 industry templates with Czech names + CZK pricing | VERIFIED | 8 industryType values confirmed in industry-templates.ts (lines 71, 165, 241, 317, 393, 469, 551, 618). |

**Score: 12/12 truths verified**

---

## Required Artifacts

### Plan 27-01

| Artifact | Status | Details |
|----------|--------|---------|
| apps/web/stores/onboarding-wizard.store.ts | VERIFIED | Exists, not modified by 27-05. |
| apps/web/app/[locale]/(dashboard)/onboarding/page.tsx | VERIFIED | Exists, not modified by 27-05. |
| apps/web/app/[locale]/(dashboard)/onboarding/layout.tsx | VERIFIED | AuthGuard at lines 1, 5, 19. Not modified by 27-05. |
| apps/web/components/onboarding/setup-wizard.tsx | VERIFIED | Exists, not modified by 27-05. |
| apps/web/components/onboarding/steps/company-details-step.tsx | VERIFIED | Exists, not modified by 27-05. |
| apps/web/components/onboarding/steps/first-service-step.tsx | VERIFIED | Exists, not modified by 27-05. |
| apps/web/components/onboarding/steps/working-hours-step.tsx | VERIFIED | Exists, not modified by 27-05. |
| apps/web/components/onboarding/steps/share-link-step.tsx | VERIFIED | onboarding_completed: true at line 75. Not modified by 27-05. |
| apps/web/validations/onboarding.ts | VERIFIED | Exists, not modified by 27-05. |
| apps/web/validations/settings.ts | VERIFIED | Exists, not modified by 27-05. |
| apps/web/app/api/v1/settings/company/route.ts | VERIFIED | Exists, not modified by 27-05. |

### Plan 27-02

| Artifact | Status | Details |
|----------|--------|---------|
| apps/web/hooks/use-onboarding-checklist.ts | VERIFIED | Not modified by 27-05. |
| apps/web/components/onboarding/onboarding-checklist.tsx | VERIFIED | Guard at line 51: if (companySettings?.onboarding_completed === false) return null; -- commit ad8f858. |
| apps/web/hooks/use-onboarding.ts | VERIFIED | Now imported by dashboard page at line 12. Fully wired -- commit 53de124. |
| apps/web/app/[locale]/(dashboard)/page.tsx | VERIFIED | Imports useOnboardingRedirect (line 12), router.replace in useEffect (line 25), welcome banner JSX (lines 33-47), all 3 i18n keys rendered -- commit 53de124. |
| apps/web/components/onboarding/empty-states/ (all 6) | VERIFIED | All 6 files confirmed present. Not modified by 27-05. |

### Plan 27-03

| Artifact | Status | Details |
|----------|--------|---------|
| apps/web/lib/onboarding/demo-data-seeder.ts | VERIFIED | Exists, not modified by 27-05. |
| apps/web/app/api/v1/onboarding/demo-data/route.ts | VERIFIED | Exists, not modified by 27-05. |
| apps/web/components/onboarding/demo-data-card.tsx | VERIFIED | Exists, not modified by 27-05. |
| apps/web/components/onboarding/driver-tour.tsx | VERIFIED | DashboardTour in layout confirmed. Not modified by 27-05. |

### Plan 27-04

| Artifact | Status | Details |
|----------|--------|---------|
| apps/web/lib/onboarding/industry-templates.ts | VERIFIED | 8 templates confirmed. Not modified by 27-05. |
| apps/web/app/api/v1/onboarding/apply-template/route.ts | VERIFIED | Exists, not modified by 27-05. |
| apps/web/components/onboarding/industry-template-picker.tsx | VERIFIED | Exists, not modified by 27-05. |

### Plan 27-05 (gap closure)

| Artifact | Status | Details |
|----------|--------|---------|
| apps/web/app/[locale]/(dashboard)/page.tsx | VERIFIED | useOnboardingRedirect wired (lines 12, 20), router.replace (line 25), isLoading guard (line 30), shouldRedirect guard (line 33), welcomeBanner i18n keys (lines 38-41). |
| apps/web/components/onboarding/onboarding-checklist.tsx | VERIFIED | Guard at line 51 returns null when onboarding_completed=false. Hydration guard at line 49 still first. |
| apps/web/hooks/use-settings-query.ts | VERIFIED | CompanySettings interface has onboarding_completed: boolean or null (line 19) and industry_type: string or null (line 20). |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| company-details-step.tsx | /api/v1/settings/company | fetch PUT | WIRED |
| first-service-step.tsx | /api/v1/services | fetch POST | WIRED |
| working-hours-step.tsx | /api/v1/settings/working-hours | fetch PUT | WIRED |
| share-link-step.tsx | qrcode library | QRCode.toDataURL() in useEffect | WIRED |
| share-link-step.tsx | /api/v1/settings/company | PUT onboarding_completed=true | WIRED |
| onboarding-checklist.tsx | use-onboarding-checklist.ts | hook call | WIRED |
| dashboard/page.tsx | OnboardingChecklist | import + render | WIRED |
| dashboard/page.tsx | useOnboardingRedirect | import (line 12) + call (line 20) | WIRED (was NOT WIRED) |
| dashboard/page.tsx | /onboarding | router.replace in useEffect (line 25) | WIRED (was NOT WIRED) |
| onboarding-checklist.tsx | companySettings.onboarding_completed | guard at line 51 returns null | WIRED (was NOT WIRED) |
| apply-template/route.ts | industry-templates.ts | getTemplateByIndustry() | WIRED |
| apply-template/route.ts | @schedulebox/database | db.insert(services) in transaction | WIRED |
| driver-tour.tsx | driver.js | import from driver.js | WIRED |
| dashboard/layout.tsx | DashboardTour | import + render | WIRED |
| demo-data/route.ts | demo-data-seeder.ts | seedDemoData/removeDemoData imports | WIRED |

---

## Anti-Patterns Found

None. All previously identified anti-patterns (orphaned hook, missing guard, missing banner) are resolved.

---

## i18n Key Verification

Welcome banner keys in apps/web/messages/cs.json (lines 1101-1104):
- onboarding.welcomeBanner.title -- "Vitejte v ScheduleBox\!"
- onboarding.welcomeBanner.description -- "Dokoncete nastaveni a zacnte prijimat rezervace"
- onboarding.welcomeBanner.action -- "Spustit pruvodce"

All 3 keys rendered in dashboard page at lines 38, 39, 41.

---

## Human Verification Required

### 1. End-to-End 5-Minute Wizard Flow

**Test:** As a freshly registered user, navigate to /dashboard, complete all 4 wizard steps.
**Expected:** Dashboard immediately redirects to /onboarding (router.replace). Wizard completes in under 5 minutes. QR code visible at step 4. Complete setup button sets onboarding_completed=true and redirects to /dashboard.
**Why human:** Auth state, redirect behavior, and QR rendering require a running browser.

### 2. Welcome Banner on Fresh Account

**Test:** Log in as a user with onboarding_completed=false. Visit /dashboard directly.
**Expected:** Welcome banner appears with "Vitejte v ScheduleBox\!" heading, description, and "Spustit pruvodce" CTA button linking to /onboarding. OnboardingChecklist does not render.
**Why human:** Requires auth session with onboarding_completed=false in DB; visual inspection of rendered output needed.

### 3. Driver.js Tour

**Test:** Complete the wizard on a fresh account, then visit /dashboard.
**Expected:** 3-step tooltip tour appears 500ms after page load; second visit shows nothing.
**Why human:** Timing and localStorage behavior require a live browser session.

### 4. QR Code and Download

**Test:** Reach step 4 of the wizard; observe the QR code; click the download button.
**Expected:** 200x200px QR code encoding the booking URL; download saves a PNG.
**Why human:** QRCode.toDataURL() runs client-side only.

---

## Gap Closure Confirmation

| Gap (from previous VERIFICATION.md) | Closure Status | Evidence |
|--------------------------------------|---------------|----------|
| Gap 1 Blocker: useOnboardingRedirect not wired into dashboard | CLOSED | Imported at line 12, called at line 20, router.replace at line 25, welcome banner rendered at lines 33-47. Commit 53de124. |
| Gap 1 Blocker: No redirect logic in dashboard | CLOSED | useEffect with router.replace at lines 23-27. |
| Gap 1 Blocker: No welcome banner | CLOSED | Banner card with all 3 i18n keys at lines 33-47 of dashboard/page.tsx. |
| Gap 2 Warning: No onboarding_completed guard in checklist | CLOSED | Line 51 of onboarding-checklist.tsx returns null when onboarding_completed=false. Commit ad8f858. |
| Bonus fix: CompanySettings type missing fields | CLOSED | onboarding_completed and industry_type added to CompanySettings interface in use-settings-query.ts. Commit f82c31b. |

---

_Verified: 2026-02-24T16:13:46Z_
_Verifier: Claude (gsd-verifier)_
