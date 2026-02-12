'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Search, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-wizard.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface Customer {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface CustomersResponse {
  data: Customer[];
  meta?: { total: number };
}

const customerSchema = z.object({
  customerName: z.string().min(2, 'Jméno musí mít alespoň 2 znaky'),
  customerEmail: z.string().email('Neplatný formát e-mailu').optional().or(z.literal('')),
  customerPhone: z
    .string()
    .regex(/^\+?[\d\s-]{9,18}$/, 'Neplatný formát telefonu')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(1000).optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

/** Inner form component — re-mounts when key changes to pick up new defaults */
function CustomerForm({
  defaultValues,
  disabled,
  onSubmit,
  onBack,
}: {
  defaultValues: CustomerFormValues;
  disabled: boolean;
  onSubmit: (values: CustomerFormValues) => void;
  onBack: () => void;
}) {
  const t = useTranslations('booking.wizard.step3');
  const tCommon = useTranslations('common');

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('email')}</FormLabel>
              <FormControl>
                <Input type="email" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('phone')}</FormLabel>
              <FormControl>
                <Input type="tel" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('notes')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            {tCommon('back')}
          </Button>
          <Button type="submit">{tCommon('next')}</Button>
        </div>
      </form>
    </Form>
  );
}

export function Step3CustomerInfo() {
  const t = useTranslations('booking.wizard.step3');
  const { data, updateData, nextStep, prevStep } = useBookingWizard();

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formKey, setFormKey] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load customers when user types (min 1 char)
  const { data: customersResponse } = useQuery<CustomersResponse>({
    queryKey: ['customers', searchQuery],
    queryFn: async () => {
      const res = await apiClient.get<CustomersResponse>('/customers', {
        search: searchQuery,
        limit: 10,
      });
      return res;
    },
    enabled: searchQuery.length > 0 && !selectedCustomer,
  });

  const customers =
    customersResponse?.data ??
    (Array.isArray(customersResponse) ? (customersResponse as unknown as Customer[]) : []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.name);
    setShowDropdown(false);

    updateData({
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email || undefined,
      customerPhone: customer.phone || undefined,
    });

    // Increment key to force CustomerForm re-mount with new defaults
    setFormKey((prev) => prev + 1);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setSearchQuery('');
    updateData({
      customerId: undefined,
      customerName: undefined,
      customerEmail: undefined,
      customerPhone: undefined,
    });
    setFormKey((prev) => prev + 1);
    inputRef.current?.focus();
  };

  const handleSubmit = (values: CustomerFormValues) => {
    updateData({
      customerName: values.customerName,
      customerEmail: values.customerEmail || undefined,
      customerPhone: values.customerPhone || undefined,
      notes: values.notes || undefined,
    });
    nextStep();
  };

  const isExistingCustomer = !!selectedCustomer;

  const formDefaults: CustomerFormValues = {
    customerName: selectedCustomer?.name ?? data.customerName ?? '',
    customerEmail: selectedCustomer?.email ?? data.customerEmail ?? '',
    customerPhone: selectedCustomer?.phone ?? data.customerPhone ?? '',
    notes: data.notes ?? '',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t('title')}</h2>
      </div>

      <div className="space-y-4">
        {/* Single searchable customer field */}
        <div className="relative" ref={dropdownRef}>
          <label className="text-sm font-medium mb-1.5 block">{t('searchCustomer')}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={t('searchCustomer')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                if (selectedCustomer) {
                  setSelectedCustomer(null);
                  updateData({ customerId: undefined });
                }
              }}
              onFocus={() => {
                if (searchQuery.length > 0 && !selectedCustomer) {
                  setShowDropdown(true);
                }
              }}
              className="pl-9 pr-9"
              disabled={isExistingCustomer}
            />
            {(searchQuery || isExistingCustomer) && (
              <button
                type="button"
                onClick={handleClearCustomer}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {showDropdown && customers.length > 0 && !selectedCustomer && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
              <ul className="max-h-60 overflow-auto py-1">
                {customers.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {[customer.email, customer.phone].filter(Boolean).join(' · ')}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showDropdown &&
            searchQuery.length > 0 &&
            customers.length === 0 &&
            !selectedCustomer && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-sm text-muted-foreground">
                {t('noCustomersFound')}
              </div>
            )}
        </div>

        {isExistingCustomer && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <span className="font-medium">{selectedCustomer.name}</span>
            {selectedCustomer.email && (
              <span className="text-muted-foreground"> · {selectedCustomer.email}</span>
            )}
            {selectedCustomer.phone && (
              <span className="text-muted-foreground"> · {selectedCustomer.phone}</span>
            )}
          </div>
        )}

        {/* key forces full re-mount with new defaults when customer is selected */}
        <CustomerForm
          key={formKey}
          defaultValues={formDefaults}
          disabled={isExistingCustomer}
          onSubmit={handleSubmit}
          onBack={prevStep}
        />
      </div>
    </div>
  );
}
