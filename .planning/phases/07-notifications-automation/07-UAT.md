---
status: complete
phase: 07-notifications-automation
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md, 07-05-SUMMARY.md, 07-06-SUMMARY.md, 07-07-SUMMARY.md]
started: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Notification History Page

expected: Navigate to /notifications in the dashboard. Page loads with a data table showing notification delivery history. Columns visible: channel (with icons), recipient, status (color-coded badges), date. Filter dropdowns for channel, status, date range. Pagination controls visible. All labels in Czech.
result: issue
reported: "there is no navigation for notification, if i put the link there, it gets me to login"
severity: major

### 2. Create Notification Template

expected: Navigate to /templates in the dashboard. Page shows card grid of existing templates. Click "Nová šablona" button — a create dialog opens with fields: type (select from 10 types like Potvrzení rezervace, Připomenutí...), channel (email/sms/push radio), subject (disabled for sms/push), bodyTemplate (textarea), isActive toggle. Submitting creates the template and it appears in the list.
result: issue
reported: "there is no templates page accessible, same navigation/routing issue as test 1"
severity: major

### 3. Template Editor with Live Preview

expected: Click edit on a template from /templates. Two-column layout appears: editor form on left, live preview on right. The preview renders Handlebars template with Czech sample data (customer_name="Jan Novák", service_name="Stříh vlasů", booking_date=tomorrow, price=450 CZK). Email templates preview in iframe, SMS/push as plain text. Editing bodyTemplate updates preview in real-time.
result: skipped
reason: Same root cause as test 1-2 — pages not accessible (no sidebar nav, auth redirect)

### 4. Template Variable Reference Panel

expected: In the template editor page, a variable reference panel is visible showing available Handlebars variables: {{customer_name}}, {{service_name}}, {{booking_date}}, {{booking_time}}, {{employee_name}}, {{price}}, {{currency}}, {{company_name}}. Each variable has a copy-to-clipboard action. "Preview with custom data" button opens dialog to edit JSON test data.
result: skipped
reason: Same root cause as test 1-2 — pages not accessible (no sidebar nav, auth redirect)

### 5. Automation Rules List with Toggle

expected: Navigate to /automation in the dashboard. Page shows card grid of automation rules. Each card displays: rule name, trigger type (Czech label like "Nová rezervace"), delay (human-readable like "Okamžitě" or "2 hod"), action type (Czech label), isActive toggle switch. Toggle switch calls the API to enable/disable the rule. Edit button links to builder, Delete button shows confirmation. "Nová automatizace" button links to builder page.
result: skipped
reason: Same root cause as test 1-2 — pages not accessible (no sidebar nav, auth redirect)

### 6. Visual Automation Builder Canvas

expected: Navigate to /automation/builder. Full-screen React Flow canvas loads with controls and dotted background. Node palette on the left shows three draggable node types: Trigger (blue, lightning icon), Delay (amber, clock icon), Action (green, mail icon). Default new rule starts with one trigger node and one action node connected by an animated edge. Nodes are draggable on canvas. Zoom/pan controls visible.
result: skipped
reason: Same root cause as test 1-2 — pages not accessible (no sidebar nav, auth redirect)

### 7. Automation Builder Node Configuration

expected: In the visual builder, click on a Trigger node — dropdown shows 8 trigger types (booking_created, booking_confirmed, etc.) with Czech labels. Click on a Delay node — number input for value + unit selector (minutes/hours/days). Click on an Action node — action type selector (send_email/send_sms/send_push) and template picker dropdown that shows available templates filtered by matching channel. Top bar shows rule name input and save button.
result: skipped
reason: Same root cause as test 1-2 — pages not accessible (no sidebar nav, auth redirect)

### 8. Automation Execution Logs

expected: Navigate to /automation/logs. Data table shows automation execution history. Columns: rule name, status (color-coded badges: executed=green, failed=red, pending=yellow, skipped=gray), executed time, created time, error message (tooltip if present). Status filter dropdown works (all/pending/executed/failed/skipped). Pagination controls visible. Empty state shows "Zatím žádné logy" with icon.
result: skipped
reason: Same root cause as test 1-2 — pages not accessible (no sidebar nav, auth redirect)

### 9. Czech Default Email Templates

expected: Email template files exist in services/notification-worker/src/templates/email/ with Czech content. At minimum: booking-confirmation.hbs (contains "Potvrzení" or reservation-related Czech text), booking-reminder.hbs (contains "připomenutí" or "Váš termín se blíží"), review-request.hbs (contains review/hodnocení related Czech text). Layout template (layout.hbs) has ScheduleBox branded header with blue #3B82F6 color.
result: pass

### 10. Docker Compose Notification Worker Service

expected: docker/docker-compose.yml contains a notification-worker service definition. Service depends on postgres, redis, and rabbitmq with health check conditions. Environment variables include SMTP, Twilio, and VAPID settings with ${VAR:-default} syntax. .env.example documents all required notification environment variables with comments explaining each one.
result: pass

## Summary

total: 10
passed: 2
issues: 2
pending: 0
skipped: 6
skipped: 0

## Gaps

- truth: "Notification history page loads at /notifications with data table, filters, and Czech labels"
  status: failed
  reason: "User reported: there is no navigation for notification, if i put the link there, it gets me to login"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Notification/template/automation pages are accessible from dashboard sidebar navigation"
  status: failed
  reason: "User reported: no sidebar nav links for notifications, templates, or automation pages. Pages redirect to login when accessed directly."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
