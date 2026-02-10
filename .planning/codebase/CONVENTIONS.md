# Coding Conventions

**Analysis Date:** 2026-02-10

## Naming Patterns

**Files:**
- TypeScript/JavaScript: `camelCase.ts` for implementation, `.test.ts` / `.spec.ts` for tests
- Database schemas: `snake_case` (e.g., `bookings.ts`, `loyalty_cards.ts`)
- Drizzle schema exports: `camelCase` (e.g., `bookingsTable`, `loyaltyCardsTable`)
- API route files: `route.ts` in directory matching endpoint path (e.g., `apps/web/src/app/api/v1/bookings/route.ts`)
- React components: `PascalCase.tsx` (e.g., `BookingForm.tsx`, `CustomerCard.tsx`)

**Functions:**
- Service methods: `camelCase` with action verbs (e.g., `createBooking()`, `updateCustomer()`, `validateCoupon()`)
- API handlers: `async (req: NextRequest, context: { params }) => Response`
- Event publishers: `publishEvent(type, data)` using CloudEvents format
- Middleware: `withAuth()`, `withRole()`, `withPermission()`, `requireFeature()`
- React hooks: `use` prefix (e.g., `useBookings()`, `useAvailability()`, `useAuth()`)

**Variables:**
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT_MS`)
- Regular variables: `camelCase` (e.g., `companyId`, `startTime`, `totalBookings`)
- Boolean prefixes: `is`, `has`, `can` (e.g., `isActive`, `hasPermission`, `canEdit`)
- Booleans for absence: use `isEmpty`, `isNull`, or explicit `!hasValue`

**Types:**
- TypeScript interfaces: `PascalCase`, exported from `packages/shared/src/types/`
- Zod schemas: `camelCase` with `Schema` suffix (e.g., `bookingCreateSchema`, `customerUpdateSchema`)
- Database relations: `camelCase` with `Relations` suffix (e.g., `bookingsRelations`, `loyaltyCardsRelations`)
- Enums: `PascalCase` keys, `UPPER_SNAKE_CASE` values (e.g., `enum BookingStatus { PENDING = 'pending', CONFIRMED = 'confirmed' }`)
- Generic types: Single uppercase letter or descriptive name (e.g., `T`, `ApiResponse<T>`)

## Code Style

**Formatting:**
- Tool: Prettier with ESLint
- Line length: 100 characters (configured in `.prettierrc`)
- Indentation: 2 spaces
- Quotes: Single quotes (`'`) for strings, backticks for templates
- Semicolons: Required (enforced by ESLint)
- Trailing commas: ES5 mode (allowed in objects/arrays, not in function params)

**Linting:**
- Tool: ESLint with TypeScript plugin
- Config: `.eslintrc.json` or `eslint.config.js` (Next.js 14 compatible)
- Key rules:
  - `no-console`: warn in production, off in development
  - `@typescript-eslint/explicit-return-types`: warn (encourage explicit types on exports)
  - `@typescript-eslint/no-explicit-any`: error (use `unknown` instead)
  - `no-unused-vars`: error
  - `prefer-const`: error
  - `eqeqeq`: error (require === and !==)
  - Custom: `sortImports` rule (sort imports in groups)

**Spacing:**
- One blank line between imports and code
- One blank line between function definitions
- Two blank lines between class/interface definitions and functions
- No trailing whitespace

## Import Organization

**Order:**
1. Absolute imports (React, Next.js, third-party libraries)
2. Type imports (TypeScript interfaces)
3. Path aliases (`@schedulebox/*`)
4. Relative imports (`./`, `../`)

**Pattern:**
```typescript
// 1. React & Framework
import React, { useState, useCallback } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { useQuery } from '@tanstack/react-query';

// 2. Types
import type { Booking, Customer } from '@schedulebox/shared';

// 3. Aliases
import { bookingsTable } from '@schedulebox/database';
import { bookingCreateSchema } from '@schedulebox/shared';
import { publishEvent } from '@schedulebox/events';

// 4. Relative
import { formatDate } from './utils/date';
import BookingCard from '../components/BookingCard';
```

**Path Aliases:**
- `@schedulebox/database` → `packages/database/src`
- `@schedulebox/shared` → `packages/shared/src` (types, schemas, utilities)
- `@schedulebox/events` → `packages/events/src` (event publisher/consumer)
- `@schedulebox/ui` → `packages/ui/src` (reusable UI components)
- `@/` → `apps/web/src` (current app root)
- `@/components` → `apps/web/src/components`
- `@/lib` → `apps/web/src/lib`

## Error Handling

**Patterns:**

Standard error response format across all APIs:
```typescript
// Error response (all endpoints)
{
  error: string,           // e.g., 'BOOKING_NOT_FOUND'
  code: string,            // uppercase with underscores
  message: string,         // user-friendly message
  details?: Record<string, string[]> // field-level validation errors
}
```

**AppError class** (used in all services):
```typescript
// Located in: packages/shared/src/utils/errors.ts
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, string[]>
  ) {
    super(message);
  }
}

// Usage:
throw new AppError(
  'BOOKING_NOT_FOUND',
  'Booking with this ID does not exist',
  404
);

throw new AppError(
  'VALIDATION_ERROR',
  'Invalid input',
  400,
  { email: ['Invalid email format'], phone: ['Phone number too short'] }
);
```

**Error handling in API routes:**
```typescript
// apps/web/src/app/api/v1/[endpoint]/route.ts
try {
  const result = await service.doSomething(input);
  return NextResponse.json({ data: result }, { status: 200 });
} catch (err) {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: err.code,
        code: err.code,
        message: err.message,
        details: err.details
      },
      { status: err.statusCode }
    );
  }
  // Log unexpected errors
  console.error('Unexpected error:', err);
  return NextResponse.json(
    { error: 'INTERNAL_SERVER_ERROR', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    { status: 500 }
  );
}
```

**Database operations** (with Drizzle):
```typescript
// Pattern: SELECT FOR UPDATE for critical operations
const booking = await db
  .select()
  .from(bookingsTable)
  .where(eq(bookingsTable.id, bookingId))
  .for('update');

if (!booking) {
  throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404);
}
```

## Logging

**Framework:** `console` object (structured logs via Winston or Pino in production)

**Patterns:**
```typescript
// Development: use console
console.log('[INFO]', 'Booking created', { bookingId, customerId, companyId });
console.warn('[WARN]', 'AI fallback triggered', { reason: 'timeout', model: 'no-show' });
console.error('[ERROR]', 'Payment failed', { error: err.message, paymentId });

// Production: use structured logging
logger.info('Booking created', {
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'booking-service',
  traceId: req.headers.get('x-trace-id'),
  companyId,
  userId,
  message: 'Booking created successfully',
  bookingId,
  customerId,
  duration_ms: Date.now() - startTime
});
```

**When to log:**
- ✅ API entry points (method, path, company_id)
- ✅ Business logic transitions (booking.created, payment.completed)
- ✅ External API calls (Comgate, OpenAI, Zoom)
- ✅ Database operations (SELECT, INSERT, UPDATE for important entities)
- ✅ Error conditions (with stack trace)
- ✅ Performance metrics (duration > 1000ms)
- ❌ Passwords, API keys, sensitive data
- ❌ Request/response bodies in production (security risk)

**Log levels:**
- `debug`: Low-level details (loop iterations, cache hits)
- `info`: Application events (request received, resource created)
- `warn`: Degraded state (fallback triggered, rate limit approaching)
- `error`: Recoverable failures (retry pending, circuit breaker open)
- `fatal`: Unrecoverable (database connection lost, cannot start)

## Comments

**When to comment:**
- Complex business logic (especially around booking/payment flows)
- Non-obvious algorithmic choices
- Workarounds for bugs/limitations with ticket reference (#123)
- Important security/performance considerations
- TODO/FIXME with context

**JSDoc/TSDoc:**
- Use for exported functions, types, and classes
- Include `@param`, `@returns`, `@throws` for clarity

```typescript
/**
 * Create a booking with automatic no-show prediction.
 *
 * @param input - Booking creation input (validated with bookingCreateSchema)
 * @param companyId - Company (tenant) ID for RLS
 * @returns Created booking with AI prediction score
 * @throws AppError with code BOOKING_CONFLICT if time slot is taken
 * @throws AppError with code AI_UNAVAILABLE if prediction service fails (fallback: default 0.15)
 *
 * @example
 * const booking = await createBooking({
 *   serviceId: 5,
 *   customerId: 42,
 *   startTime: new Date('2026-02-15T14:00:00Z')
 * }, companyId);
 */
export async function createBooking(
  input: z.infer<typeof bookingCreateSchema>,
  companyId: number
): Promise<BookingWithPrediction> {
  // Implementation...
}
```

**Inline comments:**
- Keep brief and explain "why", not "what"
- Bad: `// loop through bookings` (obvious from code)
- Good: `// exclude cancelled to avoid double-counting in capacity check`

## Function Design

**Size:**
- Target: <50 lines per function
- Max: <100 lines (refactor beyond this)
- Service layer functions should focus on single responsibility

**Parameters:**
- Max 3-4 positional parameters (use object for more)
- First param: input data (Zod-validated)
- Second param: context (companyId, userId, etc.)
- Third param: optional dependencies (logger, cache)

```typescript
// ✅ Good
async function createBooking(
  input: z.infer<typeof bookingCreateSchema>,
  context: { companyId: number; userId: number }
): Promise<Booking> { }

// ❌ Bad
async function createBooking(
  serviceId: number,
  customerId: number,
  startTime: Date,
  employeeId?: number,
  notes?: string,
  couponCode?: string
): Promise<Booking> { }
```

**Return values:**
- Always specify return type explicitly (no implicit `any`)
- Return DTO/API response format for APIs
- Return domain entity for services
- Use `null` for "not found" (not `undefined`)
- Use `void` only for side effects with no return

```typescript
// ✅ Good
async function getBooking(id: number, companyId: number): Promise<Booking | null> {
  // returns null if not found
}

async function updateBooking(
  id: number,
  updates: Partial<Booking>,
  companyId: number
): Promise<Booking> {
  // throws AppError if not found (not null)
}
```

## Module Design

**Exports:**
- Use named exports for functions, types, constants
- Default export only for components (React.FC)
- Export type (not value) with `export type`

```typescript
// ✅ Good: src/lib/services/booking.service.ts
export async function createBooking(input, context) { }
export async function getBooking(id, companyId) { }
export type CreateBookingInput = z.infer<typeof bookingCreateSchema>;

// ✅ Good: src/components/BookingForm.tsx
export default function BookingForm({ onSubmit }) { }

// ❌ Bad: mixing default + named exports
export default async function createBooking() { }
export const getBooking = async () => { };
```

**Barrel files:**
- Use for organizing related exports (`index.ts`)
- Location: `src/lib/services/index.ts`, `src/components/index.ts`

```typescript
// packages/shared/src/types/index.ts
export type { Booking, BookingStatus } from './booking';
export type { Customer, CustomerCreate } from './customer';
export type { ApiResponse, PaginatedResponse } from './common';

// packages/shared/src/schemas/index.ts
export { bookingCreateSchema, bookingUpdateSchema } from './booking';
export { customerCreateSchema } from './customer';
```

**Service layer structure:**
```typescript
// apps/web/src/lib/services/booking.service.ts
import { db } from '@/lib/db';
import { bookingsTable } from '@schedulebox/database';
import { bookingCreateSchema } from '@schedulebox/shared';
import { publishEvent } from '@schedulebox/events';
import { AppError } from '@schedulebox/shared';

export async function createBooking(
  input: z.infer<typeof bookingCreateSchema>,
  companyId: number
): Promise<Booking> {
  // 1. Validate input (already done by Zod middleware)
  // 2. Check business rules (availability, permissions)
  // 3. Perform database operation
  // 4. Publish event
  // 5. Return result
}

export async function getBooking(
  bookingId: number,
  companyId: number
): Promise<Booking | null> {
  // Query with RLS
}
```

## API Endpoint Patterns

**Request/Response validation:**
- All endpoints validate input with Zod schema
- Use middleware: `validateRequest(schema)`
- Middleware extracts data, validates, or throws 400

```typescript
// apps/web/src/app/api/v1/bookings/route.ts
import { validateRequest } from '@/lib/middleware/validation';

export async function POST(req: NextRequest) {
  const input = await validateRequest(req, bookingCreateSchema);
  // input is guaranteed to match schema or error already sent
  const booking = await bookingService.createBooking(input, { companyId: req.company.id });
  return NextResponse.json({ data: booking }, { status: 201 });
}
```

**List endpoints:**
- Support filtering, sorting, pagination
- Query params: `?limit=20&page=1&sort=created_at&order=desc&filter[status]=confirmed`
- Always return pagination metadata

```typescript
export async function GET(req: NextRequest) {
  const { limit, page, sort, order, filters } = parseQuery(req);
  const { data, total } = await bookingService.listBookings(
    { companyId: req.company.id, ...filters },
    { limit, offset: (page - 1) * limit, sort, order }
  );
  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
}
```

## TypeScript Strictness

**Rules:**
- `"strict": true` in `tsconfig.json`
- `"noImplicitAny": true` — no `any` without explicit
- `"noImplicitReturns": true` — functions must return value
- `"strictNullChecks": true` — null/undefined must be handled
- `"forceConsistentCasingInFileNames": true`

**Type annotations:**
- Always annotate function parameters and return types
- Use `unknown` instead of `any`
- Use generics for reusable types (e.g., `Result<T>`, `ApiResponse<T>`)

```typescript
// ✅ Good
function processData(input: string): number {
  return parseInt(input, 10);
}

async function fetchBooking<T extends Booking>(
  id: number,
  parser: (raw: unknown) => T
): Promise<T> {
  const raw = await db.query(...);
  return parser(raw);
}

// ❌ Bad
function processData(input) {
  return parseInt(input, 10);
}

function fetchData(input: any): any {
  return input;
}
```

## Database/ORM Conventions

**Drizzle schema files:**
- Location: `packages/database/src/schema/*.ts` (organized by domain)
- Every table has: `id`, `uuid`, `companyId`, `createdAt`, `updatedAt`
- Foreign keys with appropriate `onDelete` strategy (CASCADE for owned, SET NULL for optional)

```typescript
// packages/database/src/schema/bookings.ts
export const bookingsTable = pgTable(
  'bookings',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().unique().notNull(),
    companyId: integer('company_id').notNull().references(() => companiesTable.id),
    customerId: integer('customer_id').notNull().references(() => customersTable.id, { onDelete: 'restrict' }),
    serviceId: integer('service_id').notNull().references(() => servicesTable.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdIdx: index('idx_bookings_company').on(table.companyId),
    statusIdx: index('idx_bookings_status').on(table.companyId, table.status),
  })
);

export const bookingsRelations = relations(bookingsTable, ({ one, many }) => ({
  company: one(companiesTable, { fields: [bookingsTable.companyId], references: [companiesTable.id] }),
  customer: one(customersTable, { fields: [bookingsTable.customerId], references: [customersTable.id] }),
  payment: one(paymentsTable),
}));
```

**Queries:**
- Use `SELECT ... FOR UPDATE` for concurrency-critical operations (bookings, payments)
- Always filter by `companyId` for RLS
- Use prepared statements (Drizzle does this by default)

```typescript
// Critical: get booking with lock to prevent double-booking
const booking = await db
  .select()
  .from(bookingsTable)
  .where(and(
    eq(bookingsTable.id, bookingId),
    eq(bookingsTable.companyId, companyId)
  ))
  .for('update');

if (!booking) {
  throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404);
}
```

---

*Convention analysis: 2026-02-10*
