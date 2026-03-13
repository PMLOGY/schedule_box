'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, CalendarOff, Clock, Save } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useMyWorkingHours,
  useUpdateMyWorkingHours,
  useMyScheduleOverrides,
  useCreateScheduleOverride,
  type WorkingHour,
} from '@/hooks/use-my-schedule';

function WorkingHoursGrid() {
  const t = useTranslations('schedule');
  const { data: hours, isLoading } = useMyWorkingHours();
  const updateMutation = useUpdateMyWorkingHours();

  const [editMode, setEditMode] = useState(false);
  const [editedHours, setEditedHours] = useState<WorkingHour[]>([]);

  const startEditing = () => {
    // Initialize edited hours from current data, filling in all 7 days
    const currentHours = hours ?? [];
    const allDays: WorkingHour[] = Array.from({ length: 7 }, (_, i) => {
      const existing = currentHours.find((h) => h.day_of_week === i);
      return (
        existing ?? {
          day_of_week: i,
          start_time: '09:00',
          end_time: '17:00',
          is_active: false,
        }
      );
    });
    setEditedHours(allDays);
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      // Always send all 7 days so inactive days are persisted correctly
      await updateMutation.mutateAsync(editedHours);
      toast.success(t('hoursUpdated'));
      setEditMode(false);
    } catch {
      toast.error(t('hoursUpdateError'));
    }
  };

  const updateHour = (dayOfWeek: number, field: keyof WorkingHour, value: string | boolean) => {
    setEditedHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h)),
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('workingHours')}
        </CardTitle>
        {editMode ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startEditing}>
            {t('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(editMode
            ? editedHours
            : Array.from({ length: 7 }, (_, i) => {
                const existing = (hours ?? []).find((h) => h.day_of_week === i);
                return (
                  existing ?? {
                    day_of_week: i,
                    start_time: '-',
                    end_time: '-',
                    is_active: false,
                  }
                );
              })
          ).map((hour) => (
            <div key={hour.day_of_week} className="flex items-center gap-4 rounded-lg border p-3">
              <div className="w-20 font-medium text-sm">{t(`days.${hour.day_of_week}`)}</div>

              {editMode ? (
                <>
                  <Switch
                    checked={hour.is_active ?? false}
                    onCheckedChange={(checked) =>
                      updateHour(hour.day_of_week, 'is_active', checked)
                    }
                  />
                  <Input
                    type="time"
                    value={hour.start_time}
                    onChange={(e) => updateHour(hour.day_of_week, 'start_time', e.target.value)}
                    className="w-28"
                    disabled={!hour.is_active}
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={hour.end_time}
                    onChange={(e) => updateHour(hour.day_of_week, 'end_time', e.target.value)}
                    className="w-28"
                    disabled={!hour.is_active}
                  />
                </>
              ) : (
                <>
                  {hour.is_active ? (
                    <Badge variant="default" className="text-xs">
                      {hour.start_time} - {hour.end_time}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {t('dayOff')}
                    </Badge>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleOverridesList() {
  const t = useTranslations('schedule');
  const { data: overrides, isLoading } = useMyScheduleOverrides();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    is_day_off: true,
    reason: '',
    start_time: '',
    end_time: '',
  });
  const createMutation = useCreateScheduleOverride();

  const handleCreate = async () => {
    if (!form.startDate) return;
    try {
      const start = new Date(form.startDate);
      const end = form.endDate ? new Date(form.endDate) : start;

      // Create one override per day in the range
      const dates: string[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(cursor.toISOString().split('T')[0]);
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const date of dates) {
        await createMutation.mutateAsync({
          date,
          is_day_off: form.is_day_off,
          reason: form.reason || undefined,
          start_time: form.is_day_off ? undefined : form.start_time || undefined,
          end_time: form.is_day_off ? undefined : form.end_time || undefined,
        });
      }

      toast.success(t('overrideCreated'));
      setDialogOpen(false);
      setForm({
        startDate: '',
        endDate: '',
        is_day_off: true,
        reason: '',
        start_time: '',
        end_time: '',
      });
    } catch {
      toast.error(t('overrideCreateError'));
    }
  };

  const today = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            {t('scheduleOverrides')}
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('requestDayOff')}
          </Button>
        </CardHeader>
        <CardContent>
          {!overrides || overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('noOverrides')}</p>
          ) : (
            <div className="space-y-2">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-sm">{override.date}</div>
                    {override.is_day_off ? (
                      <Badge variant="destructive" className="text-xs">
                        {t('dayOff')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {override.start_time} - {override.end_time}
                      </Badge>
                    )}
                    {override.date >= today && (
                      <Badge variant="secondary" className="text-xs">
                        {t('active')}
                      </Badge>
                    )}
                  </div>
                  {override.reason && (
                    <span className="text-sm text-muted-foreground">{override.reason}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Day Off Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('requestDayOff')}</DialogTitle>
            <DialogDescription>{t('requestDayOffDescription')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">{t('date')} *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">{t('endDate')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_day_off"
                  checked={form.is_day_off}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, is_day_off: checked }))
                  }
                />
                <Label htmlFor="is_day_off">{t('fullDayOff')}</Label>
              </div>
              {!form.is_day_off && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_time">{t('startTime')}</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end_time">{t('endTime')}</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="reason">{t('reason')}</Label>
                <Input
                  id="reason"
                  value={form.reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder={t('reasonPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={!form.startDate || createMutation.isPending}>
                {createMutation.isPending ? t('saving') : t('submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SchedulePage() {
  const t = useTranslations('schedule');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WorkingHoursGrid />
        <ScheduleOverridesList />
      </div>
    </div>
  );
}
