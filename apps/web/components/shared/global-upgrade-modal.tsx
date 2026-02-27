'use client';

import { useEffect, useState } from 'react';
import { getOnLimitError, setOnLimitError } from '@/lib/query-client';
import { UpgradeModal } from './upgrade-modal';

interface UpgradeState {
  open: boolean;
  resource: string;
  current: number;
  limit: number;
  plan: string;
}

/**
 * Global upgrade modal rendered inside NextIntlClientProvider context.
 * Listens for 402 PLAN_LIMIT_EXCEEDED errors via the query-client callback.
 */
export function GlobalUpgradeModal() {
  const [state, setState] = useState<UpgradeState>({
    open: false,
    resource: '',
    current: 0,
    limit: 0,
    plan: 'free',
  });

  useEffect(() => {
    const handler = (details: {
      resource: string;
      current: number;
      limit: number;
      plan: string;
    }) => {
      setState({ open: true, ...details });
    };
    setOnLimitError(handler);
    return () => {
      // Only clear if we're still the active handler
      if (getOnLimitError() === handler) {
        setOnLimitError(null);
      }
    };
  }, []);

  return (
    <UpgradeModal
      open={state.open}
      onOpenChange={(open) => {
        if (!open) setState((prev) => ({ ...prev, open: false }));
      }}
      resource={state.resource}
      current={state.current}
      limit={state.limit}
      plan={state.plan}
    />
  );
}
