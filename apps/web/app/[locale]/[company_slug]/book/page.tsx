'use client';

/**
 * Public Booking Page
 *
 * Multi-step booking flow for visitors:
 * Step 1: Select a service
 * Step 2: Select date and time slot
 * Step 3: Enter contact details
 * Step 4: Confirmation
 *
 * No authentication required.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, type Locale } from 'date-fns';
import { cs, sk, enUS } from 'date-fns/locale';
import { Link } from '@/lib/i18n/navigation';
import {
  Clock,
  Check,
  ChevronLeft,
  Loader2,
  CalendarDays,
  User,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Service {
  uuid: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  category: { id: number; name: string } | null;
  isOnline: boolean;
  imageUrl: string | null;
}

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  employeeId: number;
  employeeUuid: string;
  employeeName: string;
  isAvailable: boolean;
}

interface BookingResult {
  id: string;
  status: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: string;
    currency: string;
  };
  employee: {
    id: string;
    name: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  startTime: string;
  endTime: string;
  notes: string | null;
  createdAt: string;
}

type Step = 'service' | 'datetime' | 'details' | 'confirmation';

const STEPS: Step[] = ['service', 'datetime', 'details', 'confirmation'];

// ============================================================================
// DATE LOCALE MAP
// ============================================================================

const DATE_LOCALES: Record<string, Locale> = {
  cs: cs,
  sk: sk,
  en: enUS,
};

const INTL_LOCALES: Record<string, string> = {
  cs: 'cs-CZ',
  sk: 'sk-SK',
  en: 'en-US',
};

function formatPrice(price: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale] || locale, {
    style: 'currency',
    currency: currency || 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function PublicBookingPage() {
  const params = useParams<{ locale: string; company_slug: string }>();
  const searchParams = useSearchParams();
  const t = useTranslations('publicBooking');

  const locale = params.locale;
  const companySlug = params.company_slug;
  const queryClient = useQueryClient();
  const preselectedServiceId = searchParams.get('service');

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const dateLocale = DATE_LOCALES[locale] || cs;

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch company info
  const { data: companyData } = useQuery({
    queryKey: ['public-company', companySlug],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/company/${companySlug}`);
      if (!res.ok) throw new Error('Failed to fetch company');
      const json = await res.json();
      return json.data as { uuid: string; name: string; slug: string };
    },
  });

  // Fetch services
  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
  } = useQuery({
    queryKey: ['public-services', companySlug],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/company/${companySlug}/services`);
      if (!res.ok) throw new Error('Failed to fetch services');
      const json = await res.json();
      return json.data as Service[];
    },
  });

  // Auto-select service from URL param
  useEffect(() => {
    if (preselectedServiceId && servicesData && !selectedService) {
      const service = servicesData.find((s) => s.uuid === preselectedServiceId);
      if (service) {
        setSelectedService(service);
        setCurrentStep('datetime');
      }
    }
  }, [preselectedServiceId, servicesData, selectedService]);

  // Fetch availability for selected service and date
  const {
    data: slotsData,
    isLoading: slotsLoading,
    error: slotsError,
  } = useQuery({
    queryKey: ['public-availability', companySlug, selectedService?.uuid, selectedDate],
    queryFn: async () => {
      if (!selectedService) return [];
      const queryParams = new URLSearchParams({
        service_id: selectedService.uuid,
        date_from: selectedDate,
        date_to: selectedDate,
      });
      const res = await fetch(
        `/api/v1/public/company/${companySlug}/availability?${queryParams.toString()}`,
      );
      if (!res.ok) throw new Error('Failed to fetch availability');
      const json = await res.json();
      return (json.data?.slots as AvailabilitySlot[]) || [];
    },
    enabled: !!selectedService && currentStep === 'datetime',
  });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedService || !selectedSlot) throw new Error('Missing selection');

      const body = {
        service_id: selectedService.uuid,
        employee_id: selectedSlot.employeeUuid,
        start_time: new Date(`${selectedSlot.date}T${selectedSlot.startTime}:00`).toISOString(),
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        ...(customerPhone.trim() ? { customer_phone: customerPhone.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      const res = await fetch(`/api/v1/public/company/${companySlug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorCode = json?.error?.code;
        if (errorCode === 'SLOT_TAKEN') {
          throw new Error('SLOT_TAKEN');
        }
        throw new Error(json?.error?.message || 'Booking failed');
      }

      return json.data as BookingResult;
    },
    onSuccess: (data) => {
      setBookingResult(data);
      setCurrentStep('confirmation');
      setFormError('');
      // Invalidate availability cache so booked slots disappear
      queryClient.invalidateQueries({ queryKey: ['public-availability'] });
    },
    onError: (error: Error) => {
      if (error.message === 'SLOT_TAKEN') {
        setFormError(t('error.slotTaken'));
      } else {
        setFormError(t('error.generic'));
      }
    },
  });

  // ============================================================================
  // GROUPED SLOTS BY EMPLOYEE
  // ============================================================================

  const filteredSlots = useMemo(() => {
    if (!slotsData) return [];
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    return slotsData.filter((slot) => {
      if (slot.date === today) {
        const slotTime = new Date(`${slot.date}T${slot.startTime}:00`);
        return slotTime > now;
      }
      return true;
    });
  }, [slotsData]);

  // Group slots by employee for display
  const slotsByEmployee = useMemo(() => {
    const groups: Record<string, { name: string; id: number; slots: AvailabilitySlot[] }> = {};
    for (const slot of filteredSlots) {
      const key = String(slot.employeeId);
      if (!groups[key]) {
        groups[key] = { name: slot.employeeName, id: slot.employeeId, slots: [] };
      }
      groups[key].slots.push(slot);
    }
    return Object.values(groups);
  }, [filteredSlots]);

  // ============================================================================
  // DATE NAVIGATION
  // ============================================================================

  const dateOptions = useMemo(() => {
    const dates: string[] = [];
    const start = new Date();
    for (let i = 0; i < 14; i++) {
      dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
    }
    return dates;
  }, []);

  // ============================================================================
  // STEP NAVIGATION
  // ============================================================================

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = STEPS[currentStepIndex - 1];
      setCurrentStep(prevStep);
      if (prevStep === 'service') {
        setSelectedSlot(null);
      }
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setCurrentStep('datetime');
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setCurrentStep('details');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError(t('details.name') + ' is required');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setFormError(t('details.email') + ' is required');
      return;
    }

    bookingMutation.mutate();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{companyData?.name || companySlug}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Progress Steps */}
      {currentStep !== 'confirmation' && (
        <div className="flex items-center justify-center gap-2">
          {STEPS.filter((s) => s !== 'confirmation').map((step, index) => {
            const stepIndex = STEPS.indexOf(step);
            const isActive = stepIndex === currentStepIndex;
            const isComplete = stepIndex < currentStepIndex;
            return (
              <div key={step} className="flex items-center gap-2">
                {index > 0 && (
                  <div className={cn('w-8 h-0.5', isComplete ? 'bg-primary' : 'bg-muted')} />
                )}
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-primary/20 text-primary',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'text-sm hidden sm:inline',
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t(`steps.${step}`)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 1: Select Service */}
      {currentStep === 'service' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t('service.title')}</h2>

          {servicesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {servicesError && (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-muted-foreground">{t('error.loadServices')}</p>
              </CardContent>
            </Card>
          )}

          {servicesData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicesData.map((service) => (
                <Card
                  key={service.uuid}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    selectedService?.uuid === service.uuid && 'ring-2 ring-primary',
                  )}
                  onClick={() => handleServiceSelect(service)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {service.category && <CardDescription>{service.category.name}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {t('service.duration', { minutes: service.durationMinutes })}
                        </span>
                        <span className="font-semibold">
                          {formatPrice(service.price, service.currency, locale)}
                        </span>
                      </div>
                      <Button size="sm" variant="outline">
                        {t('service.select')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Date & Time */}
      {currentStep === 'datetime' && selectedService && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('back')}
            </Button>
            <h2 className="text-xl font-semibold">{t('datetime.title')}</h2>
          </div>

          {/* Selected service summary */}
          <Card className="bg-muted/50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{selectedService.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedService.durationMinutes} min &middot;{' '}
                  {formatPrice(selectedService.price, selectedService.currency, locale)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Date picker - horizontal scrollable */}
          <div>
            <Label className="text-sm font-medium mb-2 block">{t('datetime.selectDate')}</Label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dateOptions.map((date) => {
                const dateObj = new Date(date + 'T12:00:00');
                const isSelected = date === selectedDate;
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                    className={cn(
                      'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50',
                    )}
                  >
                    <span className="text-xs uppercase">
                      {format(dateObj, 'EEE', { locale: dateLocale })}
                    </span>
                    <span className="text-lg font-semibold">{format(dateObj, 'd')}</span>
                    <span className="text-xs">
                      {format(dateObj, 'MMM', { locale: dateLocale })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          <div>
            <Label className="text-sm font-medium mb-2 block">{t('datetime.availableSlots')}</Label>

            {slotsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">{t('datetime.loadingSlots')}</span>
              </div>
            )}

            {slotsError && (
              <div className="py-4 text-center">
                <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('error.loadSlots')}</p>
              </div>
            )}

            {!slotsLoading && !slotsError && filteredSlots.length === 0 && (
              <Card>
                <CardContent className="py-6 text-center">
                  <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('datetime.noSlots')}</p>
                </CardContent>
              </Card>
            )}

            {!slotsLoading && filteredSlots.length > 0 && (
              <div className="space-y-5">
                {slotsByEmployee.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{group.name}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {group.slots.map((slot, idx) => {
                        const isSelected =
                          selectedSlot?.startTime === slot.startTime &&
                          selectedSlot?.employeeId === slot.employeeId;
                        const isAvailable = slot.isAvailable !== false;
                        return (
                          <button
                            key={`${slot.startTime}-${slot.employeeId}-${idx}`}
                            onClick={() => isAvailable && handleSlotSelect(slot)}
                            disabled={!isAvailable}
                            className={cn(
                              'py-2 px-3 rounded-md border text-sm font-medium transition-colors',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : isAvailable
                                  ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100 hover:border-green-400 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50'
                                  : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500',
                            )}
                          >
                            {slot.startTime}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Contact Details */}
      {currentStep === 'details' && selectedService && selectedSlot && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('back')}
            </Button>
            <h2 className="text-xl font-semibold">{t('details.title')}</h2>
          </div>

          {/* Booking summary */}
          <Card className="bg-muted/50">
            <CardContent className="py-3 px-4 space-y-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(new Date(selectedSlot.date + 'T12:00:00'), 'EEEE d. MMMM', {
                    locale: dateLocale,
                  })}{' '}
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>
                  {t('datetime.employee')}: {selectedSlot.employeeName}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact form */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('details.name')} *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('details.namePlaceholder')}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('details.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={t('details.emailPlaceholder')}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('details.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={t('details.phonePlaceholder')}
                    autoComplete="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t('details.notes')}</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('details.notesPlaceholder')}
                    maxLength={1000}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{formError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={bookingMutation.isPending}
                >
                  {bookingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('details.submitting')}
                    </>
                  ) : (
                    t('details.submit')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 'confirmation' && bookingResult && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t('confirmation.title')}</h2>
              <p className="text-muted-foreground">{t('confirmation.description')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('confirmation.bookingId')}</span>
                <span className="font-mono text-sm">{bookingResult.id.slice(0, 8)}...</span>
              </div>
              <p className="text-xs text-muted-foreground pb-1">
                {t('confirmation.trackDescription')}
              </p>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('confirmation.service')}</span>
                <span className="font-medium">{bookingResult.service.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('confirmation.datetime')}</span>
                <span className="font-medium">
                  {format(new Date(bookingResult.startTime), 'EEEE d. MMMM HH:mm', {
                    locale: dateLocale,
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('confirmation.employee')}</span>
                <span className="font-medium">{bookingResult.employee.name}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">{t('confirmation.status')}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                  {t('confirmation.statusPending')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Link href={`/${companySlug}/booking/${bookingResult.id}`} className="block w-full">
            <Button variant="outline" className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('confirmation.trackBooking')}
            </Button>
          </Link>

          <div className="flex gap-3">
            <Link href={`/${companySlug}`} className="flex-1">
              <Button variant="outline" className="w-full">
                {t('confirmation.backToCompany')}
              </Button>
            </Link>
            <Button
              className="flex-1"
              onClick={() => {
                setCurrentStep('service');
                setSelectedService(null);
                setSelectedSlot(null);
                setBookingResult(null);
                setCustomerName('');
                setCustomerEmail('');
                setCustomerPhone('');
                setNotes('');
                setFormError('');
              }}
            >
              {t('confirmation.bookAnother')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
