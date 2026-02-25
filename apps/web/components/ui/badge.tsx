import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        glass: 'glass-surface-subtle border-glass text-foreground',
        'glass-blue':
          'border border-blue-300/30 dark:border-blue-400/20 bg-blue-100/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 supports-[backdrop-filter]:backdrop-blur-sm',
        'glass-gray':
          'border border-gray-300/30 dark:border-gray-400/20 bg-gray-100/60 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 supports-[backdrop-filter]:backdrop-blur-sm',
        'glass-red':
          'border border-red-300/30 dark:border-red-400/20 bg-red-100/60 dark:bg-red-900/40 text-red-800 dark:text-red-200 supports-[backdrop-filter]:backdrop-blur-sm',
        'glass-amber':
          'border border-amber-300/30 dark:border-amber-400/20 bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 supports-[backdrop-filter]:backdrop-blur-sm',
        'glass-green':
          'border border-green-300/30 dark:border-green-400/20 bg-green-100/60 dark:bg-green-900/40 text-green-800 dark:text-green-200 supports-[backdrop-filter]:backdrop-blur-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
