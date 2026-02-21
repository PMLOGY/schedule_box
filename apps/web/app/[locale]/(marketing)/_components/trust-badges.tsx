import { getTranslations } from 'next-intl/server';
import { Shield, Server, CreditCard, Lock } from 'lucide-react';

const BADGES = [
  { icon: Shield, key: 'gdpr' },
  { icon: Server, key: 'hosting' },
  { icon: CreditCard, key: 'payment' },
  { icon: Lock, key: 'security' },
] as const;

export async function TrustBadges() {
  const t = await getTranslations('landing.trust');

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.key} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{t(badge.key)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
