'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Bell, Plus, Edit, Trash2, Send } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/i18n/navigation';

type NotificationChannel = 'email' | 'sms' | 'push';
type NotificationTemplateType =
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_cancellation'
  | 'payment_confirmation'
  | 'payment_reminder'
  | 'review_request'
  | 'welcome'
  | 'loyalty_update'
  | 'follow_up'
  | 'custom';

interface NotificationTemplate {
  id: number;
  type: NotificationTemplateType;
  channel: NotificationChannel;
  subject: string | null;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateForm {
  type: NotificationTemplateType;
  channel: NotificationChannel;
  subject: string;
  bodyTemplate: string;
  isActive: boolean;
}

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  push: Bell,
};

const TEMPLATE_TYPES: NotificationTemplateType[] = [
  'booking_confirmation',
  'booking_reminder',
  'booking_cancellation',
  'payment_confirmation',
  'payment_reminder',
  'review_request',
  'welcome',
  'loyalty_update',
  'follow_up',
  'custom',
];

const defaultForm: TemplateForm = {
  type: 'booking_confirmation',
  channel: 'email',
  subject: '',
  bodyTemplate: '',
  isActive: true,
};

function TemplateFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isPending,
  title,
  description,
  submitLabel,
  pendingLabel,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TemplateForm;
  setForm: (form: TemplateForm) => void;
  onSubmit: () => void;
  isPending: boolean;
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  t: ReturnType<typeof useTranslations<'notificationTemplates'>>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="type">{t('form.type')}</Label>
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm({ ...form, type: value as NotificationTemplateType })
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('form.channel')}</Label>
            <div className="mt-2 flex gap-4">
              {(['email', 'sms', 'push'] as NotificationChannel[]).map((channel) => {
                const Icon = channelIcons[channel];
                return (
                  <label
                    key={channel}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border-2 p-3 transition-colors ${
                      form.channel === channel ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={channel}
                      checked={form.channel === channel}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          channel: e.target.value as NotificationChannel,
                        })
                      }
                      className="sr-only"
                    />
                    <Icon className="h-5 w-5" />
                    <span className="font-medium uppercase text-xs">{channel}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {(form.channel === 'email' || form.channel === 'push') && (
            <div>
              <Label htmlFor="subject">{t('form.subject')}</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder={t('form.subjectPlaceholder')}
              />
            </div>
          )}

          <div>
            <Label htmlFor="bodyTemplate">{t('form.body')}</Label>
            <Textarea
              id="bodyTemplate"
              value={form.bodyTemplate}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm({ ...form, bodyTemplate: e.target.value })
              }
              placeholder={t('form.bodyPlaceholder')}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label>{t('form.status')}</Label>
            <div className="mt-2 flex rounded-md border">
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-l-md px-4 py-2 text-sm font-medium transition-colors',
                  form.isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
                onClick={() => setForm({ ...form, isActive: true })}
              >
                {t('active')}
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-r-md px-4 py-2 text-sm font-medium transition-colors',
                  !form.isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
                onClick={() => setForm({ ...form, isActive: false })}
              >
                {t('inactive')}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('form.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TemplatesPage() {
  const t = useTranslations('notificationTemplates');
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [createForm, setCreateForm] = useState<TemplateForm>({ ...defaultForm });
  const [editForm, setEditForm] = useState<TemplateForm>({ ...defaultForm });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: NotificationTemplate[] }>(
        '/notification-templates',
      );
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: TemplateForm) => {
      await apiClient.post('/notification-templates', template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsCreateOpen(false);
      setCreateForm({ ...defaultForm });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateForm }) => {
      await apiClient.put(`/notification-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/notification-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(createForm);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditForm({
      type: template.type,
      channel: template.channel,
      subject: template.subject || '',
      bodyTemplate: template.bodyTemplate,
      isActive: template.isActive,
    });
    setEditingTemplate(template);
  };

  const handleUpdate = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: editForm });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t('deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('newTemplate')}
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Create dialog */}
      <TemplateFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        title={t('form.createTitle')}
        description={t('form.createDescription')}
        submitLabel={t('form.create')}
        pendingLabel={t('form.creating')}
        t={t}
      />

      {/* Edit dialog */}
      <TemplateFormDialog
        open={editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null);
        }}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
        title={t('form.editTitle')}
        description={t('form.editDescription')}
        submitLabel={t('form.save')}
        pendingLabel={t('form.saving')}
        t={t}
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center space-y-2">
            <Mail className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">{t('empty')}</p>
            <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = channelIcons[template.channel];
            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">{t(`types.${template.type}`)}</CardTitle>
                    </div>
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </div>
                  {template.subject && (
                    <CardDescription className="line-clamp-1">{template.subject}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="line-clamp-3 text-sm text-muted-foreground flex-1">
                    {template.bodyTemplate}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="default" size="sm" asChild className="flex-1">
                      <Link href={`/notifications?template_id=${template.id}`}>
                        <Send className="mr-2 h-4 w-4" />
                        {t('use')}
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
