'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Loader2,
  Scissors,
  Dumbbell,
  Heart,
  Stethoscope,
  Car,
  GraduationCap,
  Camera,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INDUSTRY_TEMPLATES } from '@/lib/onboarding/industry-templates';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// ICON MAP — maps template.icon string to Lucide component
// ============================================================================

const ICON_MAP: Record<string, LucideIcon> = {
  Scissors,
  Dumbbell,
  Heart,
  Stethoscope,
  Car,
  GraduationCap,
  Camera,
  Sparkles,
};

// ============================================================================
// PROPS
// ============================================================================

interface IndustryTemplatePickerProps {
  /** Called after a template is successfully applied */
  onTemplateApplied?: (industryType: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function IndustryTemplatePicker({ onTemplateApplied }: IndustryTemplatePickerProps) {
  const t = useTranslations('onboarding.templates');
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);

  const handleApplyTemplate = async (industryType: string) => {
    setApplyingTemplate(industryType);
    try {
      await apiClient.post('/onboarding/apply-template', { industry_type: industryType });

      toast.success(t('applied'));
      onTemplateApplied?.(industryType);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nastala chyba. Zkuste to znovu.');
    } finally {
      setApplyingTemplate(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{t('title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INDUSTRY_TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon] ?? Sparkles;
          const isApplying = applyingTemplate === template.industryType;
          const isAnyApplying = applyingTemplate !== null;

          const minPrice = Math.min(...template.services.map((s) => s.price));
          const sampleNames = template.services
            .slice(0, 3)
            .map((s) => s.name)
            .join(', ');

          return (
            <Button
              key={template.industryType}
              type="button"
              variant="outline"
              disabled={isAnyApplying}
              onClick={() => handleApplyTemplate(template.industryType)}
              className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary"
            >
              <div className="flex items-center gap-2 w-full">
                {isApplying ? (
                  <Loader2 className="h-5 w-5 animate-spin shrink-0 text-primary" />
                ) : (
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                )}
                <span className="font-medium">{template.nameCs}</span>
              </div>

              <div className="space-y-1 w-full">
                <p className="text-xs text-muted-foreground line-clamp-1">{sampleNames}…</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('servicesCount', { count: template.services.length })}</span>
                  <span>{t('priceFrom', { price: minPrice })}</span>
                </div>
              </div>

              {isApplying && <p className="text-xs text-primary w-full">{t('applying')}</p>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
