/**
 * Dynamic Pricing Dashboard
 *
 * Admin page for checking AI-optimized prices for services.
 * Uses a "Price Check" form approach to avoid N+1 queries:
 * admin selects a service, enters context parameters, and sees the optimized price.
 *
 * Handles fallback states gracefully with info banners when AI is unavailable.
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { useDynamicPricing } from '@/hooks/useOptimization';
import { apiClient } from '@/lib/api-client';
import { TrendingUp, AlertCircle, DollarSign } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Service {
  id: number;
  uuid: string;
  name: string;
  price: string;
  currency: string;
  is_active: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================================================
// PRICE CHECK FORM
// ============================================================================

function PriceCheckForm({
  services,
  onCheck,
}: {
  services: Service[];
  onCheck: (params: {
    serviceId: number;
    priceMin: number;
    priceMax: number;
    hourOfDay: number;
    dayOfWeek: number;
    utilization: number;
    staticPrice: number;
    currency: string;
  }) => void;
}) {
  const [serviceId, setServiceId] = useState<string>('');
  const [hourOfDay, setHourOfDay] = useState(new Date().getHours());
  const [dayOfWeek, setDayOfWeek] = useState(new Date().getDay());
  const [utilization, setUtilization] = useState(50);

  const selectedService = services.find((s) => s.id === parseInt(serviceId));
  const staticPrice = selectedService ? parseFloat(selectedService.price) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !selectedService) return;

    const price = parseFloat(selectedService.price);
    // 30% constraint range
    const priceMin = price * 0.7;
    const priceMax = price * 1.3;

    onCheck({
      serviceId: parseInt(serviceId),
      priceMin,
      priceMax,
      hourOfDay,
      dayOfWeek,
      utilization: utilization / 100,
      staticPrice: price,
      currency: selectedService.currency,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pricing-service">Service</Label>
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger id="pricing-service">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id.toString()}>
                {service.name} ({service.price} {service.currency})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="pricing-hour">Hour of Day ({hourOfDay}:00)</Label>
          <Input
            id="pricing-hour"
            type="range"
            min={0}
            max={23}
            value={hourOfDay}
            onChange={(e) => setHourOfDay(parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            {hourOfDay}:00 - {hourOfDay}:59
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing-day">Day of Week</Label>
          <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
            <SelectTrigger id="pricing-day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_NAMES.map((name, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing-util">Utilization ({utilization}%)</Label>
          <Input
            id="pricing-util"
            type="range"
            min={0}
            max={100}
            value={utilization}
            onChange={(e) => setUtilization(parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Current capacity usage</p>
        </div>
      </div>

      <Button type="submit" disabled={!serviceId}>
        <TrendingUp className="mr-2 h-4 w-4" />
        Check Price
      </Button>
    </form>
  );
}

// ============================================================================
// PRICE RESULT
// ============================================================================

function PriceResult({
  serviceId,
  priceMin,
  priceMax,
  hourOfDay,
  dayOfWeek,
  utilization,
  staticPrice,
  currency,
}: {
  serviceId: number;
  priceMin: number;
  priceMax: number;
  hourOfDay: number;
  dayOfWeek: number;
  utilization: number;
  staticPrice: number;
  currency: string;
}) {
  const { data, isLoading, isError } = useDynamicPricing(serviceId, priceMin, priceMax, {
    hourOfDay,
    dayOfWeek,
    utilization,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">
            Failed to fetch pricing data. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const priceDiff = data.optimal_price - staticPrice;
  const priceDiffPercent = ((priceDiff / staticPrice) * 100).toFixed(1);
  const isHigher = priceDiff > 0;
  const isLower = priceDiff < 0;

  return (
    <div className="space-y-4">
      {data.fallback && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            AI pricing is not available — showing static prices.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Static Price</p>
              <p className="text-xl font-medium">
                {staticPrice.toFixed(0)} {currency}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Optimized Price</p>
              <p className="text-2xl font-bold text-primary">
                {data.optimal_price.toFixed(0)} {currency}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Difference</p>
              <p
                className={`text-lg font-medium ${
                  isHigher
                    ? 'text-green-600 dark:text-green-400'
                    : isLower
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground'
                }`}
              >
                {isHigher ? '+' : ''}
                {priceDiffPercent}%
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.round(data.confidence * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{Math.round(data.confidence * 100)}%</span>
              </div>
              {data.constrained && (
                <Badge
                  variant="outline"
                  className="mt-1 text-xs text-orange-600 dark:text-orange-400"
                >
                  Constrained
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PricingDashboard() {
  const [checkParams, setCheckParams] = useState<{
    serviceId: number;
    priceMin: number;
    priceMax: number;
    hourOfDay: number;
    dayOfWeek: number;
    utilization: number;
    staticPrice: number;
    currency: string;
  } | null>(null);

  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['services', { is_active: true }],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Service[] }>('/services', { is_active: true });
      return Array.isArray(res) ? res : res.data;
    },
  });

  if (isLoadingServices) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dynamic Pricing" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dynamic Pricing" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Dynamic pricing will be available after sufficient booking data is collected.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dynamic Pricing"
        description="AI-optimized pricing adjusts service prices within a 30% range based on demand, time of day, and capacity utilization."
      />

      {/* Price Check Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Price Check
          </CardTitle>
          <CardDescription>
            Select a service and set context parameters to see the AI-optimized price. Prices are
            constrained to within 30% of the static price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PriceCheckForm services={services} onCheck={setCheckParams} />
        </CardContent>
      </Card>

      {/* Price Result */}
      {checkParams && <PriceResult {...checkParams} />}
    </div>
  );
}
