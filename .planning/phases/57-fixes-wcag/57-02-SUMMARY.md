---
phase: 57-fixes-wcag
plan: "02"
subsystem: calendar, services, onboarding, security
tags: [drag-resize, drag-reorder, dnd-kit, onboarding, pii-encryption]
dependency_graph:
  requires: [57-01]
  provides: [useResizeBooking, ServiceListSortable, TestBookingStep, resize-api, reorder-api]
  affects: [BookingCalendar, services-page, onboarding-wizard]
tech_stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"]
  patterns: [optimistic-mutation, sortable-context, drag-handle]
key_files:
  created:
    - apps/web/hooks/use-resize-booking.ts
    - apps/web/app/api/v1/bookings/[id]/resize/route.ts
    - apps/web/app/api/v1/services/reorder/route.ts
    - apps/web/components/services/service-list-sortable.tsx
    - apps/web/components/onboarding/steps/test-booking-step.tsx
  modified:
    - apps/web/components/onboarding/setup-wizard.tsx
    - apps/web/components/onboarding/steps/share-link-step.tsx
    - apps/web/components/onboarding/wizard-step-indicator.tsx
    - apps/web/stores/onboarding-wizard.store.ts
    - apps/web/lib/security/encryption.ts
    - apps/web/messages/cs.json
    - apps/web/messages/en.json
    - apps/web/messages/sk.json
decisions:
  - Used @dnd-kit for service reorder (MIT, widely adopted, accessible)
  - Added step 5 to onboarding wizard (test booking) rather than step 6 since wizard had 4 steps
  - Used CheckSquare/Square icons instead of Checkbox component (not present in project)
metrics:
  completed: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 57 Plan 02: Calendar Resize, Service Reorder, Onboarding Test Booking, PII Encryption Verify

Calendar drag-to-resize with PATCH endpoint, @dnd-kit service reorder with transactional sort_order persist, onboarding test booking step, and AES-256-GCM PII encryption verification.

## What Was Done

### Task 1: Calendar drag-to-resize + Service drag-reorder (FIX-04, FIX-05)

**Calendar resize:**
- Created `useResizeBooking` hook following the exact pattern of `useRescheduleBooking` (optimistic updates, rollback, toast notifications)
- Created PATCH `/api/v1/bookings/:id/resize` endpoint with tenant isolation, status validation (pending/confirmed only), and end-time-after-start-time check
- BookingCalendar already had `resizable` prop and `onEventResize` wired from 57-01; this plan provides the implementation files

**Service reorder:**
- Installed @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- Created PATCH `/api/v1/services/reorder` endpoint accepting ordered UUIDs, validates company ownership, updates sort_order in transaction
- Created `ServiceListSortable` component with drag handles (GripVertical), pointer and keyboard sensors, optimistic local reorder with API persist
- Services page already used ServiceListSortable from 57-01; this plan provides the component
- Added reorder.success/error translations for cs, en, sk

### Task 2: Onboarding test booking + PII encryption verify (FIX-06, FIX-08)

**Onboarding test booking:**
- Extended onboarding wizard from 4 steps to 5 (company, service, hours, share, test booking)
- Updated OnboardingStep type, wizard-step-indicator, and store to support 5 steps
- ShareLinkStep now advances to step 5 instead of completing (moved completion to step 5)
- Created TestBookingStep with: public booking URL, open-in-new-tab button, optional done checkbox, complete button
- Added testBooking translations for cs, en, sk

**PII encryption verification:**
- Reviewed encryption.ts: confirmed AES-256-GCM with 12-byte random IV, 16-byte auth tag, SHA-256 key derivation
- Added verification comment documenting FIX-08 compliance
- Module was already correct and complete (no fixes needed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Checkbox component missing**
- Found during: Task 2
- Issue: @/components/ui/checkbox does not exist in the project
- Fix: Used CheckSquare/Square lucide-react icons as toggle instead
- Files modified: apps/web/components/onboarding/steps/test-booking-step.tsx

### Implementation Notes

- Plan referenced "step 6" but wizard had 4 steps, so test booking became step 5
- BookingCalendar.tsx and services/page.tsx already contained the consumer code from plan 57-01; this plan created the missing implementation files they reference
- Pre-existing TypeScript error in automation/execute/route.ts (AutomationPushResult type) is out of scope

## Commits

| Hash | Description |
|------|-------------|
| 37b0dbd | feat(web): add calendar resize, service reorder, onboarding test booking, verify PII encryption |
