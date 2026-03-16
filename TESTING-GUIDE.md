# ScheduleBox v2.0 — Complete Manual Testing Guide

Start dev server: `pnpm dev` → http://localhost:3000
All test passwords: **password123**

| Account             | Email                  | Role  |
| ------------------- | ---------------------- | ----- |
| Super Admin         | admin@schedulebox.cz   | admin |
| Owner (Salon Krasa) | test@example.com       | owner |
| Owner (Salon Krasa) | lukas.fiala@centrum.cz | owner |
| Owner (U Brouska)   | martin.novak@seznam.cz | owner |
| Owner (FitZone)     | eva.svobodova@email.cz | owner |

---

## 1. Authentication & Registration

### 1.1 Login

1. Go to `/cs/login`
2. - [x] Page loads without errors
3. - [x] Enter wrong password → clear error message shown
4. - [x] Enter correct credentials (test@example.com / password123) → redirects to `/cs/dashboard`
5. - [x] Enter admin credentials (admin@schedulebox.cz / password123) → redirects to `/cs/admin`

### 1.2 Registration

1. Go to `/cs/register`
2. - [x] Page loads with registration form
3. - [x] Fill in name, email, password → submit
4. - [x] Validation errors shown for missing/invalid fields (in correct locale)
5. - [x] Successful registration → redirected to login or dashboard

### 1.3 Password Recovery

1. Go to `/cs/forgot-password`
2. - [x] Page loads with email input
3. - [x] Enter email → submit → confirmation message shown
4. - [x] (If email service not configured, verify API returns success)

### 1.4 Session Persistence

- [x] Refresh any page → stays logged in (no redirect to login)
- [x] Wait 15+ min → session auto-renews (no expiration popup)
- [x] Open new tab → still logged in
- [x] Click Logout → redirected to login, cannot access dashboard

---

## 2. Admin Panel (admin@schedulebox.cz)

1. Log in as **admin@schedulebox.cz / password123**
2. - [x] Redirects to `/cs/admin`

### 2.1 Admin Dashboard

3. - [x] Dashboard shows KPI cards: Total Companies, Total Users, Total Bookings, Total Revenue
4. - [x] Numbers are real (not zero/placeholder)
5. - [x] New Companies (30d) and Bookings (7d) stats visible

### 2.2 Companies Management

6. Go to Companies page
7. - [x] See list of companies (should be 5)
8. - [x] Company details visible: name, slug, plan, status
9. - [x] Click Deactivate on a company → status changes to inactive
10. - [x] Click Activate → status changes back to active

### 2.3 Users Management

11. Go to Users page
12. - [x] See user list with roles and company assignments
13. - [x] Filter by role works (Owner, Employee, Customer, Admin)
14. - [x] Search by name/email works

### 2.4 Admin Session

15. - [x] Refresh browser → stays logged in
16. - [x] Navigate to `/cs/dashboard` → redirects back to `/cs/admin`

---

## 3. Business Owner View (test@example.com)

Log out, log in as **test@example.com / password123**

### 3.1 Dashboard

1. - [x] Redirects to `/cs/dashboard`
2. - [x] KPI cards show real numbers (bookings count, revenue, customers)
3. - [x] Revenue mini-chart visible with trend data
4. - [x] Recent bookings list shows entries
5. - [x] Booking Link Card visible — click Copy → link copied to clipboard
6. - [x] Onboarding checklist visible (if not completed)
7. - [x] Usage widget visible

### 3.2 Services

8. Go to Services page
9. - [x] Service list loads with entries (names, prices, durations, categories)
10. - [x] Click a service → edit form opens
11. - [x] Change name or price → Save → reload → changes persist
12. - [x] Click delete (Trash icon) → confirm dialog → service removed from list
13. - [x] Create new service → fill name, duration, price, category → Save → appears in list

### 3.3 Employees

14. Go to Employees page
15. - [x] Employee list shows entries with name, email, title, status
16. - [x] See employees with and without user accounts
17. - [x] Click "Create Login" on employee without account → fill email + password → creates account
18. - [x] Note the employee email/password — you'll need it for Section 5

### 3.4 Bookings

19. Go to Bookings page
20. - [x] Booking list loads with entries (date, customer, service, employee, status, price)
21. - [x] Filter by status: All, Pending, Confirmed, Completed, Cancelled, No-Show
22. - [x] Search by customer name works
23. - [x] Click a booking row → detail panel opens with full info
24. - [x] On a **pending** booking: click Confirm → status changes to confirmed
25. - [x] On a **confirmed** booking: click Complete → status changes to completed
26. - [x] On a **confirmed** booking: click Cancel → status changes to cancelled
27. - [x] On a **confirmed** booking: click No-Show → status changes to no_show
28. - [x] Pagination works (navigate between pages)

### 3.5 Create Booking (Admin-side)

29. Go to Bookings → New Booking (`/cs/bookings/new`)
30. - [x] Step 1: Select a service from list
31. - [x] Step 2: Pick date and time slot
32. - [x] Step 3: Enter customer info (or select existing)
33. - [x] Submit → booking created, visible in booking list

### 3.6 Calendar

34. Go to Calendar page
35. - [x] Calendar loads with bookings visualized on timeline
36. - [x] Employee names visible on bookings
37. - [x] Click a booking → detail opens
38. - [x] Navigate between dates (forward/backward)

### 3.7 Customers

39. Go to Customers page
40. - [x] Customer list loads (name, email, phone, total bookings, lifetime value)
41. - [x] Search by name/email/phone works
42. - [x] Click a customer → detail page opens with booking history
43. - [x] Create new customer → fill name, email, phone → Save → appears in list
44. - [x] Pagination works

### 3.8 Payments

45. Go to Payments page
46. - [x] KPI cards show real totals: Total Revenue (CZK), Completed, Pending (3), Refunded
47. - [x] KPI numbers stay consistent regardless of active filters
48. - [x] Payment list loads with entries (date, customer, service, amount, method, status)
49. - [x] Filter by status: Paid, Pending, Failed, Refunded — list updates correctly
50. - [x] Filter by payment method: Comgate, Cash, Bank Transfer — list updates correctly
51. - [x] Method labels are translated (Czech: Hotovost, Bankovní převod; English: Cash, Bank transfer)
52. - [x] Click a payment row → detail dialog opens with full info (amount, gateway, dates, customer, service)
53. - [x] On a paid payment: click Refund → fill reason → confirm → status changes

> **Note:** Payments are created via bookings, not directly. Online payments (Comgate) start as "pending" and become "paid" after gateway confirmation. Cash/bank payments are recorded manually on completed bookings.

### 3.9 Reviews

50. Go to Reviews page
51. - [x] KPI cards: Average Rating, Total Reviews, This Month, Response Rate
52. - [x] Review list with star ratings and comments
53. - [x] Filter by rating (1-5 stars)
54. - [x] Reply to a review → reply saves and shows

### 3.10 Analytics

55. Go to Analytics page
56. - [x] Period selector works (7d, 30d, 90d)
57. - [x] Revenue chart loads with data
58. - [x] Booking stats chart visible
59. - [x] Payment method breakdown chart visible
60. - [x] Top services chart visible
61. - [x] Peak hours heatmap visible
62. - [x] Employee utilization chart visible
63. - [x] Cancellation rate chart visible
64. - [x] Customer retention chart visible

### 3.11 Loyalty Program

65. Go to Loyalty page
66. - [x] Page loads (may be empty if no program set up)
67. - [x] Create loyalty program → set name, type (points/tier), exchange rate
68. - [x] Loyalty cards sub-page loads
69. - [x] Rewards sub-page loads
70. - [x] Create a reward → set name, point cost

### 3.12 Marketing (Coupons & Gift Cards)

71. Go to Marketing page
72. - [x] Coupon section visible
73. - [x] Create coupon → code, discount type (% or fixed), amount → Save
74. - [x] Coupon appears in list, can be activated/deactivated
75. - [x] Gift card section visible
76. - [x] Create gift card → set balance, recipient → Save

### 3.13 Automation

77. Go to Automation page
78. - [x] Rules list loads (may be empty)
79. - [x] Go to Builder (`/cs/automation/builder`)
80. - [x] Select trigger event (e.g., Booking Created)
81. - [x] Select action (Email/SMS)
82. - [x] Set delay and template
83. - [x] Save rule → appears in rules list
84. - [x] Toggle rule active/inactive
85. - [x] Automation logs page loads (`/cs/automation/logs`)

### 3.14 Notifications & Templates

86. Go to Notifications page
87. - [x] Notification history list loads
88. - [x] Filter by channel (Email, SMS, Push)
89. - [x] Filter by status (Sent, Delivered, Failed)
90. Go to Templates page (`/cs/templates`)
91. - [x] Template list loads with pre-built templates
92. - [x] Click a template → edit subject and body
93. - [x] Template variables work (e.g., {{customer_name}})
94. - [x] Toggle template active/inactive

### 3.15 Resources

95. Go to Resources page
96. - [x] Page loads (may be empty)
97. - [x] Create resource type (e.g., "Meeting Rooms")
98. - [x] Create resource → assign to type, set quantity
99. - [x] Edit/delete resource works

### 3.16 AI Features

100. Go to AI page (`/cs/ai`)
101. - [x] AI hub page loads
102. Go to AI Pricing (`/cs/ai/pricing`)
103. - [x] Pricing optimization page loads (may show placeholder/recommendations)
104. Go to AI Capacity (`/cs/ai/capacity`)
105. - [x] Capacity optimization page loads

### 3.17 Marketplace

106. Go to Marketplace page
107. - [x] Page loads with listings (or empty state)
108. - [x] My Listing section visible
109. - [x] Can create/edit marketplace listing

### 3.18 Organization (Multi-Location)

110. Go to Organization page (`/cs/organization`)
111. - [x] Organization overview loads (name, locations count)
112. Go to Organization Dashboard (`/cs/organization/dashboard`)
113. - [x] Aggregate KPIs visible
114. Go to Organization Customers (`/cs/organization/customers`)
115. - [x] Cross-location customer list visible
116. Go to Organization Settings (`/cs/organization/settings`)
117. - [x] Settings page loads

### 3.19 Settings

118. Go to Settings page
119. - [x] Company profile editable (name, email, phone, website, description, address)
120. - [x] Save changes → reload → changes persist
121. - [x] Working hours section: set hours per day, toggle days on/off
122. - [x] Timezone selector works
123. - [x] Booking settings: lead time, max advance days
124. Go to Billing settings (`/cs/settings/billing`)
125. - [x] Current plan visible
126. - [x] Plan options shown (Free, Essential, Growth)

### 3.20 Profile

127. Go to Profile page (`/cs/profile`)
128. - [x] User profile loads with name, email
129. - [x] Edit name → Save → persists

### 3.21 Location Switching

130. - [x] If user has access to multiple locations, location switcher visible in sidebar/header
131. - [x] Switch location → dashboard data changes to reflect selected location

---

## 4. Employee View

Log out. Log in as an employee (use credentials from step 3.3, or use a seeded employee email with password123).

### 4.1 Dashboard

1. - [x] Redirects to `/cs/dashboard`
2. - [x] Dashboard shows employee-specific KPIs (own bookings, own revenue)
3. - [x] Recent bookings shows only bookings assigned to this employee

### 4.2 My Bookings

4. Go to Bookings page
5. - [x] Sees **only** bookings assigned to them (not all company bookings)
6. - [x] Can Confirm a pending booking
7. - [x] Can Complete a confirmed booking
8. - [x] Can mark No-Show on a confirmed booking
9. - [x] Cannot see other employees' bookings

### 4.3 Schedule (My Working Hours)

10. Go to Schedule page
11. - [x] Working hours grid: Monday-Sunday with start/end times
12. - [x] Set hours for each day → Save → reload → hours persist
13. - [x] Toggle a day as day-off → Save
14. - [x] Schedule overrides section: add time-off
15. - [x] Select date range + reason → submit → override created
16. - [x] Override visible in list

### 4.4 Limited Access

17. - [x] Employee **cannot** access: Services management, Employee management, Settings, Analytics (owner-level), Payments
18. - [x] Sidebar shows only employee-appropriate menu items
19. - [x] Refresh browser → stays logged in

---

## 5. End Customer — Full Booking Flow

This tests the complete customer journey: public booking → tracking → review → customer portal.

### 5.1 Public Company Page

1. Go to `/cs/salon-krasa`
2. - [x] Company public profile loads (name, description, services)

### 5.2 Booking Wizard

3. Go to `/cs/salon-krasa/book` (or use booking link copied in step 3.1)
4. **Step 1 — Service Selection**
5. - [x] Service list loads with names, prices, durations
6. - [x] Select a service → proceed to next step
7. **Step 2 — Date & Time**
8. - [x] Calendar shows available dates
9. - [x] Select a date → available time slots shown
10. - [x] Green slots = available, grayed out = unavailable
11. - [x] Select a time slot → proceed
12. **Step 3 — Customer Info**
13. - [x] Form: Name (required), Email (required), Phone, Notes
14. - [x] Fill in details → Submit
15. **Step 4 — Confirmation**
16. - [x] Success screen with booking ID/reference
17. - [x] "Track Your Booking" link visible
18. - [x] Service name, date, time, employee shown

### 5.3 Booking Tracking

19. Click the tracking link (or go to `/cs/salon-krasa/booking/[uuid]`)
20. - [x] Booking status shows "pending"
21. - [x] Service name, employee name, date/time visible
22. - [x] Go to owner dashboard → find the booking → Confirm it
23. - [x] Reload tracking page → status shows "confirmed"
24. - [x] Owner completes the booking
25. - [x] Reload tracking page → status shows "completed"

### 5.4 Customer Review

26. - [x] "Leave Review" link visible on completed booking tracking page
27. Click review link (or go to `/cs/salon-krasa/review/[bookingUuid]`)
28. - [x] Review form loads: star rating (1-5) + comment text area
29. - [x] Select rating, write comment → Submit
30. - [x] Confirmation shown
31. - [x] Go to owner Reviews page → new review visible

### 5.5 Customer Portal (after registering)

32. Register as a customer at `/cs/register` (select "Zákazník" tab)
33. - [x] After registration, redirected to `/cs/portal/bookings`
34. - [x] Portal shows bookings made with the same email
35. - [x] Completed bookings have "Leave Review" button
36. - [x] "Track Booking" link opens the public tracking page
37. Go to `/cs/portal/profile`
38. - [x] Profile shows name, email, phone
39. - [x] Can edit name and phone → Save → persists

### 6.5 Slot Conflict

32. - [x] Try booking the exact same slot again → should get "slot taken" or "unavailable" error

### 6.6 Other Companies

33. - [x] Try `/cs/panske-holicstvi-u-brouska/book` → booking works for different company
34. - [x] Try `/cs/fitzone-gym/book` → booking works for third company

---

## 7. Onboarding Flow

### 7.1 New User Onboarding

1. Register a brand new user account (Section 1.2)
2. - [x] After login, redirected to onboarding wizard (`/cs/onboarding`)
3. - [x] Step-by-step setup: business info, services, employees, settings
4. - [x] Can generate demo data
5. - [x] Completing onboarding → redirected to dashboard
6. - [x] Onboarding checklist on dashboard tracks progress

---

## 8. Public Marketing Pages

1. - [x] Landing page (`/cs`) loads with marketing content
2. - [x] Pricing page (`/cs/pricing`) shows plan comparison
3. - [x] Terms page (`/cs/terms`) loads
4. - [x] Privacy page (`/cs/privacy`) loads
5. - [x] All pages render without errors

---

## 9. Internationalization (i18n)

1. - [x] Czech: `/cs/dashboard` → all labels in Czech
2. - [x] Slovak: `/sk/dashboard` → all labels in Slovak
3. - [x] English: `/en/dashboard` → all labels in English
4. - [x] Language switch persists across page navigation
5. - [x] Public booking pages respect locale

---

## 10. Cross-View Integration Checks

These verify data flows correctly between different user roles:

- [ ] Owner creates a service → it appears in public booking wizard
- [ ] Owner edits service price → public booking shows updated price
- [ ] Employee sets working hours → public availability slots match those hours
- [ ] Employee adds time-off → those dates show as unavailable in public booking
- [ ] Customer books online → booking appears in owner's booking list
- [ ] Customer books online → booking appears in assigned employee's "My Bookings"
- [ ] Owner confirms booking → customer tracking page shows "confirmed"
- [ ] Owner completes booking → customer tracking page shows "completed"
- [ ] Customer leaves review → review appears in owner's Reviews page
- [ ] Owner replies to review → reply visible (if public reply feature exists)
- [ ] Admin deactivates a company → owner of that company can't log in
- [ ] Admin reactivates company → owner can log in again
- [ ] Owner creates employee login → employee can log in with those credentials
- [ ] Owner deletes a service → service no longer appears in public booking

---

## 11. Error Handling & Edge Cases

- [ ] Navigate to non-existent page → proper 404 page shown
- [ ] Access dashboard without login → redirected to login
- [ ] Access admin panel as non-admin → access denied / redirected
- [ ] Submit empty forms → validation errors shown (not server crash)
- [ ] Double-click submit buttons → no duplicate entries created
- [ ] Very long text in fields → handled gracefully (no overflow/crash)

---

## 12. Quick API Smoke Tests (optional)

```bash
# Admin login
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@schedulebox.cz","password":"password123"}'

# Owner login
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Public services (no auth needed)
curl -s http://localhost:3000/api/v1/public/company/salon-krasa/services

# Availability check
curl -s "http://localhost:3000/api/v1/public/company/salon-krasa/availability?service_id=SERVICE_UUID&date_from=2026-03-23&date_to=2026-03-23"

# Health check
curl -s http://localhost:3000/api/health
```

---

## Testing Progress Tracker

| Section                       | Status | Notes |
| ----------------------------- | ------ | ----- |
| 1. Auth & Registration        |        |       |
| 2. Admin Panel                |        |       |
| 3. Owner View — Dashboard     |        |       |
| 3. Owner View — Services      |        |       |
| 3. Owner View — Employees     |        |       |
| 3. Owner View — Bookings      |        |       |
| 3. Owner View — Calendar      |        |       |
| 3. Owner View — Customers     |        |       |
| 3. Owner View — Payments      |        |       |
| 3. Owner View — Reviews       |        |       |
| 3. Owner View — Analytics     |        |       |
| 3. Owner View — Loyalty       |        |       |
| 3. Owner View — Marketing     |        |       |
| 3. Owner View — Automation    |        |       |
| 3. Owner View — Notifications |        |       |
| 3. Owner View — Resources     |        |       |
| 3. Owner View — AI            |        |       |
| 3. Owner View — Marketplace   |        |       |
| 3. Owner View — Organization  |        |       |
| 3. Owner View — Settings      |        |       |
| 4. Employee View              |        |       |
| 5. Employee Portal            |        |       |
| 6. Public Booking             |        |       |
| 7. Onboarding                 |        |       |
| 8. Marketing Pages            |        |       |
| 9. i18n                       |        |       |
| 10. Cross-View Checks         |        |       |
| 11. Error Handling            |        |       |
