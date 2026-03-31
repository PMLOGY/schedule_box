'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CreditCard, Plus, Clock, Ticket } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// TYPES
// ============================================================================

interface MembershipType {
  id: string;
  name: string;
  type: 'monthly' | 'annual' | 'punch_card';
  price: string;
  currency: string | null;
  punchesIncluded: number | null;
  durationDays: number | null;
}

interface CustomerMembership {
  id: string;
  membershipType: {
    id: string;
    name: string;
    type: 'monthly' | 'annual' | 'punch_card';
  };
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  startDate: string;
  endDate: string | null;
  remainingUses: number | null;
  punchesIncluded?: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusBadgeVariant(
  status: string,
): 'glass-green' | 'glass-red' | 'glass-gray' | 'glass-amber' {
  switch (status) {
    case 'active':
      return 'glass-green';
    case 'expired':
      return 'glass-red';
    case 'cancelled':
      return 'glass-gray';
    case 'suspended':
      return 'glass-amber';
    default:
      return 'glass-gray';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktivni';
    case 'expired':
      return 'Vyprselo';
    case 'cancelled':
      return 'Zruseno';
    case 'suspended':
      return 'Pozastaveno';
    default:
      return status;
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'monthly':
      return 'Mesicni';
    case 'annual':
      return 'Rocni';
    case 'punch_card':
      return 'Vstupenkova karta';
    default:
      return type;
  }
}

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

interface CustomerMembershipsProps {
  customerId: string;
}

export function CustomerMemberships({ customerId }: CustomerMembershipsProps) {
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch customer memberships
  const fetchMemberships = async () => {
    try {
      const res = await fetch(`/api/v1/customers/${customerId}/memberships`);
      if (res.ok) {
        const json = await res.json();
        setMemberships(json.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available membership types
  const fetchTypes = async () => {
    try {
      const res = await fetch('/api/v1/memberships');
      if (res.ok) {
        const json = await res.json();
        setMembershipTypes(json.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch membership types:', error);
    }
  };

  useEffect(() => {
    fetchMemberships();
    fetchTypes();
  }, [customerId]);

  // Handle assign membership
  const handleAssign = async () => {
    if (!selectedTypeId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/customers/${customerId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipTypeId: selectedTypeId,
          startDate,
        }),
      });

      if (res.ok) {
        toast.success('Clenstvi bylo prirazeno');
        setDialogOpen(false);
        setSelectedTypeId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        fetchMemberships();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error(error?.error?.message || 'Nepodarilo se priradit clenstvi');
      }
    } catch {
      toast.error('Nepodarilo se priradit clenstvi');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card variant="glass" className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Clenstvi</h3>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Priradit
          </Button>
        </div>

        {memberships.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Zadne clenstvi</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Priradit clenstvi
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {memberships.map((membership) => (
              <MembershipCard key={membership.id} membership={membership} />
            ))}
          </div>
        )}
      </Card>

      {/* Assign Membership Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Priradit clenstvi</DialogTitle>
            <DialogDescription>Vyberte typ clenstvi a datum zahajeni.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="membership-type">Typ clenstvi</Label>
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger id="membership-type">
                  <SelectValue placeholder="Vyberte typ clenstvi" />
                </SelectTrigger>
                <SelectContent>
                  {membershipTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({getTypeLabel(type.type)}) - {type.price}{' '}
                      {type.currency || 'CZK'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start-date">Datum zahajeni</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrusit
            </Button>
            <Button onClick={handleAssign} disabled={!selectedTypeId || submitting}>
              {submitting ? 'Priradit...' : 'Priradit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// MEMBERSHIP CARD SUB-COMPONENT
// ============================================================================

function MembershipCard({ membership }: { membership: CustomerMembership }) {
  const daysRemaining = getDaysRemaining(membership.endDate);
  const isPunchCard = membership.membershipType.type === 'punch_card';

  // Calculate punch card progress
  const punchTotal = (membership as CustomerMembership & { punchesIncluded?: number | null })
    .punchesIncluded;
  const punchRemaining = membership.remainingUses ?? 0;
  const punchPercent = punchTotal ? (punchRemaining / punchTotal) * 100 : 0;

  return (
    <div className="rounded-lg border bg-card/50 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPunchCard ? (
            <Ticket className="h-4 w-4 text-primary" />
          ) : (
            <Clock className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium">{membership.membershipType.name}</span>
          <Badge variant="glass-blue" className="text-xs">
            {getTypeLabel(membership.membershipType.type)}
          </Badge>
        </div>
        <Badge variant={getStatusBadgeVariant(membership.status)}>
          {getStatusLabel(membership.status)}
        </Badge>
      </div>

      {/* Dates row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Od: {formatDate(membership.startDate)}</span>
        {membership.endDate && <span>Do: {formatDate(membership.endDate)}</span>}
        {daysRemaining !== null && membership.status === 'active' && (
          <span className={daysRemaining <= 7 ? 'text-amber-500 font-medium' : ''}>
            {daysRemaining === 0
              ? 'Vyprsi dnes'
              : `${daysRemaining} ${daysRemaining === 1 ? 'den' : daysRemaining < 5 ? 'dny' : 'dnu'} zbyva`}
          </span>
        )}
      </div>

      {/* Punch card progress */}
      {isPunchCard && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Zbyvajicich navstev</span>
            <span className="font-medium">
              {punchRemaining}/{punchTotal ?? '?'}
            </span>
          </div>
          <Progress value={punchPercent} className="h-2" />
        </div>
      )}
    </div>
  );
}
