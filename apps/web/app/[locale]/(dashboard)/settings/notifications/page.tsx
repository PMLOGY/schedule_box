'use client';

import { PageHeader } from '@/components/shared/page-header';
import { PushSettingsCard } from '@/components/push/push-settings-card';

/**
 * Notifications Settings Page
 *
 * Allows users to manage push notification subscriptions and test the push pipeline.
 * Accessible from /settings/notifications.
 */
export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Notifikace" description="Nastaveni push notifikaci" />
      <PushSettingsCard />
    </div>
  );
}
