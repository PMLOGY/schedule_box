'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-wizard.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const customerSchema = z.object({
  customerName: z.string().min(2, 'booking.wizard.step3.validation.nameMin'),
  customerEmail: z.string().email('booking.wizard.step3.validation.emailInvalid').optional().or(z.literal('')),
  customerPhone: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/, 'booking.wizard.step3.validation.phoneInvalid')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(1000).optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export function Step3CustomerInfo() {
  const t = useTranslations('booking.wizard.step3');
  const { data, updateData, nextStep, prevStep } = useBookingWizard();

  const [mode, setMode] = useState<'existing' | 'new'>(data.customerId ? 'existing' : 'new');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers', searchQuery],
    queryFn: () => apiClient.get('/customers', { search: searchQuery }),
    enabled: mode === 'existing' && searchQuery.length > 1,
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerName: data.customerName || '',
      customerEmail: data.customerEmail || '',
      customerPhone: data.customerPhone || '',
      notes: data.notes || '',
    },
  });

  const handleExistingCustomerSelect = (customerId: string) => {
    const customer = customers?.find((c) => c.id === parseInt(customerId));
    if (customer) {
      updateData({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email || undefined,
        customerPhone: customer.phone || undefined,
      });
      form.setValue('customerName', customer.name);
      form.setValue('customerEmail', customer.email || '');
      form.setValue('customerPhone', customer.phone || '');
    }
  };

  const onSubmit = (values: CustomerFormValues) => {
    updateData({
      customerName: values.customerName,
      customerEmail: values.customerEmail || undefined,
      customerPhone: values.customerPhone || undefined,
      notes: values.notes || undefined,
    });
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t('title')}</h2>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'existing' ? 'default' : 'outline'}
            onClick={() => setMode('existing')}
            className="flex-1"
          >
            {t('existingCustomer')}
          </Button>
          <Button
            variant={mode === 'new' ? 'default' : 'outline'}
            onClick={() => setMode('new')}
            className="flex-1"
          >
            {t('newCustomer')}
          </Button>
        </div>

        {mode === 'existing' && (
          <div className="space-y-2">
            <Label>{t('searchCustomer')}</Label>
            <Input
              placeholder={t('searchCustomer')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {customers && customers.length > 0 && (
              <Select onValueChange={handleExistingCustomerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t('searchCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} {customer.email && `(${customer.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={mode === 'existing' && !!data.customerId} />
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
                    <Input type="email" {...field} disabled={mode === 'existing' && !!data.customerId} />
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
                    <Input type="tel" {...field} disabled={mode === 'existing' && !!data.customerId} />
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
              <Button type="button" variant="outline" onClick={prevStep}>
                {t('../../common.back')}
              </Button>
              <Button type="submit">{t('../../common.next')}</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
