'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, KeyRound } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface UserProfile {
  uuid: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  company_id: string;
  mfa_enabled: boolean;
  email_verified: boolean;
  created_at: string;
}

// ============================================================================
// HOOKS
// ============================================================================

function useUserProfile() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<UserProfile>('/auth/me'),
    staleTime: 60_000,
  });
}

function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; phone?: string; avatar_url?: string }) =>
      apiClient.put<UserProfile>('/auth/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiClient.post('/auth/change-password', data),
  });
}

// ============================================================================
// PERSONAL INFO CARD
// ============================================================================

function PersonalInfoCard() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data: profile, isLoading } = useUserProfile();
  const updateMutation = useUpdateProfile();
  const { setUser, user: authUser } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (profile && editing) {
      setName(profile.name);
      setPhone(profile.phone || '');
    }
  }, [profile, editing]);

  const handleSave = async () => {
    try {
      const updated = await updateMutation.mutateAsync({
        name: name || undefined,
        phone: phone || undefined,
      });
      // Update auth store with new name
      if (authUser && updated.name) {
        const nameParts = updated.name.split(' ');
        setUser({
          ...authUser,
          firstName: nameParts[0] || updated.name,
          lastName: nameParts.slice(1).join(' ') || '',
        });
      }
      toast.success(t('saveSuccess'));
      setEditing(false);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('saveError'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('personalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-6 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t('personalInfo')}</CardTitle>
          <CardDescription>{t('personalInfoDescription')}</CardDescription>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {tCommon('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">{t('fields.name')}</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">{t('fields.email')}</Label>
                <Input id="profile-email" value={profile.email} disabled />
                <p className="text-xs text-muted-foreground">{t('emailReadonly')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">{t('fields.phone')}</Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('saving') : tCommon('save')}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('fields.name')}</dt>
              <dd className="mt-1">{profile.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('fields.email')}</dt>
              <dd className="mt-1">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('fields.phone')}</dt>
              <dd className="mt-1">{profile.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t('fields.role')}</dt>
              <dd className="mt-1">
                <Badge variant="secondary">{profile.role}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t('fields.memberSince')}
              </dt>
              <dd className="mt-1">{new Date(profile.created_at).toLocaleDateString(locale)}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SECURITY CARD
// ============================================================================

function SecurityCard() {
  const t = useTranslations('profile');
  const { data: profile } = useUserProfile();
  const changePassword = useChangePassword();
  const { logout } = useAuthStore();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success(t('passwordChangeSuccess'));
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Password change revokes all tokens, so log out
      setTimeout(() => logout(), 2000);
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || t('passwordChangeError'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('security')}
        </CardTitle>
        <CardDescription>{t('securityDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MFA Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t('mfaStatus')}</p>
          </div>
          <Badge variant={profile?.mfa_enabled ? 'default' : 'secondary'}>
            {profile?.mfa_enabled ? t('mfaEnabled') : t('mfaDisabled')}
          </Badge>
        </div>

        {/* Change Password */}
        <div>
          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                {t('changePassword')}
              </h4>
              <p className="text-sm text-muted-foreground">{t('changePasswordDescription')}</p>
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('currentPassword')}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  {t('backToSettings')}
                </Button>
                <Button type="submit" disabled={changePassword.isPending}>
                  {changePassword.isPending ? t('changingPassword') : t('changePassword')}
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              {t('changePassword')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ProfilePage() {
  const t = useTranslations('profile');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <PersonalInfoCard />
      <SecurityCard />
    </div>
  );
}
