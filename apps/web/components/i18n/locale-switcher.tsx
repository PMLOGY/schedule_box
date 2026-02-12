'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const locales = [
  { code: 'cs', label: 'Čeština', abbr: 'CS' },
  { code: 'sk', label: 'Slovenčina', abbr: 'SK' },
  { code: 'en', label: 'English', abbr: 'EN' },
] as const;

export function LocaleSwitcher() {
  const t = useTranslations('accessibility');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Select value={locale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="w-[120px]" aria-label={t('selectLanguage')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc.code} value={loc.code}>
            <span className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{loc.abbr}</span>
              <span>{loc.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
