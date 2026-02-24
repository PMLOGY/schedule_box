import { getTranslations } from 'next-intl/server';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// TODO: Replace placeholder testimonials with real customer reviews before launch
const TESTIMONIALS = [
  {
    name: 'Jana N.',
    company: 'Salon Krása Praha',
    initials: 'JN',
    quote:
      'ScheduleBox nám ušetřil hodiny práce s rezervacemi. Zákazníci si rezervují sami a my se můžeme soustředit na svou práci.',
  },
  {
    name: 'Martin V.',
    company: 'FitZone Gym',
    initials: 'MV',
    quote: 'Díky AI predikcím jsme snížili absence o 35 %. Nejlepší investice do našeho fitka.',
  },
  {
    name: 'Petra K.',
    company: 'Masážní studio Relax',
    initials: 'PK',
    quote: 'Konečně systém, který rozumí českému trhu. Platby přes Comgate fungují bezchybně.',
  },
];

export async function SocialProof() {
  const t = await getTranslations('landing.social');

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.name}>
              <CardContent className="pt-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm text-muted-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{t('placeholder')}</p>
      </div>
    </section>
  );
}
