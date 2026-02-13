import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, X } from 'lucide-react';

type TimeUnit = 'minutes' | 'hours' | 'days';

export interface DelayNodeData extends Record<string, unknown> {
  delayMinutes?: number;
  onChange?: (delayMinutes: number) => void;
}

function DelayNode({ id, data }: NodeProps) {
  const nodeData = data as DelayNodeData;
  const { deleteElements } = useReactFlow();
  const [value, setValue] = useState(0);
  const [unit, setUnit] = useState<TimeUnit>('minutes');

  // Initialize from delayMinutes
  useEffect(() => {
    if (nodeData.delayMinutes !== undefined) {
      const minutes = nodeData.delayMinutes;
      if (minutes % 1440 === 0) {
        setValue(minutes / 1440);
        setUnit('days');
      } else if (minutes % 60 === 0) {
        setValue(minutes / 60);
        setUnit('hours');
      } else {
        setValue(minutes);
        setUnit('minutes');
      }
    }
  }, [nodeData.delayMinutes]);

  const convertToMinutes = useCallback((val: number, timeUnit: TimeUnit): number => {
    switch (timeUnit) {
      case 'minutes':
        return val;
      case 'hours':
        return val * 60;
      case 'days':
        return val * 1440;
      default:
        return val;
    }
  }, []);

  const handleValueChange = useCallback(
    (newValue: number) => {
      setValue(newValue);
      if (nodeData.onChange) {
        nodeData.onChange(convertToMinutes(newValue, unit));
      }
    },
    [nodeData, unit, convertToMinutes],
  );

  const handleUnitChange = useCallback(
    (newUnit: TimeUnit) => {
      setUnit(newUnit);
      if (nodeData.onChange) {
        nodeData.onChange(convertToMinutes(value, newUnit));
      }
    },
    [nodeData, value, convertToMinutes],
  );

  return (
    <div className="rounded-lg border-2 border-amber-500 bg-white p-4 shadow-lg">
      <Handle type="target" position={Position.Top} className="h-3 w-3 !bg-amber-500" />
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-500" />
        <span className="flex-1 font-semibold text-amber-900">Zpoždění</span>
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Odstranit"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-w-[240px] gap-2">
        <Input
          type="number"
          min="0"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleValueChange(Number(e.target.value))
          }
          className="flex-1"
        />
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minut</SelectItem>
            <SelectItem value="hours">Hodin</SelectItem>
            <SelectItem value="days">Dní</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Handle type="source" position={Position.Bottom} className="h-3 w-3 !bg-amber-500" />
    </div>
  );
}

export default memo(DelayNode);
