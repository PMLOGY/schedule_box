'use client';

import React, { type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const t = useTranslations('errors');

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">{t('generic')}</h3>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <p className="mt-2 text-sm text-muted-foreground break-all">{error.message}</p>
          )}
          <Button className="mt-4" onClick={onReset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}
