import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, X } from 'lucide-react';

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

function TriggerNode({ id, data }: NodeProps) {
  const nodeData = data as TriggerNodeData;
  const { deleteElements } = useReactFlow();
  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);
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
        <span className="flex-1 font-semibold text-blue-900">Trigger</span>
        <button
          onClick={handleDelete}
          className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Odstranit"
        >
          <X className="h-4 w-4" />
        </button>
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
