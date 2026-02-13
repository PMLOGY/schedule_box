'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCouponsQuery,
  useGiftCardsQuery,
  useCreateCoupon,
  useCreateGiftCard,
  useUpdateCoupon,
  useUpdateGiftCard,
  type Coupon,
  type GiftCard,
} from '@/hooks/use-marketing-query';

export default function MarketingPage() {
  const t = useTranslations('marketing');
  const tCommon = useTranslations('common');

  const { data: couponsData, isLoading: couponsLoading } = useCouponsQuery();
  const { data: giftCardsData, isLoading: giftCardsLoading } = useGiftCardsQuery();

  // Coupon dialog state
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
  });

  // Gift card dialog state
  const [giftCardDialogOpen, setGiftCardDialogOpen] = useState(false);
  const [giftCardForm, setGiftCardForm] = useState({
    initial_balance: '',
    recipient_name: '',
    recipient_email: '',
  });

  // Edit coupon dialog state
  const [editCouponDialogOpen, setEditCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editCouponForm, setEditCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    is_active: true,
  });

  // Edit gift card dialog state
  const [editGiftCardDialogOpen, setEditGiftCardDialogOpen] = useState(false);
  const [editingGiftCard, setEditingGiftCard] = useState<GiftCard | null>(null);
  const [editGiftCardForm, setEditGiftCardForm] = useState({
    recipient_name: '',
    recipient_email: '',
    is_active: true,
  });

  const createCoupon = useCreateCoupon();
  const createGiftCard = useCreateGiftCard();
  const updateCoupon = useUpdateCoupon();
  const updateGiftCard = useUpdateGiftCard();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd.MM.yyyy');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('cs', {
      style: 'currency',
      currency: 'CZK',
    }).format(value);
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') return `${value} %`;
    return formatCurrency(value);
  };

  const handleCreateCoupon = async () => {
    if (!couponForm.code.trim() || !couponForm.discount_value) return;
    try {
      await createCoupon.mutateAsync({
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        description: couponForm.description || undefined,
      });
      setCouponDialogOpen(false);
      setCouponForm({ code: '', description: '', discount_type: 'percentage', discount_value: '' });
    } catch {
      // Error handled by mutation state
    }
  };

  const handleCreateGiftCard = async () => {
    const balance = parseFloat(giftCardForm.initial_balance);
    if (!giftCardForm.initial_balance || !Number.isFinite(balance) || balance <= 0) return;
    try {
      await createGiftCard.mutateAsync({
        initial_balance: balance,
        recipient_name: giftCardForm.recipient_name.trim() || undefined,
        recipient_email: giftCardForm.recipient_email.trim() || undefined,
      });
      setGiftCardDialogOpen(false);
      setGiftCardForm({ initial_balance: '', recipient_name: '', recipient_email: '' });
    } catch {
      // Error handled by mutation state
    }
  };

  const handleCouponRowClick = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditCouponForm({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type as 'percentage' | 'fixed',
      discount_value: String(coupon.discount_value),
      is_active: coupon.is_active,
    });
    setEditCouponDialogOpen(true);
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon || !editCouponForm.code.trim() || !editCouponForm.discount_value) return;
    try {
      await updateCoupon.mutateAsync({
        id: editingCoupon.id,
        code: editCouponForm.code,
        description: editCouponForm.description || undefined,
        discount_type: editCouponForm.discount_type,
        discount_value: parseFloat(editCouponForm.discount_value),
        is_active: editCouponForm.is_active,
      });
      setEditCouponDialogOpen(false);
      setEditingCoupon(null);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleGiftCardRowClick = (card: GiftCard) => {
    setEditingGiftCard(card);
    setEditGiftCardForm({
      recipient_name: card.recipient_name || '',
      recipient_email: card.recipient_email || '',
      is_active: card.is_active,
    });
    setEditGiftCardDialogOpen(true);
  };

  const handleUpdateGiftCard = async () => {
    if (!editingGiftCard) return;
    try {
      await updateGiftCard.mutateAsync({
        id: editingGiftCard.id,
        recipient_name: editGiftCardForm.recipient_name || undefined,
        recipient_email: editGiftCardForm.recipient_email || undefined,
        is_active: editGiftCardForm.is_active,
      });
      setEditGiftCardDialogOpen(false);
      setEditingGiftCard(null);
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} />

      {/* Coupons Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('coupons')}</h2>
          <Button size="sm" onClick={() => setCouponDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addCoupon')}
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('couponColumns.code')}</TableHead>
                <TableHead>{t('couponColumns.description')}</TableHead>
                <TableHead>{t('couponColumns.discount')}</TableHead>
                <TableHead>{t('couponColumns.usage')}</TableHead>
                <TableHead>{t('couponColumns.validUntil')}</TableHead>
                <TableHead>{t('couponColumns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couponsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {tCommon('loading')}
                  </TableCell>
                </TableRow>
              ) : !couponsData || couponsData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('noCoupons')}
                  </TableCell>
                </TableRow>
              ) : (
                couponsData.data.map((coupon) => (
                  <TableRow
                    key={coupon.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCouponRowClick(coupon)}
                  >
                    <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {coupon.description || '-'}
                    </TableCell>
                    <TableCell>
                      {formatDiscount(coupon.discount_type, coupon.discount_value)}
                    </TableCell>
                    <TableCell>
                      {coupon.current_uses}/{coupon.max_uses ?? t('unlimited')}
                    </TableCell>
                    <TableCell>{formatDate(coupon.valid_until)}</TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                        {coupon.is_active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Gift Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('giftCards')}</h2>
          <Button size="sm" onClick={() => setGiftCardDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addGiftCard')}
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('giftCardColumns.code')}</TableHead>
                <TableHead>{t('giftCardColumns.recipient')}</TableHead>
                <TableHead className="text-right">{t('giftCardColumns.balance')}</TableHead>
                <TableHead className="text-right">{t('giftCardColumns.initialBalance')}</TableHead>
                <TableHead>{t('giftCardColumns.validUntil')}</TableHead>
                <TableHead>{t('giftCardColumns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCardsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {tCommon('loading')}
                  </TableCell>
                </TableRow>
              ) : !giftCardsData || giftCardsData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('noGiftCards')}
                  </TableCell>
                </TableRow>
              ) : (
                giftCardsData.data.map((card) => (
                  <TableRow
                    key={card.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleGiftCardRowClick(card)}
                  >
                    <TableCell className="font-mono font-medium">{card.code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.recipient_name || card.recipient_email || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(card.current_balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(card.initial_balance)}
                    </TableCell>
                    <TableCell>{formatDate(card.valid_until)}</TableCell>
                    <TableCell>
                      <Badge variant={card.is_active ? 'default' : 'secondary'}>
                        {card.is_active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addCouponTitle')}</DialogTitle>
            <DialogDescription>{t('addCouponDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coupon-code">{t('couponForm.code')} *</Label>
              <Input
                id="coupon-code"
                value={couponForm.code}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="SUMMER2024"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coupon-desc">{t('couponForm.description')}</Label>
              <Input
                id="coupon-desc"
                value={couponForm.description}
                onChange={(e) =>
                  setCouponForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('couponForm.discountType')}</Label>
              <Select
                value={couponForm.discount_type}
                onValueChange={(value: 'percentage' | 'fixed') =>
                  setCouponForm((prev) => ({ ...prev, discount_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t('couponForm.percentage')}</SelectItem>
                  <SelectItem value="fixed">{t('couponForm.fixedAmount')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coupon-value">{t('couponForm.discountValue')} *</Label>
              <Input
                id="coupon-value"
                type="number"
                min="0"
                value={couponForm.discount_value}
                onChange={(e) =>
                  setCouponForm((prev) => ({ ...prev, discount_value: e.target.value }))
                }
              />
            </div>
            {createCoupon.isError && <p className="text-sm text-destructive">{t('createError')}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCreateCoupon}
              disabled={
                !couponForm.code.trim() || !couponForm.discount_value || createCoupon.isPending
              }
            >
              {createCoupon.isPending ? tCommon('loading') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Gift Card Dialog */}
      <Dialog open={giftCardDialogOpen} onOpenChange={setGiftCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addGiftCardTitle')}</DialogTitle>
            <DialogDescription>{t('addGiftCardDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="gc-balance">{t('giftCardForm.initialBalance')} *</Label>
              <Input
                id="gc-balance"
                type="number"
                min="1"
                step="100"
                value={giftCardForm.initial_balance}
                onChange={(e) =>
                  setGiftCardForm((prev) => ({ ...prev, initial_balance: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gc-name">{t('giftCardForm.recipientName')}</Label>
              <Input
                id="gc-name"
                value={giftCardForm.recipient_name}
                onChange={(e) =>
                  setGiftCardForm((prev) => ({ ...prev, recipient_name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gc-email">{t('giftCardForm.recipientEmail')}</Label>
              <Input
                id="gc-email"
                type="email"
                value={giftCardForm.recipient_email}
                onChange={(e) =>
                  setGiftCardForm((prev) => ({ ...prev, recipient_email: e.target.value }))
                }
              />
            </div>
            {createGiftCard.isError && (
              <p className="text-sm text-destructive">{t('createError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGiftCardDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCreateGiftCard}
              disabled={!giftCardForm.initial_balance || createGiftCard.isPending}
            >
              {createGiftCard.isPending ? tCommon('loading') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={editCouponDialogOpen} onOpenChange={setEditCouponDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editCouponTitle')}</DialogTitle>
            <DialogDescription>{t('editCouponDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-coupon-code">{t('couponForm.code')} *</Label>
              <Input
                id="edit-coupon-code"
                value={editCouponForm.code}
                onChange={(e) => setEditCouponForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-coupon-desc">{t('couponForm.description')}</Label>
              <Input
                id="edit-coupon-desc"
                value={editCouponForm.description}
                onChange={(e) =>
                  setEditCouponForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('couponForm.discountType')}</Label>
              <Select
                value={editCouponForm.discount_type}
                onValueChange={(value: 'percentage' | 'fixed') =>
                  setEditCouponForm((prev) => ({ ...prev, discount_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t('couponForm.percentage')}</SelectItem>
                  <SelectItem value="fixed">{t('couponForm.fixedAmount')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-coupon-value">{t('couponForm.discountValue')} *</Label>
              <Input
                id="edit-coupon-value"
                type="number"
                min="0"
                value={editCouponForm.discount_value}
                onChange={(e) =>
                  setEditCouponForm((prev) => ({ ...prev, discount_value: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('couponColumns.status')}</Label>
              <Select
                value={editCouponForm.is_active ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setEditCouponForm((prev) => ({ ...prev, is_active: value === 'active' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {updateCoupon.isError && <p className="text-sm text-destructive">{t('updateError')}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCouponDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleUpdateCoupon}
              disabled={
                !editCouponForm.code.trim() ||
                !editCouponForm.discount_value ||
                updateCoupon.isPending
              }
            >
              {updateCoupon.isPending ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Gift Card Dialog */}
      <Dialog open={editGiftCardDialogOpen} onOpenChange={setEditGiftCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editGiftCardTitle')}</DialogTitle>
            <DialogDescription>{t('editGiftCardDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-gc-name">{t('giftCardForm.recipientName')}</Label>
              <Input
                id="edit-gc-name"
                value={editGiftCardForm.recipient_name}
                onChange={(e) =>
                  setEditGiftCardForm((prev) => ({ ...prev, recipient_name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-gc-email">{t('giftCardForm.recipientEmail')}</Label>
              <Input
                id="edit-gc-email"
                type="email"
                value={editGiftCardForm.recipient_email}
                onChange={(e) =>
                  setEditGiftCardForm((prev) => ({ ...prev, recipient_email: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('giftCardColumns.status')}</Label>
              <Select
                value={editGiftCardForm.is_active ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setEditGiftCardForm((prev) => ({ ...prev, is_active: value === 'active' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {updateGiftCard.isError && (
              <p className="text-sm text-destructive">{t('updateError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGiftCardDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdateGiftCard} disabled={updateGiftCard.isPending}>
              {updateGiftCard.isPending ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
