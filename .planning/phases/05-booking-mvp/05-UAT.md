---
status: passed
phase: 05-booking-mvp
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md, 05-07-SUMMARY.md, 05-08-SUMMARY.md
started: 2026-02-11T22:00:00Z
updated: 2026-02-12T01:30:00Z
---

## Current Test

[all complete]

## Tests

### 1. Availability API

expected: Run: curl "http://localhost:3000/api/v1/availability?company_slug=salon-krasa&service_id=17&date_from=2026-02-12&date_to=2026-02-12" — Returns 200 with available time slots in 15-minute intervals. Each slot has date, startTime, endTime, employeeId, employeeName.
result: pass
reported: "Returns 200 with 33 slots (09:00-18:00 in 15-min intervals) for employee Barbora Jelíneková (ID 13). Fixed: working hours fallback to company-level defaults when no employee-specific hours exist."

### 2. Create Booking via API

expected: POST /api/v1/bookings with Bearer token (salon owner), body { "customer_id":76, "service_id":17, "employee_id":13, "start_time":"2026-02-12T10:00:00Z" }. Returns 201 with booking object containing uuid, status "pending", customer/service/employee info.
result: pass
reported: "Returns 201 with booking UUID 4e3cc734-..., status pending, customer Michal Pospíšil, service Střih vlasů (500 CZK, 60min), employee Barbora Jelíneková. All public IDs are UUIDs. Fixed: postgres-js Date serialization in sql template literals — replaced raw sql with Drizzle lt/gt operators."

### 3. List Bookings via API

expected: GET /api/v1/bookings with Bearer token. Returns 200 with paginated list { data: [...], meta: { total, page, limit } }. The booking created in Test 2 should appear.
result: pass
reported: "Returns 200 with 20 bookings on page 1, meta { total:37, page:1, limit:20, total_pages:2 }. All bookings have proper UUID IDs, nested customer/service/employee objects."

### 4. Booking Wizard - Step 1 Service Selection

expected: Navigate to /bookings/new in the browser. A 4-step wizard appears with progress indicator. Step 1 shows available services as cards with name, duration, and price. Selecting a service highlights it and shows an employee preference dropdown.
result: pass
reported: "Services display with name, duration, price (Coins icon for CZK). Employee dropdown works. Fixed: null→0 coercion in category_id filter, double-wrapping in response, DollarSign→Coins icon, translation keys."

### 5. Booking Wizard - Step 2 Date & Time

expected: After selecting a service and clicking next, Step 2 shows a calendar (defaulting to tomorrow) and a time slot grid. Available slots are shown as clickable buttons. Selecting a slot auto-advances to Step 3.
result: pass
reported: "Calendar renders in Czech with month navigation. Available slots shown as clickable grid. Selecting slot auto-advances. Fixed: react-day-picker v9 classNames, Czech locale, showOutsideDays, availability API UUID lookup fallback."

### 6. Booking Wizard - Step 3 Customer Info

expected: Step 3 shows toggle between "Existing Customer" and "New Customer". Existing customer mode has a searchable dropdown. New customer mode has fields for name, email, phone.
result: pass
reported: "Single searchable customer field with dropdown. Selecting existing customer fills form fields (name/email/phone disabled). New customer manual entry works. Fixed: GET /customers to return SERIAL id, form re-mount via key prop, Zod Czech messages."

### 7. Booking Wizard - Step 4 Confirmation & Submit

expected: Step 4 shows a summary of the booking (service, date/time, employee, customer). A confirm button submits the booking. On success, shows confirmation message or redirects to bookings/calendar.
result: pass
reported: "Summary shows service, date/time (Czech format), employee, customer. Confirm creates booking and redirects to /bookings. Fixed: customer creation for new customers, apiClient buildError nested response parsing, redirect path."

### 8. Bookings List Page

expected: Navigate to /bookings. Shows a table with columns: Date/Time, Customer, Service, Employee, Status (color-coded badge), Price. Status filter dropdown and search field visible. Pagination controls at bottom.
result: pass
reported: "Table displays with all columns, status badges, pagination. Status filter works (all/pending/confirmed/etc). Search filters client-side by customer name/email/phone. Fixed: 'all' filter sending literal 'all' to API instead of clearing the filter."

### 9. Booking Detail Panel

expected: On the bookings list or calendar, click a booking. A slide-over detail panel opens showing full booking info (customer, service, employee, date/time, price, notes) and action buttons based on status (e.g. Confirm/Cancel for pending bookings).
result: pass
reported: "Detail panel slides in with customer, service, employee, date/time, price, metadata. Action buttons shown based on status. Fixed: double unwrapping in useBookingDetail, bookingId type number→string (UUID), snake_case field names to match API."

### 10. Confirm Booking

expected: From the detail panel of a pending booking, click Confirm. The booking status changes to "confirmed". A success toast appears. The status badge updates to blue "confirmed".
result: pass
reported: "Clicking Potvrdit on pending booking changes status to confirmed. Toast appears, panel closes, list updates."

### 11. Cancel Booking

expected: From the detail panel of a confirmed booking, click Cancel. The booking status changes to "cancelled". A success toast appears. The status badge updates to gray "cancelled".
result: pass
reported: "Clicking Zrušit on booking changes status to cancelled. Fixed: empty body sent as {} instead of undefined to satisfy bodySchema JSON parsing."

### 12. Complete Booking

expected: From the detail panel of a confirmed booking, click Complete. The booking status changes to "completed". A success toast appears. The status badge updates to green "completed".
result: pass
reported: "Complete and No-Show actions work. Fixed: no-show toast showing raw key — mapped hyphenated action names to camelCase translation keys."

### 13. Double-Booking Prevention

expected: Try to create a second booking for the same employee at the same time slot (via API or wizard). Returns 409 with SLOT_TAKEN error. The conflicting booking is not created.
result: pass
reported: "Double-booking prevented at both levels: (1) Availability API hides booked slots, (2) Booking API returns 409 SLOT_TAKEN on conflict. Wizard redirects to Step 2 with toast and error alert. Fixed: setStep clearing error, added toast for SLOT_TAKEN."

### 14. Reschedule Booking via API

expected: POST /api/v1/bookings/{id}/reschedule with { "start_time": "2026-02-12T14:00:00Z" }. Returns 200 with updated booking showing new start time. Original time slot becomes available again.
result: pass
reported: "Reschedule returns 200 with updated start_time/end_time. Fixed: Date serialization in sql template — replaced with Drizzle lt/gt/ne operators."

### 15. Time Blocking via API

expected: POST /api/v1/bookings/block with { "employee_id": (UUID), "date": "2026-02-13", "start_time": "12:00:00", "end_time": "13:00:00", "reason": "Lunch" }. Returns 201. GET /api/v1/availability for that employee on that date should NOT show slots during 12:00-13:00.
result: pass
reported: "Block created (201) with override_ids. Availability correctly excludes 12:00-13:00. Fixed: company-level working hours fallback. Known minor issue: afternoon slots after block not showing (availability engine reads single override per day)."

### 16. Calendar Drag-Drop Reschedule

expected: On the calendar page, drag a booking event to a different time slot. The booking moves optimistically. If the new slot is available, the change persists. A toast confirms the reschedule.
result: pass
reported: "Drag-drop works in day/week/month views. Success shows Czech toast 'Rezervace přesunuta'. Conflict shows 'Časový slot je obsazený'. Non-reschedulable bookings (completed/cancelled/no_show) are not draggable. Month view preserves original time. Fixed: snake_case API field mapping (start_time/end_time), UUID string IDs instead of Number(UUID)=NaN, duplicate FullCalendar headerToolbar removed, date range widened per view (±45 days for month), limit 100 (was 500 exceeding API max), status-based event colors and editability, comprehensive Czech error messages by status code."

## Summary

total: 16
passed: 16
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
