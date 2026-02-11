---
phase: 07-notifications-automation
plan: 06
subsystem: notification-system
tags: [frontend, notifications, templates, automation, react-flow, visual-builder]
dependency_graph:
  requires: [Phase 07-04 API routes, Phase 04 design system, React Flow library]
  provides: [Notification history UI, Template management UI, Visual automation builder, Automation management UI]
  affects: [Admin notification management, Template customization workflow, Automation rule creation UX]
tech_stack:
  added: [@xyflow/react, handlebars, @radix-ui/react-switch]
  patterns: [React Flow visual builder, Handlebars client-side rendering, TanStack Query for data fetching, Custom node components]
key_files:
  created:
    - apps/web/app/[locale]/(dashboard)/notifications/page.tsx
    - apps/web/app/[locale]/(dashboard)/templates/page.tsx
    - apps/web/app/[locale]/(dashboard)/templates/[id]/page.tsx
    - apps/web/app/[locale]/(dashboard)/automation/page.tsx
    - apps/web/app/[locale]/(dashboard)/automation/builder/page.tsx
    - apps/web/app/[locale]/(dashboard)/automation/logs/page.tsx
    - apps/web/src/components/automation/TriggerNode.tsx
    - apps/web/src/components/automation/DelayNode.tsx
    - apps/web/src/components/automation/ActionNode.tsx
    - apps/web/src/components/automation/NodePalette.tsx
    - apps/web/src/components/ui/textarea.tsx
    - apps/web/src/components/ui/switch.tsx
  modified:
    - apps/web/tsconfig.json
    - apps/web/package.json
    - apps/web/app/api/v1/payments/[id]/refund/route.ts
    - apps/web/app/api/v1/payments/route.ts
    - apps/web/app/api/v1/webhooks/comgate/route.ts
decisions:
  - React Flow (@xyflow/react) chosen for visual automation builder (industry standard, excellent DX)
  - Handlebars rendering done client-side in template editor for live preview (lightweight, no backend needed)
  - Custom React Flow nodes with typed data interfaces for trigger, delay, and action configurations
  - Template editor uses iframe for email preview and plain text for SMS/push (security and rendering accuracy)
  - Builder converts visual nodes to structured JSON for API persistence (triggerType, delayMinutes, actionType, actionConfig)
  - Fixed payment event payloads to match Phase 07-01 updates (Rule 2 deviation - critical for event consistency)
  - Updated tsconfig paths to resolve both ./components and ./src/components (Rule 3 deviation - blocking component imports)
metrics:
  duration: 801s
  tasks_completed: 2
  files_created: 12
  files_modified: 5
  commits: 2
  completed_date: 2026-02-11
---

# Phase 7 Plan 06: Frontend Pages for Notifications, Templates, and Visual Automation Builder Summary

**One-liner:** Complete frontend UI for notification history tracking, template management with live preview, and drag-drop visual automation rule builder using React Flow.

## What Was Built

### Task 1: Notification History and Template Management Pages

**Notification History Page (`apps/web/app/[locale]/(dashboard)/notifications/page.tsx`):**
- Data table with notification delivery tracking
- Filters: channel (email/sms/push), status (pending/sent/delivered/failed/opened/clicked), date range (from/to)
- Pagination with page/limit controls
- Color-coded status badges: pending=yellow, sent=green, delivered=blue, failed=red, opened=purple, clicked=indigo
- Channel icons (Mail, MessageSquare, Bell) for visual identification
- Empty state with icon and helpful message
- Uses TanStack Query for data fetching with refetch on filter change
- All text in Czech language

**Template List Page (`apps/web/app/[locale]/(dashboard)/templates/page.tsx`):**
- Card grid layout showing all notification templates
- Each card shows: type (Czech label), channel icon, subject preview, isActive toggle, edit/delete buttons
- "Nová šablona" button opens create dialog
- Create form fields: type (select from 10 types), channel (radio: email/sms/push), subject (text input, disabled for sms/push), bodyTemplate (textarea), isActive (switch)
- POST to `/api/v1/notification-templates` on submit
- Type labels in Czech: booking_confirmation="Potvrzení rezervace", booking_reminder="Připomenutí", etc.
- Empty state for first-time users

**Template Editor Page (`apps/web/app/[locale]/(dashboard)/templates/[id]/page.tsx`):**
- Two-column layout: left = editor form, right = live preview
- Load template by ID from API
- Form fields: type selector, channel badge (read-only), subject (if email/push), bodyTemplate (textarea with monospace font), isActive toggle
- Live preview: render bodyTemplate with Handlebars client-side using sample data
- Sample data: customer_name="Jan Novák", service_name="Stříh vlasů", booking_date=tomorrow, booking_time="14:00", employee_name="Marie", price=450, currency="CZK", company_name="Krásný Salon"
- Email preview in iframe, SMS/push preview as plain text
- "Preview with custom data" button opens dialog to edit JSON test data
- Variable reference panel with copy-to-clipboard for available variables ({{customer_name}}, {{service_name}}, {{booking_date}}, etc.)
- Save button: PUT to API, Delete button with confirmation
- Back button returns to template list

**Additional UI Components:**
- `Textarea` component (shadcn/ui pattern) - standard textarea with styling
- `Switch` component (Radix UI primitive) - toggle switch for isActive fields

**Dependencies Installed:**
- `@xyflow/react` - React Flow for visual builder
- `handlebars` - Client-side template rendering
- `@radix-ui/react-switch` - Switch primitive for toggles

**Type-Check Verification:** All new pages pass TypeScript compilation (only pre-existing OAuth stub errors remain).

**Commit:** `3ebab31`

### Task 2: Visual Automation Builder with React Flow and Automation Management Pages

**Custom React Flow Node Components:**

**TriggerNode (`apps/web/src/components/automation/TriggerNode.tsx`):**
- Blue-bordered rounded rectangle with lightning bolt icon
- Dropdown selector for trigger type (8 options)
- Trigger options: booking_created, booking_confirmed, booking_completed, booking_cancelled, booking_no_show, payment_received, customer_created, review_received
- Czech labels for all trigger types
- One output handle (bottom) for connecting to next node
- Memoized component with onChange callback for state updates

**DelayNode (`apps/web/src/components/automation/DelayNode.tsx`):**
- Amber-bordered rounded rectangle with clock icon
- Number input for delay value + unit selector (minutes/hours/days)
- Converts to total minutes internally for API storage
- Default: 0 minutes (immediate execution)
- Input handle (top) + output handle (bottom)
- Auto-converts existing delayMinutes to appropriate unit for display

**ActionNode (`apps/web/src/components/automation/ActionNode.tsx`):**
- Green-bordered rounded rectangle with mail/message/bell icon (based on action type)
- Action type selector: send_email, send_sms, send_push
- Template picker dropdown: fetches templates from API, filters by channel matching action type
- Auto-selects first template if only one available
- Shows "Žádné šablony pro tento typ" if no templates exist for channel
- One input handle (top)
- Memoized component with onChange callback

**NodePalette (`apps/web/src/components/automation/NodePalette.tsx`):**
- Side panel with three draggable node types
- Visual cards for Trigger (blue), Delay (amber), Action (green)
- Each card shows icon, name, and description
- Uses HTML5 drag-and-drop API with 'application/reactflow' data type
- Includes usage instructions at bottom: "Jak na to: 1. Přetáhněte uzly na plátno, 2. Propojte je táhnutím z výstupů, 3. Nastavte parametry, 4. Uložte pravidlo"

**Automation Rules List Page (`apps/web/app/[locale]/(dashboard)/automation/page.tsx`):**
- Card grid layout showing all automation rules
- Each card shows: rule name, trigger type (Czech label), delay (human-readable: "Okamžitě", "5 min", "2 hod", "3 dní"), action type (Czech label), isActive toggle (calls /api/v1/automation/rules/{id}/toggle)
- Edit button: links to builder page with ruleId query param
- Delete button: confirmation dialog before DELETE API call
- "Nová automatizace" button: links to builder page
- Empty state: "Zatím žádná pravidla automatizace" with wand icon
- Fetch from GET `/api/v1/automation/rules`

**Visual Automation Builder Page (`apps/web/app/[locale]/(dashboard)/automation/builder/page.tsx`):**
- Full-screen React Flow canvas with Controls and Background (dots variant)
- Top bar: rule name input, save button, back button
- Node palette on left side (NodePalette component)
- Register custom nodeTypes: { trigger: TriggerNode, delay: DelayNode, action: ActionNode }
- Default new rule: starts with one trigger node and one action node connected by animated edge
- Editing mode: if ruleId in query params, load existing rule from API and convert to nodes/edges
  - triggerType → TriggerNode at {x:250, y:50}
  - If delayMinutes > 0 → DelayNode at {x:250, y:200}
  - actionType + actionConfig → ActionNode at {x:250, y:350 or y:200 if no delay}
  - Connect with animated edges
- Save handler: extracts data from nodes, validates (must have trigger + action), POST (create) or PUT (update) to API
- Drag-and-drop from palette: onDrop handler creates new node at mouse position, preserves onChange callbacks
- React Flow features: fitView on init, draggable nodes, connectable edges, zoom/pan controls
- Import React Flow styles: `import '@xyflow/react/dist/style.css'`

**Automation Execution Logs Page (`apps/web/app/[locale]/(dashboard)/automation/logs/page.tsx`):**
- Data table showing automation execution history
- Columns: rule name (from joined data), status (badge: executed=green, failed=red, pending=yellow, skipped=gray), executedAt, createdAt, errorMessage (tooltip if present)
- Filter by status dropdown (all/pending/executed/failed/skipped)
- Pagination controls (previous/next, page X of Y)
- Fetch from GET `/api/v1/automation/logs`
- Empty state: "Zatím žádné logy" with FileText icon

**Type-Check Verification:** All automation pages and components pass TypeScript compilation.

**Commit:** `7688374`

## Deviations from Plan

### Rule 2 (Auto-fix critical functionality)

**Fixed payment event payloads to match Phase 07-01 updates:**
- **Found during:** Task 1 type-check after creating notification pages
- **Issue:** Payment events in `apps/web/app/api/v1/payments/route.ts`, `apps/web/app/api/v1/payments/[id]/refund/route.ts`, and `apps/web/app/api/v1/webhooks/comgate/route.ts` were using old field names (`paidAt`, `gatewayTransactionId`, `refundAmount`) that didn't match Phase 07-01 event schema updates
- **Fix:** Updated to new field names: `completedAt` instead of `paidAt`, removed `gatewayTransactionId` from PaymentCompletedPayload, changed `refundAmount` to `amount` + `currency` in PaymentRefundedPayload, added `failedAt` to PaymentFailedPayload
- **Files modified:** 3 payment-related files
- **Rationale:** Event payload consistency is critical for cross-service event consumption. Phase 07-01 updated the event schemas, but payment code wasn't updated in sync. This would have caused runtime errors when notification workers tried to consume payment events.

### Rule 3 (Auto-fix blocking issues)

**Updated tsconfig paths to resolve both ./components and ./src/components:**
- **Found during:** Task 1 type-check after creating components
- **Issue:** TypeScript couldn't find `@/components/ui/textarea` and `@/components/ui/switch` because tsconfig paths only included `./components/*` but new components were in `./src/components/*`
- **Fix:** Updated `apps/web/tsconfig.json` paths to include both `./components/*` and `./src/components/*` for `@/components/*` alias
- **Files modified:** `apps/web/tsconfig.json`
- **Rationale:** Project has mixed component directory structure (some in `./components`, new ones in `./src/components`). TypeScript import resolution was blocking compilation of new pages. Adding both paths to tsconfig allows gradual migration without breaking existing imports.

**Added currency field to payment refund select query:**
- **Found during:** Task 1 type-check (payment event payload fix)
- **Issue:** Refund route was trying to access `payment.currency` but SELECT query didn't include currency field
- **Fix:** Added `currency: payments.currency` to select query in refund route
- **Files modified:** `apps/web/app/api/v1/payments/[id]/refund/route.ts`
- **Rationale:** PaymentRefundedPayload requires currency field (Phase 07-01 spec). SELECT query must include all fields used in event payload to prevent runtime null errors.

No architectural changes required (Rule 4). All other changes executed exactly as planned.

## Verification Results

### Type Checks
- ✅ PASSED: `pnpm --filter @schedulebox/web type-check` (0 errors in new files)
- Pre-existing OAuth stub errors remain (not related to this plan)

### Pattern Compliance
- ✅ All notification/template pages use TanStack Query for data fetching
- ✅ All pages use shadcn/ui components (Button, Card, Table, Badge, Select, Input, Dialog, Switch, Textarea)
- ✅ All pages use Czech language labels
- ✅ Template editor provides live preview with Handlebars rendering
- ✅ Variable reference panel with copy-to-clipboard
- ✅ React Flow builder uses custom node types with typed data interfaces
- ✅ Builder saves rule as structured JSON to API (triggerType, delayMinutes, actionType, actionConfig)
- ✅ Builder can load existing rules and display as nodes/edges
- ✅ All custom nodes use Handle components for connections
- ✅ Automation list has toggle functionality
- ✅ All status badges use color-coded scheme

### Functional Coverage
- ✅ Notification history page with filtering (channel, status, date range) and pagination
- ✅ Template list page with create dialog
- ✅ Template editor with live preview (iframe for email, plain text for SMS/push)
- ✅ Template editor with sample data and custom data dialog
- ✅ Variable reference panel with available variables
- ✅ Automation rules list with toggle, edit, delete
- ✅ Visual automation builder with drag-drop nodes
- ✅ Builder converts nodes to rule JSON
- ✅ Builder loads existing rules as nodes
- ✅ Automation logs with status filtering and pagination

## Dependencies Satisfied

**Input Dependencies:**
- Phase 07-04: Notification template API, Notification history API, Automation rules API, Automation logs API
- Phase 04: shadcn/ui design system, Button, Card, Table, Badge, Select, Input, Dialog components
- React Flow: @xyflow/react library for visual builder

**Output Provided:**
- Notification history UI for delivery status tracking (NOTIF-04)
- Template editor with live preview and variable reference (NOTIF-04)
- Visual automation builder for creating rules via drag-drop (NOTIF-08)
- Automation rules list with activate/deactivate toggle (NOTIF-08)
- Automation execution logs for debugging (NOTIF-08)
- Complete frontend for notification and automation management

## Files Created (12)

| File | Lines | Purpose |
|------|-------|---------|
| apps/web/app/[locale]/(dashboard)/notifications/page.tsx | 248 | Notification history page with filtering and pagination |
| apps/web/app/[locale]/(dashboard)/templates/page.tsx | 330 | Template list page with create dialog |
| apps/web/app/[locale]/(dashboard)/templates/[id]/page.tsx | 408 | Template editor with live Handlebars preview and variable reference |
| apps/web/app/[locale]/(dashboard)/automation/page.tsx | 212 | Automation rules list with toggle, edit, delete |
| apps/web/app/[locale]/(dashboard)/automation/builder/page.tsx | 378 | Visual automation builder with React Flow |
| apps/web/app/[locale]/(dashboard)/automation/logs/page.tsx | 166 | Automation execution logs with filtering |
| apps/web/src/components/automation/TriggerNode.tsx | 73 | React Flow custom node for trigger selection |
| apps/web/src/components/automation/DelayNode.tsx | 116 | React Flow custom node for delay configuration |
| apps/web/src/components/automation/ActionNode.tsx | 162 | React Flow custom node for action selection with template picker |
| apps/web/src/components/automation/NodePalette.tsx | 60 | Side panel for dragging nodes onto canvas |
| apps/web/src/components/ui/textarea.tsx | 24 | shadcn/ui Textarea component |
| apps/web/src/components/ui/switch.tsx | 30 | shadcn/ui Switch component (Radix UI primitive) |

## Files Modified (5)

| File | Changes | Reason |
|------|---------|--------|
| apps/web/package.json | Added @xyflow/react, handlebars, @radix-ui/react-switch | Dependencies for React Flow builder and template rendering |
| apps/web/tsconfig.json | Updated paths to include both ./components and ./src/components | Fix TypeScript import resolution for mixed directory structure (Rule 3) |
| apps/web/app/api/v1/payments/[id]/refund/route.ts | Added currency to SELECT, updated PaymentRefundedEvent payload | Match Phase 07-01 event schema (Rule 2), add missing currency field (Rule 3) |
| apps/web/app/api/v1/payments/route.ts | Updated PaymentCompletedEvent payload (completedAt) | Match Phase 07-01 event schema (Rule 2) |
| apps/web/app/api/v1/webhooks/comgate/route.ts | Updated PaymentCompletedEvent and PaymentFailedEvent payloads | Match Phase 07-01 event schema (Rule 2) |

## Key Technical Decisions

1. **React Flow for visual builder** - Industry-standard library for node-based UIs. Excellent DX with TypeScript support, custom node components, and drag-drop API. Proven in production (Retool, n8n, etc.).

2. **Client-side Handlebars rendering** - Template preview happens in browser using Handlebars.compile(). Lightweight (no backend needed), instant feedback for admins. Sample data auto-populated for common variables.

3. **Custom React Flow nodes with typed data** - TriggerNodeData, DelayNodeData, ActionNodeData interfaces extend Record<string, unknown> to satisfy React Flow constraints while maintaining type safety. Each node has onChange callback for state updates.

4. **Iframe for email preview** - Isolated rendering context prevents CSS leakage from admin UI to email template. Plain text div for SMS/push (no HTML rendering needed).

5. **Builder converts nodes to JSON** - Extract data from nodes array, validate presence of trigger + action, convert to API format (triggerType, delayMinutes, actionType, actionConfig). Reverse process for loading: API JSON → nodes/edges.

6. **Payment event payload fixes (Rule 2)** - Phase 07-01 updated event schemas but payment code wasn't synced. Fixed to prevent runtime errors in notification workers. Critical for event-driven architecture consistency.

7. **Tsconfig path resolution (Rule 3)** - Project has mixed component structure. Updated tsconfig to resolve both paths, enabling gradual migration without breaking existing imports. Blocking issue for new component imports.

8. **Czech language throughout** - All UI labels, trigger names, action names, status labels, error messages, empty states, help text in Czech. Target market = Czech/Slovak SMBs.

9. **Color-coded status badges** - Consistent color scheme across notification history and automation logs: pending=yellow, executed/sent=green, delivered=blue, failed=red, opened=purple, clicked=indigo, skipped=gray.

10. **TanStack Query for all data fetching** - Consistent pattern across all pages. Automatic refetch on filter changes, pagination state management, loading states, error handling.

## Self-Check: PASSED ✅

**Files Created:**
- ✅ FOUND: apps/web/app/[locale]/(dashboard)/notifications/page.tsx
- ✅ FOUND: apps/web/app/[locale]/(dashboard)/templates/page.tsx
- ✅ FOUND: apps/web/app/[locale]/(dashboard)/templates/[id]/page.tsx
- ✅ FOUND: apps/web/app/[locale]/(dashboard)/automation/page.tsx
- ✅ FOUND: apps/web/app/[locale]/(dashboard)/automation/builder/page.tsx
- ✅ FOUND: apps/web/app/[locale]/(dashboard)/automation/logs/page.tsx
- ✅ FOUND: apps/web/src/components/automation/TriggerNode.tsx
- ✅ FOUND: apps/web/src/components/automation/DelayNode.tsx
- ✅ FOUND: apps/web/src/components/automation/ActionNode.tsx
- ✅ FOUND: apps/web/src/components/automation/NodePalette.tsx
- ✅ FOUND: apps/web/src/components/ui/textarea.tsx
- ✅ FOUND: apps/web/src/components/ui/switch.tsx

**Commits:**
- ✅ FOUND: 3ebab31 (Task 1: Notification history and template management pages)
- ✅ FOUND: 7688374 (Task 2: Visual automation builder and management pages)

**Type Checks:**
- ✅ PASSED: @schedulebox/web type-check (0 errors in new files, only pre-existing OAuth stubs)

**Functionality:**
- ✅ Notification history with filtering and pagination
- ✅ Template list with create dialog
- ✅ Template editor with live preview and variable reference
- ✅ Automation rules list with toggle
- ✅ Visual builder with React Flow
- ✅ Builder saves rule as JSON
- ✅ Builder loads existing rules as nodes
- ✅ Automation logs with filtering

## Next Steps

Phase 7 Plan 07 (remaining notification features) or Phase 9 (Loyalty Program) can now proceed:
- Notification UI ready for business owners to manage templates and view delivery status
- Automation UI ready for creating rules without code
- Template editor ready for customizing email/SMS content
- Visual builder ready for drag-drop workflow creation
- All Czech language labels in place for target market

Frontend developers can now:
- Create additional notification templates via UI
- View real-time notification delivery status
- Build automation workflows visually
- Debug automation execution via logs UI

---

**Plan Duration:** 801 seconds (13 minutes 21 seconds)
**Completed:** 2026-02-11
**Commits:** 3ebab31, 7688374
