import { memo, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, MessageSquare, Bell, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export type ActionType = 'send_email' | 'send_sms' | 'send_push';

const actionLabels: Record<ActionType, string> = {
  send_email: 'Odeslat email',
  send_sms: 'Odeslat SMS',
  send_push: 'Odeslat push notifikaci',
};

const actionChannels: Record<ActionType, 'email' | 'sms' | 'push'> = {
  send_email: 'email',
  send_sms: 'sms',
  send_push: 'push',
};

interface NotificationTemplate {
  id: number;
  type: string;
  channel: 'email' | 'sms' | 'push';
  subject: string | null;
  bodyTemplate: string;
  isActive: boolean;
}

export interface ActionNodeData extends Record<string, unknown> {
  actionType?: ActionType;
  actionConfig?: {
    templateId?: number;
  };
  onChange?: (actionType: ActionType, config: { templateId?: number }) => void;
}

function ActionNode({ id, data }: NodeProps) {
  const nodeData = data as ActionNodeData;
  const { deleteElements } = useReactFlow();
  const { data: allTemplates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: NotificationTemplate[] }>(
        '/api/v1/notification-templates',
      );
      return response.data;
    },
  });

  // Filter templates by action type's channel
  const templates = allTemplates?.filter((t) => {
    if (!nodeData.actionType) return false;
    return t.channel === actionChannels[nodeData.actionType];
  });

  const handleActionTypeChange = useCallback(
    (value: ActionType) => {
      if (nodeData.onChange) {
        nodeData.onChange(value, { templateId: undefined });
      }
    },
    [nodeData],
  );

  const handleTemplateChange = useCallback(
    (value: string) => {
      if (nodeData.onChange && nodeData.actionType) {
        nodeData.onChange(nodeData.actionType, { templateId: Number(value) });
      }
    },
    [nodeData],
  );

  // Auto-select first template if only one available
  useEffect(() => {
    if (
      templates &&
      templates.length === 1 &&
      !nodeData.actionConfig?.templateId &&
      nodeData.actionType &&
      nodeData.onChange
    ) {
      nodeData.onChange(nodeData.actionType, { templateId: templates[0].id });
    }
  }, [templates, nodeData.actionConfig?.templateId, nodeData.actionType, nodeData.onChange]);

  const getIcon = () => {
    if (!nodeData.actionType) return <Mail className="h-5 w-5 text-green-500" />;
    switch (nodeData.actionType) {
      case 'send_email':
        return <Mail className="h-5 w-5 text-green-500" />;
      case 'send_sms':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'send_push':
        return <Bell className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <div className="rounded-lg border-2 border-green-500 bg-white p-4 shadow-lg">
      <Handle type="target" position={Position.Top} className="h-3 w-3 !bg-green-500" />
      <div className="mb-3 flex items-center gap-2">
        {getIcon()}
        <span className="flex-1 font-semibold text-green-900">Akce</span>
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Odstranit"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-w-[240px] space-y-2">
        <Select value={nodeData.actionType} onValueChange={handleActionTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Vyberte akci" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(actionLabels) as ActionType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {actionLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {nodeData.actionType && templates && templates.length > 0 && (
          <Select
            value={nodeData.actionConfig?.templateId?.toString()}
            onValueChange={handleTemplateChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vyberte šablonu" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.subject || template.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {nodeData.actionType && templates && templates.length === 0 && (
          <p className="text-sm text-muted-foreground">Žádné šablony pro tento typ</p>
        )}
      </div>
    </div>
  );
}

export default memo(ActionNode);
