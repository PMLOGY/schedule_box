'use client';

import { useState } from 'react';
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

const typeLabels: Record<NotificationTemplateType, string> = {
  booking_confirmation: 'Potvrzení rezervace',
  booking_reminder: 'Připomenutí',
  booking_cancellation: 'Zrušení rezervace',
  payment_confirmation: 'Potvrzení platby',
  payment_reminder: 'Připomenutí platby',
  review_request: 'Žádost o recenzi',
  welcome: 'Uvítací zpráva',
  loyalty_update: 'Aktualizace věrnostního programu',
  follow_up: 'Follow-up',
  custom: 'Vlastní',
};

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
            <Label htmlFor="type">Typ šablony</Label>
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
                {(Object.keys(typeLabels) as NotificationTemplateType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kanál</Label>
            <div className="mt-2 flex gap-4">
              {(['email', 'sms', 'push'] as NotificationChannel[]).map((channel) => {
                const Icon = channelIcons[channel];
                return (
                  <label
                    key={channel}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border-2 p-3 transition-colors ${
                      form.channel === channel ? 'border-primary bg-primary/5' : 'border-gray-300'
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
                    <span className="font-medium capitalize">{channel}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {(form.channel === 'email' || form.channel === 'push') && (
            <div>
              <Label htmlFor="subject">Předmět</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Např. Potvrzení rezervace"
              />
            </div>
          )}

          <div>
            <Label htmlFor="bodyTemplate">Obsah šablony</Label>
            <Textarea
              id="bodyTemplate"
              value={form.bodyTemplate}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm({ ...form, bodyTemplate: e.target.value })
              }
              placeholder="Použijte proměnné: {{customer_name}}, {{service_name}}, {{booking_date}}, atd."
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label>Stav</Label>
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
                Aktivní
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
                Neaktivní
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
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
    if (confirm('Opravdu chcete smazat tuto šablonu?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Šablony notifikací</h1>
          <p className="text-muted-foreground">Spravujte šablony emailů, SMS a push notifikací</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nová šablona
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
        title="Vytvořit novou šablonu"
        description="Vytvořte šablonu pro email, SMS nebo push notifikaci"
        submitLabel="Vytvořit"
        pendingLabel="Vytváření..."
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
        title="Upravit šablonu"
        description="Upravte šablonu notifikace"
        submitLabel="Uložit"
        pendingLabel="Ukládání..."
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Načítání...</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center space-y-2">
            <Mail className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Zatím žádné šablony</p>
            <p className="text-sm text-muted-foreground">
              Vytvořte první šablonu pomocí tlačítka výše
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = channelIcons[template.channel];
            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">{typeLabels[template.type]}</CardTitle>
                    </div>
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.isActive ? 'Aktivní' : 'Neaktivní'}
                    </Badge>
                  </div>
                  {template.subject && (
                    <CardDescription className="line-clamp-1">{template.subject}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {template.bodyTemplate}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" asChild className="flex-1">
                      <Link href={`/notifications?template_id=${template.id}`}>
                        <Send className="mr-2 h-4 w-4" />
                        Použít
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
