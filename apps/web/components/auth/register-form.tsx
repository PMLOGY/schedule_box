'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { Eye, EyeOff, Building2, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

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
import { cn } from '@/lib/utils';

// Password complexity regex from Phase 3: uppercase + lowercase + number + special
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

/**
 * Creates a Zod schema with translated validation messages.
 * Must be called inside a component that has access to useTranslations.
 */
function createRegisterFormSchema(tv: (key: string) => string) {
  return z
    .object({
      name: z.string().min(2, tv('nameMin')),
      email: z.string().email(tv('emailInvalid')),
      password: z
        .string()
        .min(12, tv('passwordMin'))
        .regex(passwordComplexityRegex, tv('passwordComplexity')),
      confirmPassword: z.string(),
      companyName: z.string().optional(),
      type: z.enum(['owner', 'customer']).default('owner'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tv('passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })
    .refine(
      (data) => data.type === 'customer' || (data.companyName && data.companyName.length >= 2),
      {
        message: tv('companyNameMin'),
        path: ['companyName'],
      },
    );
}

type RegisterFormValues = z.infer<ReturnType<typeof createRegisterFormSchema>>;

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const tv = useTranslations('auth.register.validation');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registrationType, setRegistrationType] = useState<'owner' | 'customer'>('owner');

  const registerFormSchema = createRegisterFormSchema(tv);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      type: 'owner',
    },
  });

  const handleTypeChange = (type: 'owner' | 'customer') => {
    setRegistrationType(type);
    form.setValue('type', type);
    if (type === 'customer') {
      form.setValue('companyName', '');
      form.clearErrors('companyName');
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          ...(registrationType === 'owner' ? { company_name: values.companyName } : {}),
          type: registrationType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.message || 'Registration failed');
      }

      const result = await response.json();
      const data = result.data || result;

      if (registrationType === 'customer') {
        // Auto-login for customer registration
        const nameParts = values.name.split(' ');
        useAuthStore.getState().setAccessToken(data.access_token);
        useAuthStore.getState().setUser({
          id: data.user.uuid,
          email: data.user.email,
          firstName: nameParts[0] || values.name,
          lastName: nameParts.slice(1).join(' ') || '',
          role: 'customer',
          companyId: '',
          companyName: '',
        });

        setSuccessMessage(t('successCustomer'));
        setTimeout(() => {
          router.push('/portal/bookings');
        }, 1000);
      } else {
        // Owner: redirect to login
        setSuccessMessage(t('successOwner'));
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Registration type toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
          <button
            type="button"
            onClick={() => handleTypeChange('owner')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              registrationType === 'owner'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Building2 className="h-4 w-4" />
            {t('businessOwner')}
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('customer')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              registrationType === 'customer'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <UserCircle className="h-4 w-4" />
            {t('customer')}
          </button>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('firstName')}</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Jan Novak" disabled={isLoading} {...field} />
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
                <FormLabel>{t('email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jan@example.com"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {registrationType === 'owner' && (
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companyName')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ma firma s.r.o."
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('password')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="************"
                      disabled={isLoading}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('confirmPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="************"
                      disabled={isLoading}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {errorMessage && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
              {successMessage}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? tCommon('loading') : t('submit')}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t('login')}
            </Link>
          </div>
        </div>
      </form>
    </Form>
  );
}
