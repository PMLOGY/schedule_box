'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useRewards, useCreateReward, useUpdateReward } from '@/hooks/use-loyalty-queries';
import { useLoyaltyStore } from '@/stores/loyalty.store';
import { Gift, Plus, Pencil, XCircle } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RewardType } from '@schedulebox/shared/types';

// ============================================================================
// REWARD TYPE LABELS
// ============================================================================

const rewardTypeLabels: Record<RewardType, string> = {
  discount_percentage: 'Discount %',
  discount_fixed: 'Fixed Discount',
  free_service: 'Free Service',
  gift: 'Gift',
};

// ============================================================================
// REWARD FORM DIALOG
// ============================================================================

function RewardFormDialog({
  open,
  onOpenChange,
  editingReward,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingReward?: {
    id: number;
    name: string;
    description: string | null;
    pointsCost: number;
    rewardType: RewardType;
    rewardValue: number | null;
    maxRedemptions: number | null;
  } | null;
}) {
  const [name, setName] = useState(editingReward?.name ?? '');
  const [description, setDescription] = useState(editingReward?.description ?? '');
  const [pointsCost, setPointsCost] = useState(editingReward?.pointsCost ?? 100);
  const [rewardType, setRewardType] = useState<RewardType>(
    editingReward?.rewardType ?? 'discount_percentage',
  );
  const [rewardValue, setRewardValue] = useState<number | undefined>(
    editingReward?.rewardValue ?? undefined,
  );
  const [maxRedemptions, setMaxRedemptions] = useState<number | undefined>(
    editingReward?.maxRedemptions ?? undefined,
  );

  const createReward = useCreateReward();
  const updateReward = useUpdateReward();

  const isEditing = !!editingReward;
  const isPending = createReward.isPending || updateReward.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      description: description || undefined,
      points_cost: pointsCost,
      reward_type: rewardType,
      reward_value: rewardValue,
      max_redemptions: maxRedemptions,
    };

    if (isEditing && editingReward) {
      updateReward.mutate(
        { id: editingReward.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );
    } else {
      createReward.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPointsCost(100);
    setRewardType('discount_percentage');
    setRewardValue(undefined);
    setMaxRedemptions(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Reward' : 'Add Reward'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the reward details.'
              : 'Create a new reward for your loyalty program.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reward-name">Name</Label>
            <Input
              id="reward-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 10% Off Next Booking"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward-description">Description</Label>
            <Input
              id="reward-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reward description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reward-points">Points Cost</Label>
              <Input
                id="reward-points"
                type="number"
                min={1}
                value={pointsCost}
                onChange={(e) => setPointsCost(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-type">Reward Type</Label>
              <Select value={rewardType} onValueChange={(v) => setRewardType(v as RewardType)}>
                <SelectTrigger id="reward-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount_percentage">Discount %</SelectItem>
                  <SelectItem value="discount_fixed">Fixed Discount</SelectItem>
                  <SelectItem value="free_service">Free Service</SelectItem>
                  <SelectItem value="gift">Gift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reward-value">
                Value <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="reward-value"
                type="number"
                min={1}
                value={rewardValue ?? ''}
                onChange={(e) =>
                  setRewardValue(e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder={rewardType === 'discount_percentage' ? 'e.g. 10' : 'e.g. 100'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-max">
                Max Redemptions <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="reward-max"
                type="number"
                min={1}
                value={maxRedemptions ?? ''}
                onChange={(e) =>
                  setMaxRedemptions(e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="Unlimited"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name}>
              {isPending ? 'Saving...' : isEditing ? 'Update Reward' : 'Create Reward'}
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

export default function RewardsPage() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const isActiveParam =
    activeFilter === 'all' ? undefined : activeFilter === 'active' ? true : false;

  const { data, isLoading } = useRewards({
    page,
    limit,
    is_active: isActiveParam,
  });

  const { rewardFormOpen, openRewardForm, closeRewardForm, editingRewardId } = useLoyaltyStore();

  const updateReward = useUpdateReward();

  const rewards = data?.data ?? [];
  const pagination = data?.meta;

  // Find the reward being edited
  const editingReward = editingRewardId
    ? (rewards.find((r) => String(r.id) === editingRewardId) ?? null)
    : null;

  const handleDeactivate = (rewardId: number, currentlyActive: boolean) => {
    updateReward.mutate({
      id: rewardId,
      data: { is_active: !currentlyActive },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards Catalog"
        description="Manage rewards customers can redeem with points"
        actions={
          <Button onClick={() => openRewardForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Reward
          </Button>
        }
      />

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <Label className="mb-2 block text-sm">Status</Label>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2">
              <Gift className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No rewards yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first reward for customers to redeem
              </p>
              <Button size="sm" className="mt-2" onClick={() => openRewardForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Reward
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell className="font-medium">{reward.name}</TableCell>
                      <TableCell>{reward.pointsCost.toLocaleString()} pts</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rewardTypeLabels[reward.rewardType]}</Badge>
                      </TableCell>
                      <TableCell>
                        {reward.currentRedemptions}
                        {reward.maxRedemptions ? ` / ${reward.maxRedemptions}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant={reward.isActive ? 'default' : 'secondary'}>
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRewardForm(String(reward.id))}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(reward.id, reward.isActive)}
                            disabled={updateReward.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
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

      {/* Reward Form Dialog */}
      <RewardFormDialog
        open={rewardFormOpen}
        onOpenChange={(open) => {
          if (!open) closeRewardForm();
        }}
        editingReward={editingReward}
      />
    </div>
  );
}
