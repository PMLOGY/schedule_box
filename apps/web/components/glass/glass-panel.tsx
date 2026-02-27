import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassPanelVariants = cva('relative rounded-lg', {
  variants: {
    intensity: {
      subtle: 'glass-surface-subtle',
      medium: 'glass-surface',
      heavy: 'glass-surface-heavy',
    },
  },
  defaultVariants: {
    intensity: 'medium',
  },
});

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof glassPanelVariants> {}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, intensity, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(glassPanelVariants({ intensity }), className)} {...props} />
    );
  },
);

GlassPanel.displayName = 'GlassPanel';

export { GlassPanel, glassPanelVariants };
