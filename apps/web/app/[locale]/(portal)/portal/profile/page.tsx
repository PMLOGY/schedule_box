'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalProfile, useUpdatePortalProfile } from '@/hooks/use-portal-queries';

interface ProfileFormValues {
  name: string;
  phone: string;
}

export default function PortalProfilePage() {
  const t = useTranslations('portal.profile');
  const { data: profile, isLoading } = usePortalProfile();
  const updateMutation = useUpdatePortalProfile();

  const form = useForm<ProfileFormValues>({
    defaultValues: { name: '', phone: '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateMutation.mutateAsync(values);
      toast.success(t('saved'));
    } catch {
      toast.error(t('saveError'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('personalInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" {...form.register('name')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" value={profile?.email || ''} disabled />
              <p className="text-xs text-muted-foreground">{t('emailReadOnly')}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input id="phone" {...form.register('phone')} placeholder="+420..." />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('saving') : t('save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
