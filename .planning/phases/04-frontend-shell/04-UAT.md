---
status: diagnosed
phase: 04-frontend-shell
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md
started: 2026-02-10T22:10:00Z
updated: 2026-02-10T22:30:00Z
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
reported: "Original blocker (missing html/body tags) fixed. But / shows 404 instead of redirecting to login. /cs/ correctly redirects to login — next-intl middleware not rewriting root URL."
severity: major

### 9. Sidebar Navigation (if dashboard accessible)

expected: If you can access the dashboard (e.g., by temporarily disabling auth guard or after login), the left sidebar shows navigation items with icons: Dashboard, Calendar, Bookings, Customers, Services, Employees, Settings. Sidebar is collapsible.
result: skipped
reason: Cannot log in without backend server (Docker not available)

### 10. Dashboard KPI Cards

expected: The dashboard page shows 4 stat cards in a grid: today's bookings (12), monthly revenue (47,850 Kč), new customers (23), average rating (4.7/5). Each card shows a trend indicator (up/down arrow with percentage).
result: skipped
reason: Cannot log in without backend server (Docker not available)

### 11. Quick Actions

expected: Below the KPI cards, a "Quick Actions" section shows 3 buttons: New Booking, Add Customer, View Calendar (in Czech).
result: skipped
reason: Cannot log in without backend server (Docker not available)

### 12. Calendar Page

expected: Navigating to /calendar shows a FullCalendar resource timeline with employee columns (4 mock employees). A toolbar above with prev/next/today buttons and day/week/month view toggles. Mock booking events shown in colored blocks.
result: skipped
reason: Cannot log in without backend server (Docker not available)

### 13. Placeholder Pages

expected: Navigating to /customers, /services, /employees, /settings, /bookings each shows a placeholder empty state with an icon and "coming soon" style message.
result: skipped
reason: Cannot log in without backend server (Docker not available)

### 14. Header & Breadcrumbs

expected: When viewing dashboard pages, a sticky header bar appears at the top with breadcrumbs showing the current location (e.g., "Dashboard > Calendar"). On mobile, a hamburger menu icon appears.
result: skipped
reason: Cannot log in without backend server (Docker not available)

### 15. Responsive Layout

expected: Resizing the browser to mobile width (~375px) hides the sidebar and shows a hamburger menu in the header. Tapping the hamburger opens a slide-over sheet with the same navigation items.
result: skipped
reason: Cannot log in without backend server (Docker not available)

## Summary

total: 15
passed: 7
issues: 1
pending: 0
skipped: 7

## Gaps

- truth: 'Navigating to / redirects to login page via next-intl middleware and auth guard'
  status: failed
  reason: 'User reported: / shows 404. /cs/ correctly redirects to login. next-intl middleware not rewriting root URL to /cs/.'
  severity: major
  test: 8
  root_cause: 'Root page.tsx was deleted during i18n restructuring (moved to app/[locale]/). next-intl middleware configured with localePrefix: as-needed should rewrite / to /cs/ but either middleware is not matching root path or there is no page at app/[locale]/(dashboard)/page.tsx being served for /.'
  artifacts:
    - path: 'apps/web/middleware.ts'
      issue: 'May not be rewriting root / path to /cs/'
    - path: 'apps/web/app/page.tsx'
      issue: 'Deleted — no root page exists outside [locale] segment'
  missing:
    - 'Ensure next-intl middleware rewrites / to /cs/ (check matcher config)'
    - 'Or add a root app/page.tsx that redirects to /cs/'
  debug_session: ''
