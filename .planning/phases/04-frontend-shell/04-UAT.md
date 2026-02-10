---
status: diagnosed
phase: 04-frontend-shell
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md
started: 2026-02-10T22:10:00Z
updated: 2026-02-10T22:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login Page Layout

expected: Login page shows ScheduleBox branding/logo at top. Below it, a card with Czech text "Prihlaseni" or "Přihlášení" as heading. Two input fields: email and password. A blue primary-colored submit button with Czech text. Links to register and forgot-password below the form.
result: pass

### 2. Password Visibility Toggle

expected: The password field on the login page has an eye icon button. Clicking it toggles between hidden (dots) and visible (plain text) password display.
result: pass

### 3. Login Form Validation

expected: Clicking the submit button with empty fields shows validation error messages in Czech (e.g., required field messages). Entering an invalid email format shows email validation error.
result: pass

### 4. Register Page Navigation

expected: Clicking the register link on the login page navigates to a registration form. The register page shows fields for: name, email, company name, password, and confirm password. Password has complexity requirements (12+ chars, uppercase, lowercase, number, special char).
result: pass

### 5. Forgot Password Page

expected: Clicking the forgot password link on the login page navigates to a forgot-password form with a single email field and a submit button. All text is in Czech.
result: pass

### 6. Design System Colors

expected: The primary action button (submit/login) uses blue color (#3B82F6). The page uses Inter font family. Cards have subtle borders and rounded corners consistent with shadcn/ui styling.
result: pass

### 7. Czech Translations

expected: All UI text on auth pages is in Czech with proper diacritics (ř, ž, č, ě, ů). No English text visible in labels, buttons, or error messages (except brand name "ScheduleBox").
result: pass

### 8. Dashboard Access (Auth Guard)

expected: Navigating to the root URL (/) or /dashboard redirects to the login page since you are not authenticated. The auth guard prevents access to dashboard without valid JWT.
result: issue
reported: "Missing required html tags. The following tags are missing in the Root Layout: <html>, <body>. Error prevents page from rendering."
severity: blocker

### 9. Sidebar Navigation (if dashboard accessible)

expected: If you can access the dashboard (e.g., by temporarily disabling auth guard or after login), the left sidebar shows navigation items with icons: Dashboard, Calendar, Bookings, Customers, Services, Employees, Settings. Sidebar is collapsible.
result: issue
reported: "same error — root layout missing <html> and <body> tags blocks all dashboard routes"
severity: blocker

### 10. Dashboard KPI Cards

expected: The dashboard page shows 4 stat cards in a grid: today's bookings (12), monthly revenue (47,850 Kč), new customers (23), average rating (4.7/5). Each card shows a trend indicator (up/down arrow with percentage).
result: skipped
reason: Blocked by root layout error (Test 8)

### 11. Quick Actions

expected: Below the KPI cards, a "Quick Actions" section shows 3 buttons: New Booking, Add Customer, View Calendar (in Czech).
result: skipped
reason: Blocked by root layout error (Test 8)

### 12. Calendar Page

expected: Navigating to /calendar shows a FullCalendar resource timeline with employee columns (4 mock employees). A toolbar above with prev/next/today buttons and day/week/month view toggles. Mock booking events shown in colored blocks.
result: skipped
reason: Blocked by root layout error (Test 8)

### 13. Placeholder Pages

expected: Navigating to /customers, /services, /employees, /settings, /bookings each shows a placeholder empty state with an icon and "coming soon" style message.
result: skipped
reason: Blocked by root layout error (Test 8)

### 14. Header & Breadcrumbs

expected: When viewing dashboard pages, a sticky header bar appears at the top with breadcrumbs showing the current location (e.g., "Dashboard > Calendar"). On mobile, a hamburger menu icon appears.
result: skipped
reason: Blocked by root layout error (Test 8)

### 15. Responsive Layout

expected: Resizing the browser to mobile width (~375px) hides the sidebar and shows a hamburger menu in the header. Tapping the hamburger opens a slide-over sheet with the same navigation items.
result: skipped
reason: Blocked by root layout error (Test 8)

## Summary

total: 15
passed: 7
issues: 2
pending: 0
skipped: 6

## Gaps

- truth: 'Navigating to / or /dashboard redirects to login page via auth guard'
  status: fixed
  reason: 'User reported: Missing required html tags. The following tags are missing in the Root Layout: <html>, <body>. Error prevents page from rendering.'
  severity: blocker
  test: 8
  root_cause: 'app/layout.tsx was a bare passthrough returning just children without <html> or <body> tags. During i18n restructuring, these tags were moved to app/[locale]/layout.tsx, but Next.js requires them in the root layout.'
  artifacts:
    - path: 'apps/web/app/layout.tsx'
      issue: 'Missing <html> and <body> tags — was bare passthrough'
    - path: 'apps/web/app/[locale]/layout.tsx'
      issue: 'Contained <html>/<body> that belong in root layout'
  missing:
    - 'Move <html>, <body>, font, providers, Toaster, globals.css back to app/layout.tsx'
    - 'Strip app/[locale]/layout.tsx to just NextIntlClientProvider wrapper'
  debug_session: '.planning/debug/missing-html-tags-root-layout.md'

- truth: 'Dashboard renders with sidebar navigation showing menu items'
  status: fixed
  reason: 'User reported: same error — root layout missing <html> and <body> tags blocks all dashboard routes'
  severity: blocker
  test: 9
  root_cause: 'Same root cause as Test 8 — single fix resolves both issues'
  artifacts: []
  missing: []
  debug_session: '.planning/debug/missing-html-tags-root-layout.md'
