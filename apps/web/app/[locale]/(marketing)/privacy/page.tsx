// TODO: Replace with legal-approved privacy policy content before launch
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'ScheduleBox s.r.o.';
const COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Příkladná 1, 110 00 Praha 1';
const COMPANY_ICO = process.env.NEXT_PUBLIC_COMPANY_ICO || '12345678';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing.meta' });

  return {
    title: t('privacyTitle'),
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing.privacy');

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}: 1. 1. 2026</p>

      <div className="mt-8 space-y-8 text-base leading-7">
        <section>
          <h2 className="text-xl font-semibold">1. Správce osobních údajů</h2>
          <p className="mt-2 text-muted-foreground">
            Správcem osobních údajů je {COMPANY_NAME}, IČO: {COMPANY_ICO}, se sídlem{' '}
            {COMPANY_ADDRESS} (dále jen &quot;Správce&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Jaké údaje shromažďujeme</h2>
          <p className="mt-2 text-muted-foreground">
            Shromažďujeme následující kategorie osobních údajů: identifikační údaje (jméno,
            příjmení), kontaktní údaje (e-mail, telefon), údaje o rezervacích a platbách, technické
            údaje (IP adresa, typ prohlížeče) a údaje z cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Účel zpracování</h2>
          <p className="mt-2 text-muted-foreground">
            Osobní údaje zpracováváme za účelem poskytování služby ScheduleBox, správy uživatelských
            účtů, zpracování plateb, zasílání notifikací o rezervacích, zlepšování služby pomocí
            analytiky a plnění zákonných povinností.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Právní základ</h2>
          <p className="mt-2 text-muted-foreground">
            Zpracování probíhá na základě plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR), oprávněného
            zájmu správce (čl. 6 odst. 1 písm. f) GDPR), souhlasu subjektu údajů (čl. 6 odst. 1
            písm. a) GDPR) a plnění zákonných povinností (čl. 6 odst. 1 písm. c) GDPR).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Doba uchovávání</h2>
          <p className="mt-2 text-muted-foreground">
            Osobní údaje uchováváme po dobu trvání smluvního vztahu a dále po dobu stanovenou
            příslušnými právními předpisy (zejména daňové a účetní předpisy — 10 let). Po uplynutí
            této doby budou údaje bezpečně smazány.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Práva subjektů údajů</h2>
          <p className="mt-2 text-muted-foreground">
            Máte právo na přístup ke svým osobním údajům, právo na opravu, výmaz, omezení
            zpracování, přenositelnost údajů a právo vznést námitku proti zpracování. Svá práva
            můžete uplatnit kontaktováním Správce na e-mailové adrese privacy@schedulebox.cz. Máte
            také právo podat stížnost u Úřadu pro ochranu osobních údajů (ÚOOÚ).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            Používáme technické cookies nezbytné pro fungování služby. Analytické a marketingové
            cookies ukládáme pouze s vaším výslovným souhlasem, který můžete kdykoliv odvolat.
            Podrobnosti najdete v cookie liště na našem webu.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Kontakt na pověřence</h2>
          <p className="mt-2 text-muted-foreground">
            V případě dotazů ohledně zpracování osobních údajů nás kontaktujte na
            privacy@schedulebox.cz.
          </p>
        </section>
      </div>
    </article>
  );
}
