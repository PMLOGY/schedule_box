'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Car, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Vehicle {
  id: string;
  spz: string;
  vin: string;
  make: string;
  model: string;
}

interface VehicleRecordsProps {
  metadata: Record<string, unknown> | null;
  onSave: (metadata: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
  customerId: string;
}

interface ServiceHistoryBooking {
  id: string;
  start_time: string;
  status: string;
  price: string;
  currency: string;
  notes: string | null;
  booking_metadata: Record<string, unknown> | null;
}

interface ServiceHistoryResponse {
  data: ServiceHistoryBooking[];
  meta?: { total: number };
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  confirmed: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Dokončeno',
  confirmed: 'Potvrzeno',
  pending: 'Čeká',
  cancelled: 'Zrušeno',
  no_show: 'Nedostavil se',
};

function VehicleServiceHistory({ customerId, spz }: { customerId: string; spz: string }) {
  const { data, isLoading: historyLoading } = useQuery<ServiceHistoryResponse>({
    queryKey: ['customer-bookings', customerId, 'vehicle', spz],
    queryFn: () =>
      apiClient.get<ServiceHistoryResponse>(`/customers/${customerId}/bookings`, {
        vehicle_spz: spz,
        limit: 50,
      }),
    enabled: !!spz,
  });

  const bookings =
    data?.data ?? (Array.isArray(data) ? (data as unknown as ServiceHistoryBooking[]) : []);

  if (historyLoading) {
    return (
      <div className="py-3 text-center text-sm text-muted-foreground">Nacitani historie...</div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="py-3 text-center text-sm text-muted-foreground">Zatim zadne zakazky</div>
    );
  }

  return (
    <div className="mt-3 border-t pt-3">
      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <Wrench className="h-3.5 w-3.5" />
        Historie servisu ({bookings.length})
      </h4>
      <div className="space-y-1.5">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-background/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs w-20">
                {format(new Date(booking.start_time), 'd. M. yyyy', { locale: cs })}
              </span>
              <span className="truncate max-w-[180px]">{booking.notes || 'Servis'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`text-xs ${STATUS_COLORS[booking.status] ?? ''}`}
              >
                {STATUS_LABELS[booking.status] ?? booking.status}
              </Badge>
              <span className="text-xs font-medium w-16 text-right">
                {parseFloat(booking.price).toLocaleString('cs-CZ')} {booking.currency}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_VEHICLE: Omit<Vehicle, 'id'> = { spz: '', vin: '', make: '', model: '' };

export function VehicleRecords({ metadata, onSave, isLoading, customerId }: VehicleRecordsProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(EMPTY_VEHICLE);
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (metadata && Array.isArray(metadata.vehicles)) {
      setVehicles(metadata.vehicles as Vehicle[]);
    }
  }, [metadata]);

  const openAddDialog = () => {
    setEditingVehicle(null);
    setForm(EMPTY_VEHICLE);
    setDialogOpen(true);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setForm({ spz: vehicle.spz, vin: vehicle.vin, make: vehicle.make, model: vehicle.model });
    setDialogOpen(true);
  };

  const handleSaveVehicle = async () => {
    let updatedVehicles: Vehicle[];

    if (editingVehicle) {
      updatedVehicles = vehicles.map((v) => (v.id === editingVehicle.id ? { ...v, ...form } : v));
    } else {
      const newVehicle: Vehicle = {
        id: crypto.randomUUID(),
        ...form,
      };
      updatedVehicles = [...vehicles, newVehicle];
    }

    setVehicles(updatedVehicles);
    setDialogOpen(false);
    await onSave({ ...metadata, vehicles: updatedVehicles });
  };

  const handleRemoveVehicle = async (vehicleId: string) => {
    const updatedVehicles = vehicles.filter((v) => v.id !== vehicleId);
    setVehicles(updatedVehicles);
    await onSave({ ...metadata, vehicles: updatedVehicles });
  };

  const updateField = (field: keyof Omit<Vehicle, 'id'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vozidla
          </h3>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Přidat vozidlo
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Zatím žádná vozidla. Klikněte na "Přidat vozidlo" pro přidání.
          </p>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => {
              const isExpanded = expandedVehicleId === vehicle.id;
              return (
                <Card key={vehicle.id} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">SPZ</p>
                        <p className="text-sm font-semibold">{vehicle.spz || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">VIN</p>
                        <p className="text-sm font-mono">{vehicle.vin || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Znacka</p>
                        <p className="text-sm">{vehicle.make || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Model</p>
                        <p className="text-sm">{vehicle.model || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedVehicleId(isExpanded ? null : vehicle.id)}
                        title={isExpanded ? 'Skryt historii' : 'Zobrazit historii servisu'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(vehicle)}
                        aria-label="Upravit vozidlo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveVehicle(vehicle.id)}
                        disabled={isLoading}
                        aria-label="Odebrat vozidlo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable service history */}
                  {isExpanded && vehicle.spz && (
                    <VehicleServiceHistory customerId={customerId} spz={vehicle.spz} />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Upravit vozidlo' : 'Přidat vozidlo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-spz">SPZ</Label>
                <Input
                  id="vehicle-spz"
                  placeholder="1A2 3456"
                  value={form.spz}
                  onChange={(e) => updateField('spz', e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-vin">VIN</Label>
                <Input
                  id="vehicle-vin"
                  placeholder="17 znaků"
                  value={form.vin}
                  onChange={(e) => updateField('vin', e.target.value)}
                  maxLength={17}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-make">Značka</Label>
                <Input
                  id="vehicle-make"
                  placeholder="Škoda, VW..."
                  value={form.make}
                  onChange={(e) => updateField('make', e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-model">Model</Label>
                <Input
                  id="vehicle-model"
                  placeholder="Octavia, Golf..."
                  value={form.model}
                  onChange={(e) => updateField('model', e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveVehicle} disabled={isLoading}>
              {isLoading ? 'Ukládání...' : 'Uložit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
