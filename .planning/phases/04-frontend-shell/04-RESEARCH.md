# Phase 4: Frontend Shell - Research

**Researched:** 2026-02-10
**Domain:** Next.js 14 App Router, React UI components, state management, design system
**Confidence:** HIGH

## Summary

Phase 4 implements the frontend application shell with authentication pages, dashboard layout, navigation, design system components, and calendar views. This phase builds on the completed authentication API (Phase 3) and establishes the UI foundation that all future features will depend on.

The research reveals that Next.js 14 App Router with shadcn/ui (built on Radix UI and Tailwind CSS), TanStack Query v5 for server state, Zustand for client state, and FullCalendar for resource scheduling provides a modern, type-safe, and performant foundation. The documentation specifies 32+ UI components across atoms, molecules, and organisms, with support for Czech/Slovak/English via next-intl and WCAG 2.1 AA accessibility.

**Primary recommendation:** Build a multi-layered component architecture with shadcn/ui primitives at the base, reusable molecules in packages/ui, and page-specific organisms in apps/web. Use TanStack Query for all API calls with optimistic updates and React Query DevTools. Implement Zustand stores for auth, UI state, and calendar view state. Use FullCalendar with resource-timeline plugin for the booking calendar. Follow Next.js 14 App Router patterns with route groups for (auth) and (dashboard) layouts. Ensure all components are Server Components by default, only use 'use client' when necessary (interactivity, browser APIs, hooks).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.x | Full-stack React framework | Official React framework with App Router, Server Components, automatic code splitting |
| shadcn/ui | Latest | UI component library | Not a dependency—copies components into your codebase, built on Radix UI + Tailwind |
| Tailwind CSS | 3.x | Utility-first CSS | Industry standard for React, minimal runtime, excellent DX |
| TanStack Query | 5.x | Server state management | De-facto standard for data fetching/caching (formerly React Query) |
| Zustand | 4.x | Client state management | Lightest state library (2.9 KB), simpler than Redux/MobX |
| React Hook Form | 7.x | Form state management | Most popular form library (40M+ downloads/week), minimal re-renders |
| Zod | 3.x | Runtime validation | Already in project, integrates with React Hook Form via @hookform/resolvers |
| next-intl | Latest | Internationalization | Next.js-native i18n with App Router support, ICU message syntax |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fullcalendar/react | 6.x | Calendar/scheduling UI | Main booking calendar with resource timeline |
| @fullcalendar/resource-timeline | 6.x | Resource scheduling view | Multi-employee column view |
| sonner | Latest | Toast notifications | Modern toast library by shadcn creator, Server Component support |
| @tanstack/react-table | 8.x | Data table management | Pagination, sorting, filtering for customer/service lists |
| react-day-picker | Latest | Date picker | Used by shadcn/ui Calendar component |
| date-fns | 3.x | Date utilities | Lightweight alternative to moment.js, tree-shakeable |
| lucide-react | Latest | Icon library | Modern icon set, used by shadcn/ui |
| class-variance-authority (cva) | Latest | Component variant utility | Type-safe variant props for components |
| clsx / tailwind-merge | Latest | Class name utility | Merge Tailwind classes without conflicts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui | Chakra UI / Material-UI | shadcn/ui gives full control (owns the code), Chakra/MUI are dependencies with less flexibility |
| TanStack Query | SWR / Apollo | TanStack Query has better DevTools and mutation support than SWR, lighter than Apollo |
| Zustand | Redux Toolkit / Jotai | Redux is overkill for simple client state, Zustand is simpler. Jotai is atomic (more complex) |
| React Hook Form | Formik / Final Form | React Hook Form has fewer re-renders and better TypeScript support |
| next-intl | react-i18next | next-intl is Next.js-native with App Router support, react-i18next is framework-agnostic |
| FullCalendar | DayPilot / DHTMLX | FullCalendar has best React integration and community, others are less React-focused |

**Installation:**
```bash
# Core dependencies (not already installed)
pnpm add @tanstack/react-query zustand react-hook-form @hookform/resolvers next-intl

# shadcn/ui setup (initializes, doesn't install as dependency)
npx shadcn-ui@latest init

# UI libraries
pnpm add sonner @tanstack/react-table lucide-react class-variance-authority clsx tailwind-merge

# Date/time utilities
pnpm add date-fns react-day-picker

# Calendar
pnpm add @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/resource-timeline @fullcalendar/interaction

# Dev dependencies
pnpm add -D @tanstack/react-query-devtools
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── app/
│   ├── (auth)/                     # Route group: Auth layout
│   │   ├── layout.tsx              # Auth layout (centered, no sidebar)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/                # Route group: Dashboard layout
│   │   ├── layout.tsx              # Dashboard layout (sidebar + header)
│   │   ├── page.tsx                # Dashboard home
│   │   ├── calendar/page.tsx       # Booking calendar
│   │   ├── customers/
│   │   │   ├── page.tsx            # Customer list
│   │   │   └── [id]/page.tsx       # Customer detail
│   │   ├── services/page.tsx
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── [...slug]/page.tsx
│   ├── layout.tsx                  # Root layout (providers, fonts)
│   ├── globals.css                 # Tailwind + custom CSS
│   └── providers.tsx               # Client providers wrapper
├── components/
│   ├── ui/                         # shadcn/ui atoms (copied from CLI)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── modal.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   └── ... (20+ components)
│   ├── layout/                     # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── mobile-nav.tsx
│   ├── dashboard/                  # Dashboard-specific
│   │   ├── stat-card.tsx
│   │   ├── dashboard-grid.tsx
│   │   └── quick-actions.tsx
│   ├── calendar/                   # Calendar components
│   │   ├── calendar-view.tsx       # FullCalendar wrapper
│   │   ├── time-slot-picker.tsx
│   │   └── booking-card.tsx
│   └── shared/                     # Shared molecules
│       ├── data-table.tsx
│       ├── empty-state.tsx
│       ├── loading-spinner.tsx
│       └── skeleton.tsx
├── hooks/                          # Custom React hooks
│   ├── use-auth.ts                 # Auth store + login/logout
│   ├── use-bookings.ts             # TanStack Query hooks
│   ├── use-customers.ts
│   ├── use-services.ts
│   └── use-debounce.ts
├── stores/                         # Zustand stores
│   ├── auth.store.ts               # User, company, tokens
│   ├── ui.store.ts                 # Sidebar, modals, toasts
│   └── calendar.store.ts           # Calendar view, date, filters
├── lib/                            # Frontend utilities
│   ├── api-client.ts               # Fetch wrapper with auth
│   ├── query-client.ts             # TanStack Query config
│   └── utils.ts                    # Class name merger (cn)
├── messages/                       # i18n translations
│   ├── cs.json
│   ├── sk.json
│   └── en.json
└── styles/
    └── calendar.css                # FullCalendar overrides

packages/ui/
├── src/
│   ├── components/                 # Shared UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ... (reusable atoms)
│   └── index.ts
└── package.json
```

### Pattern 1: Server Component by Default, Client When Needed

**What:** Use React Server Components (RSC) by default, only add 'use client' when necessary
**When to use:** Always start with Server Components, only make client components for interactivity
**Example:**
```typescript
// app/(dashboard)/customers/page.tsx - Server Component (default)
import { getCustomers } from '@/lib/api/customers';
import { CustomerTable } from '@/components/customers/customer-table';

export default async function CustomersPage() {
  // Server-side data fetching
  const customers = await getCustomers();

  return (
    <div>
      <h1>Customers</h1>
      {/* Pass data to Client Component */}
      <CustomerTable data={customers} />
    </div>
  );
}

// components/customers/customer-table.tsx - Client Component
'use client'; // Only add when needed

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';

export function CustomerTable({ data }) {
  const [selectedRows, setSelectedRows] = useState([]);
  // Client-side interactivity
  return <DataTable data={data} onRowSelect={setSelectedRows} />;
}
```

### Pattern 2: TanStack Query with Next.js 14 App Router

**What:** Provider pattern for TanStack Query with App Router
**When to use:** All client components that fetch data
**Example:**
```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create query client in component state (not global)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

// hooks/use-customers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => apiClient.get('/customers', { params: filters }),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CustomerCreate) => apiClient.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
```

### Pattern 3: Zustand Store with TypeScript

**What:** Type-safe Zustand store with immer middleware
**When to use:** Global client state (auth, UI state, preferences)
**Example:**
```typescript
// stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user, not tokens
    }
  )
);

// Usage in component
'use client';
import { useAuthStore } from '@/stores/auth.store';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header>
      <span>{user?.name}</span>
      <button onClick={logout}>Logout</button>
    </header>
  );
}
```

### Pattern 4: shadcn/ui Component with Variants (CVA)

**What:** Reusable component with type-safe variants using class-variance-authority
**When to use:** All design system components (Button, Badge, Card, etc.)
**Example:**
```typescript
// components/ui/button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500 text-white hover:bg-blue-600',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        ghost: 'hover:bg-gray-100',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? <Spinner /> : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button, buttonVariants };

// Usage
<Button variant="primary" size="lg">Save</Button>
<Button variant="danger" size="sm">Delete</Button>
```

### Pattern 5: Form with React Hook Form + Zod + shadcn/ui

**What:** Type-safe form with validation and shadcn/ui Form component
**When to use:** All forms in the application
**Example:**
```typescript
// validations/customer.ts (already exists from Phase 3)
import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+420\d{9}$/).optional(),
});

type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

// components/customers/customer-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { customerCreateSchema } from '@/validations/customer';
import { useCreateCustomer } from '@/hooks/use-customers';

export function CustomerForm() {
  const createCustomer = useCreateCustomer();

  const form = useForm({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = async (data: CustomerCreateInput) => {
    await createCustomer.mutateAsync(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Jan Novák" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jan@firma.cz" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" isLoading={createCustomer.isPending}>
          Create Customer
        </Button>
      </form>
    </Form>
  );
}
```

### Pattern 6: Data Table with TanStack Table

**What:** Reusable table component with sorting, filtering, pagination
**When to use:** All list views (customers, services, employees, etc.)
**Example:**
```typescript
// components/ui/data-table.tsx
'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}

// Usage
const columns: ColumnDef<Customer>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' },
];

<DataTable columns={columns} data={customers} />
```

### Pattern 7: next-intl with App Router

**What:** Internationalization with next-intl for cs/sk/en
**When to use:** All user-facing text in the application
**Example:**
```typescript
// i18n.ts (root)
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));

// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['cs', 'sk', 'en'],
  defaultLocale: 'cs',
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({ children, params: { locale } }) {
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// Usage in component
'use client';
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth');

  return (
    <form>
      <h1>{t('login.title')}</h1>
      <button>{t('login.submit')}</button>
    </form>
  );
}

// messages/cs.json
{
  "auth": {
    "login": {
      "title": "Přihlášení",
      "submit": "Přihlásit se"
    }
  }
}
```

### Pattern 8: Toast Notifications with Sonner

**What:** Toast notification system with sonner
**When to use:** User feedback for actions (success, error, info)
**Example:**
```typescript
// app/layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

// Usage in component
'use client';
import { toast } from 'sonner';

export function CustomerForm() {
  const createCustomer = useCreateCustomer();

  const onSubmit = async (data) => {
    try {
      await createCustomer.mutateAsync(data);
      toast.success('Zákazník vytvořen');
    } catch (error) {
      toast.error('Chyba při vytváření zákazníka');
    }
  };

  return <form onSubmit={onSubmit}>...</form>;
}

// With custom action button
toast.message('Booking created', {
  description: 'Customer will receive confirmation email',
  action: {
    label: 'View',
    onClick: () => router.push(`/bookings/${id}`),
  },
});
```

### Anti-Patterns to Avoid

- **Using 'use client' too early:** Don't add 'use client' to every component by default. Server Components are more performant.
- **Accessing browser APIs in Server Components:** window, document, localStorage are undefined in Server Components. Use 'use client' for these.
- **Global QueryClient:** Don't create QueryClient outside component. Create it in useState to prevent sharing across requests.
- **Fetching in Client Components without TanStack Query:** Don't use useEffect + fetch. Use TanStack Query for caching and deduplication.
- **Storing JWT in Zustand:** Don't persist tokens in localStorage via Zustand. Use httpOnly cookies (already done in Phase 3).
- **Ignoring Suspense boundaries:** Don't forget to wrap async Server Components in <Suspense> with fallback for loading states.
- **Hardcoding text:** Don't hardcode Czech text. Always use next-intl's useTranslations hook.
- **Duplicate Tailwind classes:** Don't write `bg-blue-500 bg-red-500`. Use cn() utility to merge classes properly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | React Hook Form + Zod | Handles re-renders, touched state, error messages, complex validation |
| Data table | Custom table with manual sort/filter | TanStack Table | Handles sorting, filtering, pagination, column resizing, virtual scrolling |
| Date picker | Custom calendar widget | react-day-picker (via shadcn/ui) | Handles timezones, locales, accessibility, keyboard navigation |
| Toast notifications | Custom notification system | sonner | Handles queuing, dismissal, stacking, animation, accessibility |
| State management | Custom Redux-like solution | Zustand or TanStack Query | Zustand for client state, TanStack Query for server state—no need for custom solution |
| Internationalization | Custom translation system | next-intl | Handles plurals, ICU message syntax, date/number formatting, Server Components |
| Class name merging | String concatenation | clsx + tailwind-merge | Handles conditional classes, removes duplicate Tailwind classes |
| Component variants | Manual if/else styling | class-variance-authority (cva) | Type-safe variants, composable styles, better DX |

**Key insight:** React ecosystem has mature solutions for common UI problems. Building custom versions wastes time and introduces bugs. Use battle-tested libraries that handle edge cases you haven't thought of (timezones, accessibility, performance, browser differences).

## Common Pitfalls

### Pitfall 1: Server vs Client Component Confusion

**What goes wrong:** Trying to use useState, useEffect, or browser APIs in Server Components, or expecting Server Components to re-render on client interactions

**Why it happens:** Next.js 14 defaults to Server Components, but many React patterns assume client-side rendering

**How to avoid:**
- Start with Server Components by default
- Only add 'use client' when you need: useState, useEffect, onClick, browser APIs (window, localStorage), React Context
- Remember: Server Components cannot use hooks or access browser APIs
- Remember: Client Components can be imported into Server Components, but not vice versa

**Warning signs:**
- Error: "You're importing a component that needs useState. It only works in a Client Component..."
- window is not defined
- localStorage is not defined
- Hooks not working

**Example fix:**
```typescript
// ❌ WRONG - Server Component trying to use useState
export default function Page() {
  const [count, setCount] = useState(0); // ERROR
  return <button onClick={() => setCount(count + 1)}>Click</button>;
}

// ✅ CORRECT - Mark as Client Component
'use client';
export default function Page() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Click</button>;
}

// ✅ BETTER - Separate concerns
// page.tsx (Server Component)
import { Counter } from './counter';
export default function Page() {
  return <div><Counter /></div>;
}

// counter.tsx (Client Component)
'use client';
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Pitfall 2: QueryClient Shared Across Requests

**What goes wrong:** Creating QueryClient outside component causes it to be shared across all users in server-side rendering, leading to data leaks

**Why it happens:** Misunderstanding Next.js 14 server/client boundary and React 18 patterns

**How to avoid:**
- Always create QueryClient inside component with useState
- Never create QueryClient at module level
- Use the Provider pattern correctly

**Warning signs:**
- User A sees User B's data
- Stale data persists across page refreshes
- Cache not invalidating properly

**Example fix:**
```typescript
// ❌ WRONG - Global QueryClient
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient(); // Shared across all requests!

export function Providers({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// ✅ CORRECT - QueryClient in component state
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### Pitfall 3: Number Input Type Coercion

**What goes wrong:** Assuming type="number" input returns a number, but it always returns a string

**Why it happens:** HTML input value is always a string, regardless of type attribute

**How to avoid:**
- Use Zod validation to coerce strings to numbers
- Use form.watch() with explicit type conversion
- Let React Hook Form + Zod handle the coercion

**Warning signs:**
- API receives "123" instead of 123
- Type errors when passing input value to API
- NaN when doing math operations

**Example fix:**
```typescript
// ❌ WRONG - Assuming number type
const schema = z.object({
  price: z.number(), // Will fail validation—input returns string!
});

// ✅ CORRECT - Coerce string to number
const schema = z.object({
  price: z.string().pipe(z.coerce.number().min(0)),
  // or
  price: z.coerce.number().min(0), // Simpler syntax
});
```

### Pitfall 4: Missing Suspense Boundaries

**What goes wrong:** Async Server Components cause entire page to wait, no loading state shown

**Why it happens:** Forgetting to wrap async components in Suspense boundaries

**How to avoid:**
- Wrap async Server Components in <Suspense>
- Provide meaningful fallback UI
- Use multiple Suspense boundaries for granular loading states

**Warning signs:**
- Entire page is blank while loading
- No loading indicators
- Poor perceived performance

**Example fix:**
```typescript
// ❌ WRONG - No Suspense boundary
export default async function Page() {
  const data = await fetchData(); // Blocks entire page
  return <div>{data}</div>;
}

// ✅ CORRECT - Suspense boundary with fallback
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DataComponent />
    </Suspense>
  );
}

async function DataComponent() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// ✅ BETTER - Multiple Suspense boundaries
export default function Page() {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}
```

### Pitfall 5: Zustand Store in Server Components

**What goes wrong:** Trying to use Zustand store in Server Components causes state to be shared across all users

**Why it happens:** Misunderstanding that Server Components are stateless and shared

**How to avoid:**
- Only use Zustand in Client Components (with 'use client')
- Use Server Components for initial data fetching
- Pass data down to Client Components as props

**Warning signs:**
- User state leaking between different users
- Privacy violations
- Unexpected behavior in production

**Example fix:**
```typescript
// ❌ WRONG - Zustand in Server Component
import { useAuthStore } from '@/stores/auth.store';

export default function Page() { // Server Component
  const user = useAuthStore((state) => state.user); // ERROR: hooks don't work in Server Components
  return <div>{user.name}</div>;
}

// ✅ CORRECT - Zustand in Client Component
'use client';
import { useAuthStore } from '@/stores/auth.store';

export function UserProfile() {
  const user = useAuthStore((state) => state.user);
  return <div>{user.name}</div>;
}

// ✅ BETTER - Server Component fetches, Client Component uses store
// page.tsx (Server Component)
import { getUserFromSession } from '@/lib/auth';
import { UserProfile } from './user-profile';

export default async function Page() {
  const user = await getUserFromSession(); // Server-side auth check
  return <UserProfile initialUser={user} />;
}

// user-profile.tsx (Client Component)
'use client';
export function UserProfile({ initialUser }) {
  const user = useAuthStore((state) => state.user) ?? initialUser;
  return <div>{user.name}</div>;
}
```

### Pitfall 6: Hardcoded Text Instead of i18n

**What goes wrong:** Text is hardcoded in Czech, making it impossible to switch to Slovak or English

**Why it happens:** Forgetting to use next-intl's useTranslations hook

**How to avoid:**
- Never hardcode user-facing text
- Always use t() function from useTranslations
- Create translation keys in messages/cs.json first, then use them

**Warning signs:**
- Czech text directly in JSX
- No way to change language
- Slovak users see Czech text

**Example fix:**
```typescript
// ❌ WRONG - Hardcoded Czech text
export function LoginForm() {
  return (
    <form>
      <h1>Přihlášení</h1>
      <button>Přihlásit se</button>
    </form>
  );
}

// ✅ CORRECT - Using i18n
'use client';
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth.login');

  return (
    <form>
      <h1>{t('title')}</h1>
      <button>{t('submit')}</button>
    </form>
  );
}

// messages/cs.json
{
  "auth": {
    "login": {
      "title": "Přihlášení",
      "submit": "Přihlásit se"
    }
  }
}

// messages/sk.json
{
  "auth": {
    "login": {
      "title": "Prihlásenie",
      "submit": "Prihlásiť sa"
    }
  }
}
```

### Pitfall 7: Conflicting Tailwind Classes

**What goes wrong:** Two conflicting Tailwind classes (e.g., bg-blue-500 bg-red-500) cause unpredictable styling

**Why it happens:** Conditional class names without proper merging

**How to avoid:**
- Use cn() utility function (clsx + tailwind-merge)
- Install and use tailwind-merge to deduplicate classes
- Always merge classes when accepting className prop

**Warning signs:**
- Styles not applying as expected
- Last class wins instead of most specific
- Conditional styles conflict

**Example fix:**
```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ❌ WRONG - String concatenation
export function Button({ className, variant }) {
  const baseClasses = 'px-4 py-2 bg-blue-500';
  const variantClasses = variant === 'danger' ? 'bg-red-500' : '';
  return <button className={`${baseClasses} ${variantClasses} ${className}`} />;
  // Result: "px-4 py-2 bg-blue-500 bg-red-500 custom-class"
  // Both bg-blue-500 and bg-red-500 are present!
}

// ✅ CORRECT - Using cn() utility
import { cn } from '@/lib/utils';

export function Button({ className, variant }) {
  return (
    <button
      className={cn(
        'px-4 py-2',
        variant === 'danger' ? 'bg-red-500' : 'bg-blue-500',
        className
      )}
    />
  );
  // Result: "px-4 py-2 bg-red-500 custom-class"
  // Only the last conflicting class (bg-red-500) remains
}
```

## Code Examples

Verified patterns from official sources and documentation:

### shadcn/ui Setup and Usage

```bash
# Initialize shadcn/ui (interactive CLI)
npx shadcn-ui@latest init

# Add individual components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add table
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
```

### FullCalendar with Resource Timeline

```typescript
// components/calendar/calendar-view.tsx
'use client';

import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { useBookings } from '@/hooks/use-bookings';
import { useEmployees } from '@/hooks/use-employees';

export function CalendarView() {
  const { data: bookings } = useBookings();
  const { data: employees } = useEmployees();

  const events = bookings?.map((booking) => ({
    id: booking.id,
    resourceId: booking.employee_id,
    title: booking.customer.name,
    start: booking.start_time,
    end: booking.end_time,
    backgroundColor: booking.service.color,
  }));

  const resources = employees?.map((emp) => ({
    id: emp.id,
    title: emp.name,
  }));

  return (
    <FullCalendar
      plugins={[resourceTimelinePlugin, interactionPlugin]}
      initialView="resourceTimelineDay"
      resources={resources}
      events={events}
      editable={true}
      droppable={true}
      eventDrop={handleEventDrop}
      eventResize={handleEventResize}
      select={handleSelect}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth',
      }}
      slotDuration="00:15:00"
      snapDuration="00:15:00"
      slotMinTime="08:00:00"
      slotMaxTime="20:00:00"
      height="auto"
    />
  );
}
```

### API Client with Auth Interceptor

```typescript
// lib/api-client.ts
import { useAuthStore } from '@/stores/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = useAuthStore.getState().accessToken;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

### Dashboard with KPI Cards

```typescript
// app/(dashboard)/page.tsx
import { Suspense } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid />
      </Suspense>

      <Suspense fallback={<ChartsGridSkeleton />}>
        <ChartsGrid />
      </Suspense>
    </div>
  );
}

async function StatsGrid() {
  const stats = await fetch('/api/v1/analytics/dashboard?period=month').then(r => r.json());

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Dnešní rezervace"
        value={stats.today_bookings}
        trend={+12}
        icon="calendar"
      />
      <StatCard
        title="Tržby tento měsíc"
        value={`${stats.monthly_revenue} Kč`}
        trend={+8}
        icon="dollar"
      />
      <StatCard
        title="Noví zákazníci"
        value={stats.new_customers}
        trend={-3}
        icon="users"
      />
      <StatCard
        title="Průměrné hodnocení"
        value={stats.avg_rating}
        icon="star"
      />
    </div>
  );
}

// components/dashboard/stat-card.tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: string;
}

export function StatCard({ title, value, trend, icon }: StatCardProps) {
  const Icon = icons[icon]; // Map icon name to LucideIcon

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? '+' : ''}{trend}% vs. minulý měsíc
            </p>
          )}
        </div>
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router | App Router | Next.js 13 (2022), stable in 14 | Server Components by default, nested layouts, better data fetching |
| getServerSideProps | async Server Components | Next.js 13+ | Simpler API, colocate data fetching with components |
| React Query v4 | TanStack Query v5 | Dec 2023 | Better TypeScript, simplified API, improved DevTools |
| Formik | React Hook Form | ~2020 | Fewer re-renders, better performance, smaller bundle |
| react-i18next | next-intl | Next.js 13+ App Router | Native Next.js integration, Server Component support |
| react-hot-toast | sonner | 2024 | Simpler API, better animations, Server Component support |
| Redux Toolkit | Zustand | 2021+ | Less boilerplate, smaller bundle, simpler for most use cases |
| Heroicons | Lucide React | 2023+ | More icons, better tree-shaking, active maintenance |

**Deprecated/outdated:**
- **getStaticProps/getServerSideProps:** Use Server Components and fetch directly in component
- **_app.tsx / _document.tsx:** Use app/layout.tsx in App Router
- **next-i18next:** Use next-intl for App Router projects
- **React Query v3:** Use TanStack Query v5 (breaking changes in v4)
- **class-names package:** Use clsx (lighter, maintained)

## Open Questions

1. **FullCalendar Premium License**
   - What we know: Resource timeline requires @fullcalendar/resource-timeline which is part of the Premium package
   - What's unclear: Whether to purchase license ($290/year) or use alternative open-source solution
   - Recommendation: Start with Premium trial, consider DayPilot or DHTMLX Scheduler if cost is prohibitive

2. **Storybook Integration**
   - What we know: Documentation mentions Storybook for component documentation
   - What's unclear: Whether to set up Storybook in Phase 4 or defer to Phase 13 (Polish)
   - Recommendation: Defer to Phase 13 unless client specifically requests it—focus on working UI first

3. **E2E Testing in Phase 4**
   - What we know: DEVOPS segment handles testing, but Phase 4 is UI-heavy
   - What's unclear: How much E2E testing to implement alongside UI components
   - Recommendation: Focus on UI implementation in Phase 4, comprehensive E2E in Phase 15 (DevOps)

4. **Component Library Split**
   - What we know: packages/ui should contain shared components, apps/web/components contains app-specific
   - What's unclear: Where to draw the line—which components are "shared" vs "app-specific"
   - Recommendation: Start with everything in apps/web/components, move to packages/ui only when needed by multiple apps

## Sources

### Primary (HIGH confidence)

- [Next.js 14 App Router - Official Docs](https://nextjs.org/docs/app)
- [shadcn/ui - Official Site](https://ui.shadcn.com/docs)
- [TanStack Query v5 - Official Docs](https://tanstack.com/query/latest)
- [Zustand - Official Docs](https://zustand.docs.pmnd.rs/)
- [next-intl - Official Docs](https://next-intl.dev/)
- [React Hook Form - Official Docs](https://react-hook-form.com/)
- [FullCalendar - Official Docs](https://fullcalendar.io/docs)

### Secondary (MEDIUM confidence)

- [Next.js App Router Common Mistakes - Vercel Blog](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [Building React Forms with React Hook Form, Zod and Shadcn - Wasp](https://wasp.sh/blog/2024/11/20/building-react-forms-with-ease-using-react-hook-form-and-zod)
- [TanStack Query Next.js 14 Integration - FAUN](https://faun.pub/from-setup-to-execution-the-most-accurate-tanstack-query-and-next-js-14-integration-guide-8e5aff6ee8ba)
- [Sonner - Modern Toast Notifications - Stackademic](https://medium.com/@rivainasution/shadcn-ui-react-series-part-19-sonner-modern-toast-notifications-done-right-903757c5681f)

### Tertiary (LOW confidence)

- Community tutorials and Medium articles on Next.js 14 patterns (various authors)
- GitHub discussions on TanStack libraries

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries verified from official documentation and npm registry
- Architecture patterns: HIGH - Patterns verified from official Next.js 14 docs and library documentation
- Pitfalls: MEDIUM - Based on official Vercel blog post and community consensus, but some edge cases may exist

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (60 days - stable ecosystem, but Next.js updates frequently)

---

## Summary for Planner

**Phase 4 builds the frontend foundation with these key deliverables:**

1. **Design system setup:** shadcn/ui + Tailwind with custom color tokens
2. **Auth pages:** Login, register, forgot password, reset password (Client Components with forms)
3. **Dashboard layout:** Sidebar + Header with role-based navigation (Nested layouts)
4. **Dashboard page:** KPI stat cards (Server Components with Suspense)
5. **Calendar page:** FullCalendar with resource timeline for bookings
6. **UI components:** 20+ shadcn/ui atoms (Button, Input, Modal, etc.)
7. **State management:** TanStack Query for API calls, Zustand for auth/UI state
8. **Internationalization:** next-intl with cs/sk/en support
9. **Toast system:** sonner for notifications

**Critical success factors:**
- Use Server Components by default, Client Components only when needed
- TanStack Query for ALL API calls (no raw fetch in useEffect)
- All text must use next-intl (no hardcoded Czech)
- Follow shadcn/ui patterns for component variants
- Proper Suspense boundaries for loading states

**Dependencies on previous phases:**
- Phase 3 API endpoints (auth, customers, services, employees, resources) must be complete
- Database schema must be finalized (no frontend changes if schema changes)

**Ready for planning:** Yes. All key patterns documented, libraries researched, pitfalls identified.
