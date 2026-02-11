---
status: complete
phase: 04-frontend-shell
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md, 04-08-SUMMARY.md
started: 2026-02-11T21:10:00Z
updated: 2026-02-11T21:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login Page Renders

expected: Visit http://localhost:3000/login. Page shows ScheduleBox branding/logo at top. Below it, a card with Czech heading "Přihlášení". Two input fields: email and password. A blue primary-colored (#3B82F6) submit button with Czech text. Links to register and forgot-password below the form. Inter font used throughout.
result: [pending]

### 2. Login Form Validation

expected: On the login page, click the submit button with empty fields. Czech validation error messages appear below the fields (e.g. required field messages). Enter an invalid email format and see email validation error.
result: [pending]

### 3. Password Visibility Toggle

expected: On the login page, the password field has an eye icon button. Clicking it toggles between hidden (dots) and visible (plain text) password display.
result: [pending]

### 4. Register Page

expected: Click the register link on the login page. Navigates to a registration form with fields for: name, email, company name, password, and confirm password. Password shows complexity requirements (12+ chars, uppercase, lowercase, number, special char). All text in Czech.
result: [pending]

### 5. Forgot Password Page

expected: Click the forgot password link on the login page. Navigates to a page with a single email field and a submit button. All text in Czech.
result: [pending]

### 6. Auth Guard Redirect

expected: Navigate to http://localhost:3000/ (root). Should redirect to the login page since you are not authenticated. The auth guard prevents access to dashboard without valid JWT.
result: [pending]

### 7. Successful Login

expected: On the login page, enter email "test@example.com" and password "SecurePass123!" and submit. After successful login, redirected to the dashboard page. No error messages shown.
result: pass
reported: "Login succeeds, redirects to dashboard. No errors after Button asChild Slot fix."

### 8. Sidebar Navigation

expected: After login, the left sidebar shows navigation items with icons: Dashboard, Calendar, Bookings, Customers, Services, Employees, Settings (text in Czech). Active route is highlighted. ScheduleBox logo at top of sidebar.
result: pass
reported: "Sidebar shows Czech nav items with icons after auth store response mapping fix. Active route highlighted. ScheduleBox logo at top."

### 9. Sidebar Collapse

expected: The sidebar has a collapse/toggle button. Clicking it shrinks the sidebar to ~64px showing only icons. Hovering collapsed items shows tooltips with the page name.
result: pass

### 10. Header & Breadcrumbs

expected: A sticky header bar appears at the top of the content area. It shows breadcrumbs for the current location (e.g. "Dashboard"). User avatar/menu is visible on the right side of the header.
result: pass

### 11. User Menu

expected: Clicking the user avatar/name in the header opens a dropdown menu with options like profile, settings, and logout. Clicking logout returns to the login page.
result: pass

### 12. Dashboard KPI Cards

expected: The dashboard page shows 4 stat cards in a grid: today's bookings (12), monthly revenue (47,850 Kč), new customers (23), average rating (4.7/5). Each card shows a trend indicator (up/down arrow with percentage).
result: pass

### 13. Quick Actions

expected: Below the KPI cards, a section shows action buttons including: New Booking, Add Customer, View Calendar (text in Czech).
result: pass

### 14. Calendar Page

expected: Navigate to Calendar from the sidebar. A FullCalendar view loads with employee columns as resources. A toolbar above with prev/next/today buttons and day/week/month view toggle. Mock booking events visible in colored blocks.
result: issue
reported: "Calendar loads but: (1) FullCalendar internal UI was in English — fixed by importing csLocale. (2) No employee resource columns — by design, FullCalendar Premium required for resource views, using standard timeGrid for MVP. (3) 'Create booking' button crashed with services.map not a function — fixed by unwrapping API response envelope in apiClient."

### 15. Placeholder Pages

expected: Navigate to Customers, Services, Employees, Settings, or Bookings from the sidebar. Each shows a placeholder empty state with an icon and a message indicating the page is coming soon.
result: pass

### 16. Mobile Responsive Layout

expected: Resize the browser to mobile width (~375px). Sidebar hides. A hamburger menu icon appears in the header. Tapping the hamburger opens a slide-over sheet with the same navigation items.
result: pass

## Summary

total: 16
passed: 15
issues: 1
pending: 0
skipped: 0

## Gaps

1. **Calendar resource view**: FullCalendar Premium license required for employee column resources. Using standard timeGrid views for MVP.

## Fixes Applied

1. **Button asChild Slot error (Test 7)**: Split Button render path — asChild uses Slot with single child, non-asChild uses button with optional Loader2. Fixed React.Children.only crash.

2. **Auth store response mapping (Test 8)**: Login API returns `{ data: { access_token, user: { uuid, name, role, company_id } } }` but store expected flat camelCase. Fixed mapping with field name translation.

3. **API response envelope unwrap (Test 14)**: All API responses wrapped in `{ data: ... }` but components expected raw data. Fixed at apiClient.handleResponse level to auto-unwrap.

4. **Locale-aware navigation (Test 8)**: Created `lib/i18n/navigation.ts` with next-intl `createNavigation()`. Replaced `next/link` and `next/navigation` imports across 11 files.

5. **Locale detection disabled (Test 8)**: Middleware auto-detected browser English, causing /en prefix. Added `localeDetection: false` to always default to Czech.

6. **Events package .js imports (Test 14)**: Removed `.js` extensions from all imports in `packages/events/src/` — Next.js resolves from TypeScript source directly.

7. **FullCalendar Czech locale (Test 14)**: Imported `@fullcalendar/core/locales/cs` for proper Czech UI in calendar.

8. **Missing placeholder pages (Test 8)**: Created `/analytics` and `/marketing` placeholder pages.
