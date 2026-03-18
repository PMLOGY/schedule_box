import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnDef } from '@tanstack/react-table';
import { NextIntlClientProvider } from 'next-intl';
import { DataTable } from './data-table';

// Mock Czech translations for the table namespace
const messages = {
  table: {
    noData: 'Žiadne záznamy',
    showing: 'Zobrazujem',
    to: 'do',
    of: 'z',
    entries: 'záznamov',
    page: 'Strana',
  },
};

// Wrapper decorator providing next-intl context
function withNextIntl(Story: React.ComponentType) {
  return (
    <NextIntlClientProvider locale="cs" messages={messages}>
      <Story />
    </NextIntlClientProvider>
  );
}

// Sample data type
interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  bookings: number;
}

// Sample columns
const columns: ColumnDef<Employee, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Meno',
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    enableSorting: false,
  },
  {
    accessorKey: 'role',
    header: 'Rola',
    enableSorting: true,
  },
  {
    accessorKey: 'bookings',
    header: 'Rezervácie',
    enableSorting: true,
  },
];

// Sample rows
const sampleData: Employee[] = [
  { id: '1', name: 'Jana Nováková', email: 'jana@example.com', role: 'Zamestnanec', bookings: 42 },
  { id: '2', name: 'Marek Horváth', email: 'marek@example.com', role: 'Manažér', bookings: 17 },
  {
    id: '3',
    name: 'Petra Kováčová',
    email: 'petra@example.com',
    role: 'Zamestnanec',
    bookings: 58,
  },
  { id: '4', name: 'Tomáš Blaho', email: 'tomas@example.com', role: 'Admin', bookings: 3 },
  {
    id: '5',
    name: 'Lucia Svobodová',
    email: 'lucia@example.com',
    role: 'Zamestnanec',
    bookings: 29,
  },
];

const meta = {
  title: 'Shared/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [withNextIntl],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  name: 'With Data',
  args: {
    columns,
    data: sampleData,
    isLoading: false,
    isError: false,
    pageSize: 10,
  },
};

export const Empty: Story = {
  name: 'Empty State',
  args: {
    columns,
    data: [],
    isLoading: false,
    isError: false,
    emptyMessage: 'Žiadni zamestnanci nenájdení',
    pageSize: 10,
  },
};

export const Loading: Story = {
  name: 'Loading State',
  args: {
    columns,
    data: [],
    isLoading: true,
    isError: false,
    pageSize: 10,
  },
};

export const Error: Story = {
  name: 'Error State',
  args: {
    columns,
    data: [],
    isLoading: false,
    isError: true,
    errorMessage: 'Nepodarilo sa načítať dáta. Skúste to znova.',
    pageSize: 10,
  },
};

export const WithPagination: Story = {
  name: 'With Pagination',
  args: {
    columns,
    data: [
      ...sampleData,
      { id: '6', name: 'Adam Šimko', email: 'adam@example.com', role: 'Zamestnanec', bookings: 11 },
      { id: '7', name: 'Eva Mrázová', email: 'eva@example.com', role: 'Zamestnanec', bookings: 34 },
    ],
    isLoading: false,
    isError: false,
    pageSize: 5,
  },
};
