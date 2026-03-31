'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { type Service } from '@/hooks/use-services-query';
import { useCurrencyFormat } from '@/hooks/use-currency-format';

interface ServiceListSortableProps {
  services: Service[];
  onRowClick: (service: Service) => void;
}

function SortableServiceRow({
  service,
  onRowClick,
  formatPrice,
  t,
}: {
  service: Service;
  onRowClick: (service: Service) => void;
  formatPrice: (value: string | number) => string;
  t: ReturnType<typeof useTranslations<'services'>>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.uuid,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onRowClick(service)}
    >
      <TableCell className="w-10">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: service.color }}
          />
          <span className="font-medium">{service.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {service.category_name || t('uncategorized')}
      </TableCell>
      <TableCell>
        {service.duration_minutes} {t('minutes')}
      </TableCell>
      <TableCell className="text-right">{formatPrice(service.price)}</TableCell>
      <TableCell className="text-right">{service.max_capacity}</TableCell>
      <TableCell>
        <Badge variant={service.online_booking_enabled ? 'default' : 'outline'}>
          {service.online_booking_enabled ? t('yes') : t('no')}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={service.is_active ? 'default' : 'secondary'}>
          {service.is_active ? t('active') : t('inactive')}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export function ServiceListSortable({
  services: initialServices,
  onRowClick,
}: ServiceListSortableProps) {
  const t = useTranslations('services');
  const { formatCurrency: formatPrice } = useCurrencyFormat();
  const [items, setItems] = useState<Service[]>(initialServices);

  // Update local state when props change
  React.useEffect(() => {
    setItems(initialServices);
  }, [initialServices]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((s) => s.uuid === active.id);
      const newIndex = items.findIndex((s) => s.uuid === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      const orderedIds = newItems.map((s) => s.uuid);

      try {
        await apiClient.patch('/services/reorder', { orderedIds });
        toast.success(t('reorder.success'));
      } catch {
        // Revert on failure
        setItems(items);
        toast.error(t('reorder.error'));
      }
    },
    [items, t],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((s) => s.uuid)} strategy={verticalListSortingStrategy}>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.category')}</TableHead>
                <TableHead>{t('columns.duration')}</TableHead>
                <TableHead className="text-right">{t('columns.price')}</TableHead>
                <TableHead className="text-right">{t('columns.capacity')}</TableHead>
                <TableHead>{t('columns.onlineBooking')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((service) => (
                <SortableServiceRow
                  key={service.uuid}
                  service={service}
                  onRowClick={onRowClick}
                  formatPrice={formatPrice}
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
}
