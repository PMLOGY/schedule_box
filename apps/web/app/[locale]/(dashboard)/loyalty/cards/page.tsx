'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { useLoyaltyCards, useCreateCard } from '@/hooks/use-loyalty-queries';
import { CreditCard, Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';

// ============================================================================
// ISSUE CARD DIALOG
// ============================================================================

function IssueCardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [customerId, setCustomerId] = useState('');
  const createCard = useCreateCard();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCard.mutate(
      { customer_id: customerId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setCustomerId('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Loyalty Card</DialogTitle>
          <DialogDescription>Create a new loyalty card for a customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-id">Customer UUID</Label>
            <Input
              id="customer-id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer UUID"
              required
            />
            <p className="text-xs text-muted-foreground">
              The customer UUID from the customer management page
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCard.isPending || !customerId}>
              {createCard.isPending ? 'Issuing...' : 'Issue Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LoyaltyCardsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [customerFilter, setCustomerFilter] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const limit = 20;

  const { data, isLoading } = useLoyaltyCards({
    page,
    limit,
    customer_id: customerFilter || undefined,
  });

  const cards = data?.data ?? [];
  const pagination = data?.meta;

  const handleRowClick = (cardUuid: string) => {
    router.push(`loyalty/cards/${cardUuid}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty Cards"
        description="View and manage customer loyalty cards"
        actions={
          <Button onClick={() => setIssueDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Issue Card
          </Button>
        }
      />

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label className="mb-2 block text-sm">Customer UUID (optional)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={customerFilter}
                  onChange={(e) => {
                    setCustomerFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by customer UUID..."
                  className="pl-9"
                />
              </div>
            </div>
            {customerFilter && (
              <Button
                variant="ghost"
                onClick={() => {
                  setCustomerFilter('');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2">
              <CreditCard className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No loyalty cards</p>
              <p className="text-sm text-muted-foreground">
                {customerFilter
                  ? 'No cards found for this customer'
                  : 'Cards are created when customers join your program'}
              </p>
              <Button size="sm" className="mt-2" onClick={() => setIssueDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Issue Card
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Points Balance</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow
                      key={card.uuid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(card.uuid)}
                    >
                      <TableCell className="font-mono text-sm">{card.cardNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{card.customer.name}</p>
                          {card.customer.email && (
                            <p className="text-xs text-muted-foreground">{card.customer.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {card.pointsBalance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {card.currentTier ? (
                          <Badge
                            style={{
                              backgroundColor: card.currentTier.color,
                              color: '#fff',
                            }}
                          >
                            {card.currentTier.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(card.createdAt).toLocaleDateString('cs-CZ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Issue Card Dialog */}
      <IssueCardDialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen} />
    </div>
  );
}
