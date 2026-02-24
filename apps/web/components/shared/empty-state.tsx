'use client';

import { Link } from '@/lib/i18n/navigation';
import { type LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export function EmptyState({
  icon: Icon = Inbox,
  illustration,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const renderAction = (
    actionDef: EmptyStateAction,
    variant: 'default' | 'outline' = 'default',
  ) => {
    if (actionDef.href) {
      return (
        <Button variant={variant} asChild>
          <Link href={actionDef.href as Parameters<typeof Link>[0]['href']}>{actionDef.label}</Link>
        </Button>
      );
    }
    return (
      <Button variant={variant} onClick={actionDef.onClick}>
        {actionDef.label}
      </Button>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg bg-gradient-to-b from-muted/30 to-transparent">
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="mt-2 text-lg font-semibold text-center">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && renderAction(action, 'default')}
          {secondaryAction && renderAction(secondaryAction, 'outline')}
        </div>
      )}
    </div>
  );
}
