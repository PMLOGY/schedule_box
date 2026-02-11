import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap } from 'lucide-react';

export type TriggerType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'booking_no_show'
  | 'payment_received'
  | 'customer_created'
  | 'review_received';

const triggerLabels: Record<TriggerType, string> = {
  booking_created: 'Rezervace vytvořena',
  booking_confirmed: 'Rezervace potvrzena',
  booking_completed: 'Rezervace dokončena',
  booking_cancelled: 'Rezervace zrušena',
  booking_no_show: 'Zákazník nedorazil',
  payment_received: 'Platba přijata',
  customer_created: 'Zákazník vytvořen',
  review_received: 'Recenze přijata',
};

export interface TriggerNodeData extends Record<string, unknown> {
  triggerType?: TriggerType;
  onChange?: (triggerType: TriggerType) => void;
}

function TriggerNode({ data }: NodeProps) {
  const nodeData = data as TriggerNodeData;
  const handleChange = useCallback(
    (value: TriggerType) => {
      if (nodeData.onChange) {
        nodeData.onChange(value);
      }
    },
    [nodeData],
  );

  return (
    <div className="rounded-lg border-2 border-blue-500 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-5 w-5 text-blue-500" />
        <span className="font-semibold text-blue-900">Trigger</span>
      </div>
      <div className="min-w-[240px]">
        <Select value={nodeData.triggerType} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Vyberte trigger" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(triggerLabels) as TriggerType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {triggerLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Handle type="source" position={Position.Bottom} className="h-3 w-3 !bg-blue-500" />
    </div>
  );
}

export default memo(TriggerNode);
