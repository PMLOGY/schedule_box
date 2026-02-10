# SEGMENT: FRONTEND

**Terminal Role:** UI components, pages, state management, real-time, i18n, accessibility
**Documentation Reference:** Part V (Sections 19-23), Part XIII (Sections 49-54) of `schedulebox_complete_documentation.md`

---

## Your Scope

You are responsible for:
1. **Design system** (colors, typography, spacing)
2. **32+ UI components** (atoms, molecules, organisms)
3. **All pages/screens** (dashboard, booking, customers, services, employees, etc.)
4. **State management** (Zustand stores, React Query hooks)
5. **Real-time** (WebSocket integration via Socket.io)
6. **i18n** (cs, sk, en using next-intl)
7. **Accessibility** (WCAG 2.1 AA)
8. **Embeddable booking widget** (separate build)
9. **Public booking page**

You are NOT responsible for: API implementation, database, Docker/K8s, CI/CD.

---

## Directory Structure

### Main App
```
apps/web/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth layout group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (dashboard)/            # Dashboard layout group (authenticated)
│   │   │   ├── layout.tsx          # Sidebar + Header
│   │   │   ├── page.tsx            # Dashboard home
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx        # Calendar view
│   │   │   │   └── [id]/page.tsx   # Booking detail
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx        # Customer list
│   │   │   │   └── [id]/page.tsx   # Customer detail
│   │   │   ├── services/page.tsx   # Service management
│   │   │   ├── employees/
│   │   │   │   ├── page.tsx        # Employee list
│   │   │   │   └── [id]/page.tsx   # Employee detail + schedule
│   │   │   ├── payments/page.tsx   # Payment history
│   │   │   ├── loyalty/page.tsx    # Loyalty program management
│   │   │   ├── coupons/page.tsx    # Coupon management
│   │   │   ├── reviews/page.tsx    # Review management
│   │   │   ├── automation/page.tsx # Automation rules
│   │   │   ├── analytics/page.tsx  # Analytics dashboard
│   │   │   └── settings/
│   │   │       ├── page.tsx        # Company settings
│   │   │       ├── team/page.tsx
│   │   │       ├── payments/page.tsx
│   │   │       ├── notifications/page.tsx
│   │   │       ├── api-keys/page.tsx
│   │   │       └── widget/page.tsx
│   │   ├── booking/                # Public booking pages
│   │   │   └── [slug]/page.tsx     # Public booking for company
│   │   ├── marketplace/page.tsx    # Public marketplace
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Global styles + Tailwind
│   ├── components/                 # React components
│   │   ├── ui/                     # Atoms (shadcn/ui based)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── date-picker.tsx
│   │   │   ├── time-picker.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── toggle.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── loading-spinner.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── data-table.tsx
│   │   │   └── stat-card.tsx
│   │   ├── booking/                # Booking-specific
│   │   │   ├── calendar.tsx        # FullCalendar wrapper
│   │   │   ├── booking-form.tsx    # 4-step stepper
│   │   │   ├── booking-detail.tsx
│   │   │   ├── booking-card.tsx
│   │   │   └── time-slot-picker.tsx
│   │   ├── customer/
│   │   │   ├── customer-form.tsx
│   │   │   ├── customer-card.tsx
│   │   │   └── customer-tags.tsx
│   │   ├── employee/
│   │   │   ├── employee-form.tsx
│   │   │   └── working-hours-editor.tsx
│   │   ├── payment/
│   │   │   ├── payment-summary.tsx
│   │   │   └── qr-payment.tsx
│   │   ├── loyalty/
│   │   │   ├── loyalty-card.tsx
│   │   │   └── rewards-catalog.tsx
│   │   ├── analytics/
│   │   │   ├── dashboard-grid.tsx
│   │   │   └── chart-widgets.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   └── mobile-nav.tsx
│   │   └── widget/                 # Embeddable widget
│   │       └── booking-widget.tsx
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-bookings.ts
│   │   ├── use-customers.ts
│   │   ├── use-services.ts
│   │   ├── use-employees.ts
│   │   ├── use-availability.ts
│   │   ├── use-websocket.ts
│   │   └── use-debounce.ts
│   ├── stores/                     # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── ui.store.ts
│   │   └── calendar.store.ts
│   ├── lib/                        # Frontend utilities
│   │   ├── api-client.ts           # Axios/fetch wrapper with auth
│   │   ├── query-client.ts         # React Query config
│   │   └── websocket.ts            # Socket.io client
│   ├── messages/                   # i18n translations
│   │   ├── cs.json
│   │   ├── sk.json
│   │   └── en.json
│   └── styles/                     # Additional styles
│       └── calendar.css            # FullCalendar overrides
```

### UI Package (shared components)
```
packages/ui/
├── src/
│   ├── components/     # Reusable shadcn/ui primitives
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## Design System

### Colors
```typescript
const colors = {
  primary:   { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 900: '#1E3A5F' },
  secondary: { 50: '#F0FDF4', 500: '#22C55E', 700: '#15803D' },
  danger:    { 50: '#FEF2F2', 500: '#EF4444', 700: '#B91C1C' },
  warning:   { 50: '#FFFBEB', 500: '#F59E0B', 700: '#B45309' },
  neutral:   { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 500: '#6B7280', 700: '#374151', 900: '#111827' }
};
```

### Typography
- **Font:** Inter (system fallback: -apple-system, BlinkMacSystemFont, sans-serif)
- H1: 30px/bold, H2: 24px/semibold, H3: 20px/semibold, H4: 18px/medium
- Body: 16px, Small: 14px, XS: 12px

### Spacing & Layout
- 4px grid system (4, 8, 12, 16, 24, 32, 48, 64)
- Breakpoints: sm: 640px, md: 768px, lg: 1024px, xl: 1280px
- Max content width: 1280px
- Sidebar width: 256px (collapsed: 64px)

---

## 32+ Components Specification

### Atoms (UI Primitives)
| Component | Key Props | Library |
|---|---|---|
| Button | variant (primary/secondary/danger/ghost/outline), size, isLoading | shadcn/ui |
| Input | type, label, error, helperText, leftIcon, rightIcon | shadcn/ui |
| Select | options, searchable, multiple | shadcn/ui |
| DatePicker | value, minDate, maxDate, locale='cs' | react-day-picker |
| TimePicker | value, step, availableSlots | Custom |
| Textarea | rows, maxLength | shadcn/ui |
| Checkbox / Toggle | checked, label | shadcn/ui |
| Badge | variant (success/warning/danger/info) | shadcn/ui |
| Avatar | src, name (initials fallback), online indicator | Custom |
| Modal | isOpen, onClose, title, size | shadcn/ui Dialog |
| Toast | type, title, message, duration=5000ms | sonner |
| EmptyState | icon, title, description, action | Custom |
| Spinner / Skeleton | size / variant (text/circle/rect) | Custom |
| DataTable | columns, data, pagination, sorting, filters | @tanstack/react-table |
| StatCard | label, value, trend, icon | Custom |

### Molecules / Organisms
| Component | Description | API Calls |
|---|---|---|
| Calendar | FullCalendar wrapper, day/week/month, drag & drop | GET /bookings, GET /employees |
| BookingForm | 4-step stepper (service→date→customer→confirm) | GET /services, GET /availability, POST /bookings |
| BookingDetail | Full booking info + actions (confirm, cancel, etc.) | GET /bookings/:id, POST /bookings/:id/confirm |
| CustomerForm | Customer CRUD form with tag selector | POST/PUT /customers |
| CustomerCard | Customer summary with stats | - |
| EmployeeForm | Employee CRUD with service assignment | POST/PUT /employees |
| WorkingHoursEditor | Week grid editor for employee schedules | PUT /employees/:id/working-hours |
| TimeSlotPicker | Visual slot grid for date/employee | GET /availability |
| PaymentSummary | Price, coupons, gift cards, total | POST /coupons/validate |
| QRPayment | QR code display for on-site payment | POST /payments/qrcomat/generate |
| LoyaltyCard | Customer's loyalty card with points/tier | GET /loyalty/cards/:id |
| RewardsCatalog | Available rewards grid | GET /loyalty/rewards |
| DashboardGrid | Dashboard widgets layout | GET /analytics/dashboard |
| ChartWidgets | Revenue, bookings, customers charts | GET /analytics/* |
| Sidebar | Navigation with collapsible sections | - |
| Header | User menu, notifications bell, search | - |
| BookingWidget | Embeddable widget for external sites | GET /widget/config/:slug |

---

## State Management

### Zustand Stores
```typescript
// AuthStore: user, company, tokens, login/logout
// UIStore: sidebar, modals, toasts
// CalendarStore: currentDate, view, selectedEmployees
```

### React Query Hooks
```typescript
// useBookings(filters)    → GET /bookings
// useBooking(id)          → GET /bookings/:id
// useCreateBooking()      → POST /bookings (mutation)
// useCustomers(filters)   → GET /customers
// useServices()           → GET /services
// useEmployees()          → GET /employees
// useAvailability(params) → GET /availability
// useDashboard(period)    → GET /analytics/dashboard
```

---

## Navigation Structure

### Sidebar Menu
```
Dashboard         /
Bookings          /bookings (Calendar view)
Customers         /customers
  └ Customer Detail  /customers/:id
Services          /services
Employees         /employees
  └ Employee Detail  /employees/:id
Payments          /payments
Loyalty           /loyalty
Coupons           /coupons
Reviews           /reviews
Automation        /automation
Analytics         /analytics
Settings
  ├ Company       /settings
  ├ Team          /settings/team
  ├ Payments      /settings/payments
  ├ Notifications /settings/notifications
  ├ API Keys      /settings/api-keys
  └ Widget        /settings/widget
```

---

## WebSocket Integration

### Events to Handle
```typescript
'booking:created'   → invalidate bookings query, show toast
'booking:updated'   → invalidate bookings query
'booking:cancelled' → invalidate bookings + availability queries
'payment:completed' → invalidate payments query, show toast
'notification:new'  → show notification toast, update bell badge
'calendar:refresh'  → invalidate all calendar data
```

---

## i18n (next-intl)

### Supported Languages
- `cs` (Czech) — default
- `sk` (Slovak)
- `en` (English)

### Translation File Structure
```json
{
  "booking": { "create": "...", "cancel": "...", "status": { "pending": "...", ... } },
  "customer": { ... },
  "common": { "save": "...", "delete": "...", "search": "...", "loading": "..." },
  "errors": { "required": "...", "invalid_email": "...", ... },
  "navigation": { "dashboard": "...", "bookings": "...", ... }
}
```

---

## Phase-by-Phase Tasks

### Phase 1: Setup
- [ ] Initialize Next.js 14 with App Router
- [ ] Configure Tailwind CSS with custom design tokens
- [ ] Install and configure shadcn/ui
- [ ] Set up next-intl for i18n
- [ ] Set up React Query provider
- [ ] Set up Zustand stores (auth, ui, calendar)
- [ ] Create API client (axios/fetch with interceptors)

### Phase 4: Frontend Shell
- [ ] Root layout (providers, fonts, global styles)
- [ ] Auth layout + Login page
- [ ] Register page + Onboarding wizard
- [ ] Dashboard layout (Sidebar + Header)
- [ ] Dashboard page (stat cards, quick actions)
- [ ] All atom components (Button, Input, Select, Modal, etc.)
- [ ] DataTable component with sorting/pagination/filters
- [ ] EmptyState, LoadingSpinner, Skeleton

### Phase 5: Booking UI
- [ ] Calendar component (FullCalendar with resource view)
- [ ] BookingForm (4-step stepper)
- [ ] TimeSlotPicker
- [ ] BookingDetail with status actions
- [ ] Availability hooks

### Phase 6: Payment UI
- [ ] PaymentSummary component
- [ ] QRPayment component
- [ ] Comgate redirect handling
- [ ] Payment history page

### Phase 8: CRM UI
- [ ] Customer list page with DataTable
- [ ] CustomerForm + CustomerCard
- [ ] Customer detail page (bookings history, tags, loyalty)
- [ ] Tag management
- [ ] Coupon management page
- [ ] Service management page
- [ ] Employee management page + WorkingHoursEditor

### Phase 9: Loyalty UI
- [ ] Loyalty program settings page
- [ ] LoyaltyCard component
- [ ] RewardsCatalog
- [ ] Points transaction history

### Phase 12: Advanced UI
- [ ] Review management page
- [ ] Analytics dashboard (charts)
- [ ] Embeddable booking widget (separate build)
- [ ] Public booking page
- [ ] Settings pages (company, team, payments, notifications, API keys, widget)
- [ ] Automation rule builder

### Phase 13: Polish
- [ ] Complete i18n for all 3 languages
- [ ] WCAG 2.1 AA audit and fixes
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Lighthouse score >90
- [ ] Mobile responsive design audit
