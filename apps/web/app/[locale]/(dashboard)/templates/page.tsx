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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Bell, Plus, Edit, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

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

export default function TemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<{
    type: NotificationTemplateType;
    channel: NotificationChannel;
    subject: string;
    bodyTemplate: string;
    isActive: boolean;
  }>({
    type: 'booking_confirmation',
    channel: 'email',
    subject: '',
    bodyTemplate: '',
    isActive: true,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: NotificationTemplate[] }>(
        '/api/v1/notification-templates',
      );
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      await apiClient.post('/api/v1/notification-templates', template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsCreateOpen(false);
      setNewTemplate({
        type: 'booking_confirmation',
        channel: 'email',
        subject: '',
        bodyTemplate: '',
        isActive: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/v1/notification-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(newTemplate);
  };

  const handleEdit = (id: number) => {
    router.push(`/templates/${id}`);
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vytvořit novou šablonu</DialogTitle>
              <DialogDescription>
                Vytvořte šablonu pro email, SMS nebo push notifikaci
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Typ šablony</Label>
                <Select
                  value={newTemplate.type}
                  onValueChange={(value) =>
                    setNewTemplate({ ...newTemplate, type: value as NotificationTemplateType })
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
                          newTemplate.channel === channel
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="channel"
                          value={channel}
                          checked={newTemplate.channel === channel}
                          onChange={(e) =>
                            setNewTemplate({
                              ...newTemplate,
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

              {(newTemplate.channel === 'email' || newTemplate.channel === 'push') && (
                <div>
                  <Label htmlFor="subject">Předmět</Label>
                  <Input
                    id="subject"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="Např. Potvrzení rezervace"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="bodyTemplate">Obsah šablony</Label>
                <Textarea
                  id="bodyTemplate"
                  value={newTemplate.bodyTemplate}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewTemplate({ ...newTemplate, bodyTemplate: e.target.value })
                  }
                  placeholder="Použijte proměnné: {{customer_name}}, {{service_name}}, {{booking_date}}, atd."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Aktivní</Label>
                <Switch
                  id="isActive"
                  checked={newTemplate.isActive}
                  onCheckedChange={(checked: boolean) =>
                    setNewTemplate({ ...newTemplate, isActive: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Vytváření...' : 'Vytvořit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template.id)}
                      className="flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Upravit
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
