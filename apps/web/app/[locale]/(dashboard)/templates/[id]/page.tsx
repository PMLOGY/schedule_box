'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Handlebars from 'handlebars';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Trash2, Eye, Copy, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

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

const defaultSampleData = {
  customer_name: 'Jan Novák',
  service_name: 'Stříh vlasů',
  booking_date: new Date(Date.now() + 86400000).toLocaleDateString('cs-CZ'),
  booking_time: '14:00',
  employee_name: 'Marie',
  price: 450,
  currency: 'CZK',
  company_name: 'Krásný Salon',
};

const availableVariables = [
  { name: '{{customer_name}}', description: 'Jméno zákazníka' },
  { name: '{{service_name}}', description: 'Název služby' },
  { name: '{{booking_date}}', description: 'Datum rezervace' },
  { name: '{{booking_time}}', description: 'Čas rezervace' },
  { name: '{{employee_name}}', description: 'Jméno zaměstnance' },
  { name: '{{price}}', description: 'Cena' },
  { name: '{{currency}}', description: 'Měna' },
  { name: '{{company_name}}', description: 'Název firmy' },
];

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const templateId = Number(params.id);

  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [customDataOpen, setCustomDataOpen] = useState(false);
  const [customData, setCustomData] = useState(JSON.stringify(defaultSampleData, null, 2));
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ['notification-template', templateId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: NotificationTemplate }>(
        `/notification-templates/${templateId}`,
      );
      const data = response.data;
      setTemplate(data);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationTemplate>) => {
      await apiClient.put(`/notification-templates/${templateId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/notification-templates/${templateId}`);
    },
    onSuccess: () => {
      router.push('/templates');
    },
  });

  const handleSave = () => {
    if (template) {
      updateMutation.mutate({
        type: template.type,
        channel: template.channel,
        subject: template.subject,
        bodyTemplate: template.bodyTemplate,
        isActive: template.isActive,
      });
    }
  };

  const handleDelete = () => {
    if (confirm('Opravdu chcete smazat tuto šablonu?')) {
      deleteMutation.mutate();
    }
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const renderPreview = () => {
    if (!template) return { subject: '', body: '' };

    try {
      const data = JSON.parse(customData);
      const subjectTemplate = Handlebars.compile(template.subject || '');
      const bodyTemplate = Handlebars.compile(template.bodyTemplate);

      return {
        subject: subjectTemplate(data),
        body: bodyTemplate(data),
      };
    } catch {
      return {
        subject: 'Chyba při vykreslování šablony',
        body: 'Zkontrolujte syntax šablony nebo testovacích dat.',
      };
    }
  };

  if (isLoading || !template) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  const preview = renderPreview();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/templates')}
            aria-label="Zpet na sablony"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{typeLabels[template.type]}</h1>
            <p className="text-muted-foreground">Upravit šablonu notifikace</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Ukládání...' : 'Uložit'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Editor šablony</CardTitle>
              <CardDescription>Upravte obsah šablony s podporou Handlebars</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="type">Typ šablony</Label>
                <Select
                  value={template.type}
                  onValueChange={(value) =>
                    setTemplate({ ...template, type: value as NotificationTemplateType })
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
                <Badge className="ml-2" variant="outline">
                  {template.channel}
                </Badge>
              </div>

              {(template.channel === 'email' || template.channel === 'push') && (
                <div>
                  <Label htmlFor="subject">Předmět</Label>
                  <Input
                    id="subject"
                    value={template.subject || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTemplate({ ...template, subject: e.target.value })
                    }
                    placeholder="Např. Potvrzení rezervace"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="bodyTemplate">Obsah šablony</Label>
                <Textarea
                  id="bodyTemplate"
                  value={template.bodyTemplate}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setTemplate({ ...template, bodyTemplate: e.target.value })
                  }
                  placeholder="Použijte proměnné: {{customer_name}}, {{service_name}}, atd."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Aktivní</Label>
                <Switch
                  id="isActive"
                  checked={template.isActive}
                  onCheckedChange={(checked: boolean) =>
                    setTemplate({ ...template, isActive: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dostupné proměnné</CardTitle>
              <CardDescription>Kliknutím zkopírujete do schránky</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {availableVariables.map((variable) => (
                  <button
                    key={variable.name}
                    onClick={() => copyVariable(variable.name)}
                    className="flex items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div>
                      <code className="font-mono text-sm font-semibold">{variable.name}</code>
                      <p className="text-sm text-muted-foreground">{variable.description}</p>
                    </div>
                    {copiedVar === variable.name ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Náhled</CardTitle>
                  <CardDescription>Zobrazení s ukázkovými daty</CardDescription>
                </div>
                <Dialog open={customDataOpen} onOpenChange={setCustomDataOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Vlastní data
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vlastní testovací data</DialogTitle>
                      <DialogDescription>
                        Upravte JSON data pro náhled (formát musí být validní)
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={customData}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCustomData(e.target.value)
                      }
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <DialogFooter>
                      <Button onClick={() => setCustomDataOpen(false)}>Použít</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.subject && (
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Předmět</Label>
                  <p className="mt-1 font-semibold">{preview.subject}</p>
                </div>
              )}

              <div>
                <Label className="text-xs uppercase text-muted-foreground">Obsah</Label>
                {template.channel === 'email' ? (
                  <iframe
                    srcDoc={preview.body}
                    className="mt-2 h-96 w-full rounded-md border bg-white"
                    title="Email Preview"
                  />
                ) : (
                  <div className="mt-2 rounded-md border bg-muted p-4">
                    <p className="whitespace-pre-wrap text-sm">{preview.body}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
