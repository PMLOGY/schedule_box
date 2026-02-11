/**
 * Upselling Suggestions Widget
 *
 * Displays AI-powered service recommendations in the booking wizard Step 1.
 * Self-contained: fetches its own data, handles its own loading/error states.
 *
 * Design principles:
 * - Never blocks the booking flow (no loading spinner)
 * - Shows nothing when AI is unavailable (graceful degradation)
 * - Subtle visual presence (does not compete with main service selection)
 * - Max 3 recommendations displayed
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useUpselling } from '@/hooks/useOptimization';

interface UpsellingSuggestionsProps {
  selectedServiceId: number | null;
  onAddService?: (serviceId: number) => void;
}

export function UpsellingSuggestions({
  selectedServiceId,
  onAddService,
}: UpsellingSuggestionsProps) {
  const { data, isLoading, isError } = useUpselling(selectedServiceId);

  // Do NOT show spinner while loading - upselling must not block flow
  if (isLoading) {
    return null;
  }

  // Graceful empty state on error or no recommendations
  if (isError || !data || !data.recommendations || data.recommendations.length === 0) {
    return null;
  }

  // Limit to max 3 recommendations
  const recommendations = data.recommendations.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Frequently combined with</span>
      </div>

      <div className="grid gap-2">
        {recommendations.map((rec) => (
          <Card key={rec.service_id} className="border-dashed border-muted-foreground/25">
            <CardContent className="flex items-center justify-between p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Service #{rec.service_id}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(rec.confidence * 100)}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rec.reason}</p>
              </div>

              {onAddService && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddService(rec.service_id)}
                  className="ml-4 shrink-0"
                >
                  Add
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.fallback && (
        <p className="text-xs text-muted-foreground/60">Suggestions based on general patterns</p>
      )}
    </div>
  );
}
