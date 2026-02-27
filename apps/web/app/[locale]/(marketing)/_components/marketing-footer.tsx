import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'ScheduleBox s.r.o.';
const COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Příkladná 1, 110 00 Praha 1';
const COMPANY_ICO = process.env.NEXT_PUBLIC_COMPANY_ICO || '12345678';
const COMPANY_DIC = process.env.NEXT_PUBLIC_COMPANY_DIC || 'CZ12345678';

export async function MarketingFooter() {
  const t = await getTranslations('landing.footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-glass glass-surface-subtle">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company info */}
          <div>
            <h3 className="text-lg font-bold text-primary">ScheduleBox</h3>
            <address className="mt-3 space-y-1 text-sm not-italic text-muted-foreground">
              <p>{COMPANY_NAME}</p>
              <p>{COMPANY_ADDRESS}</p>
              <p>IČO: {COMPANY_ICO}</p>
              <p>DIČ: {COMPANY_DIC}</p>
            </address>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold">{t('product')}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#features" className="hover:text-foreground">
                  {t('featuresLink')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground">
                  {t('pricingLink')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold">{t('legal')}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  {t('privacyLink')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  {t('termsLink')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold">{t('contact')}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>info@schedulebox.cz</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>{t('copyright', { year: String(year) })}</p>
          <p className="mt-1">{t('registryNote')}</p>
        </div>
      </div>
    </footer>
  );
}
