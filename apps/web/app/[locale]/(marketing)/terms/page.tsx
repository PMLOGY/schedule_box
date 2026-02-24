// TODO: Replace with legal-approved terms of service content before launch
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { Link } from '@/lib/i18n/navigation';
import type { Metadata } from 'next';

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
    title: t('termsTitle'),
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing.terms');

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}: 1. 1. 2026</p>

      <div className="mt-8 space-y-8 text-base leading-7">
        <section>
          <h2 className="text-xl font-semibold">1. Úvodní ustanovení</h2>
          <p className="mt-2 text-muted-foreground">
            Tyto obchodní podmínky upravují práva a povinnosti smluvních stran při využívání služby
            ScheduleBox provozované společností ScheduleBox s.r.o. Používáním služby vyjadřujete
            souhlas s těmito podmínkami.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Popis služby</h2>
          <p className="mt-2 text-muted-foreground">
            ScheduleBox je cloudová platforma pro správu online rezervací, plánování kapacit a
            řízení vztahů se zákazníky. Služba zahrnuje webovou aplikaci, rezervační widget pro
            vložení na webové stránky uživatele, systém notifikací a analytické nástroje.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Registrace a uživatelský účet</h2>
          <p className="mt-2 text-muted-foreground">
            Pro využívání služby je nutná registrace. Uživatel je povinen uvést pravdivé a úplné
            údaje. Za bezpečnost přihlašovacích údajů odpovídá uživatel. V případě podezření na
            neoprávněný přístup je uživatel povinen neprodleně kontaktovat poskytovatele.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Ceny a platební podmínky</h2>
          <p className="mt-2 text-muted-foreground">
            Ceny služby jsou uvedeny na stránce ceníku v českých korunách (CZK) bez DPH. Platby jsou
            zpracovávány prostřednictvím platební brány Comgate. Fakturace probíhá měsíčně nebo
            ročně dle zvoleného tarifu. V případě nezaplacení může být přístup ke službě omezen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Podmínky používání</h2>
          <p className="mt-2 text-muted-foreground">
            Uživatel se zavazuje používat službu v souladu s platnými právními předpisy České
            republiky. Je zakázáno službu využívat k nelegálním účelům, zasílání nevyžádané pošty
            nebo k jakémukoliv jednání, které by mohlo poškodit poskytovatele nebo jiné uživatele.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Omezení odpovědnosti</h2>
          <p className="mt-2 text-muted-foreground">
            Poskytovatel neodpovídá za škody vzniklé v důsledku výpadků služby způsobených třetími
            stranami, vyšší mocí nebo nesprávným použitím služby uživatelem. Celková odpovědnost
            poskytovatele je omezena na výši uhrazených poplatků za poslední 3 měsíce.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Ochrana osobních údajů</h2>
          <p className="mt-2 text-muted-foreground">
            Zpracování osobních údajů se řídí našimi{' '}
            <Link href="/privacy" className="text-primary underline hover:no-underline">
              zásadami ochrany osobních údajů
            </Link>
            . Poskytovatel vystupuje jako zpracovatel osobních údajů zákazníků uživatele ve smyslu
            GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Závěrečná ustanovení</h2>
          <p className="mt-2 text-muted-foreground">
            Tyto obchodní podmínky se řídí právním řádem České republiky. Případné spory budou
            řešeny příslušnými soudy České republiky. Poskytovatel si vyhrazuje právo tyto podmínky
            jednostranně změnit s 30denním předstihem oznámeným uživateli prostřednictvím e-mailu.
          </p>
        </section>
      </div>
    </article>
  );
}
