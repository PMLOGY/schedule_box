'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useResourceTypesQuery,
  useResourcesQuery,
  useCreateResourceType,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  type Resource,
} from '@/hooks/use-resources-query';

type TabValue = 'types' | 'resources';

interface ResourceTypeFormData {
  name: string;
  description: string;
}

interface ResourceFormData {
  name: string;
  description: string;
  resource_type_id: string;
  quantity: string;
}

const defaultTypeFormData: ResourceTypeFormData = {
  name: '',
  description: '',
};

const defaultResourceFormData: ResourceFormData = {
  name: '',
  description: '',
  resource_type_id: 'none',
  quantity: '1',
};

export default function ResourcesPage() {
  const t = useTranslations('resources');
  const tCommon = useTranslations('common');

  const [activeTab, setActiveTab] = useState<TabValue>('resources');

  // Resource type dialog state
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeFormData, setTypeFormData] = useState<ResourceTypeFormData>({
    ...defaultTypeFormData,
  });

  // Resource dialogs state
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceFormData, setResourceFormData] = useState<ResourceFormData>({
    ...defaultResourceFormData,
  });

  // Edit resource dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editFormData, setEditFormData] = useState<ResourceFormData & { is_active: boolean }>({
    ...defaultResourceFormData,
    is_active: true,
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

  // Queries
  const { data: resourceTypes, isLoading: typesLoading } = useResourceTypesQuery();
  const { data: resources, isLoading: resourcesLoading } = useResourcesQuery();

  // Mutations
  const createTypeMutation = useCreateResourceType();
  const createResourceMutation = useCreateResource();
  const updateResourceMutation = useUpdateResource();
  const deleteResourceMutation = useDeleteResource();

  // Handlers - Resource Types
  const handleCreateType = async () => {
    if (!typeFormData.name.trim()) return;
    try {
      await createTypeMutation.mutateAsync({
        name: typeFormData.name,
        ...(typeFormData.description.trim() && { description: typeFormData.description }),
      });
      setTypeDialogOpen(false);
      setTypeFormData({ ...defaultTypeFormData });
    } catch {
      // Error handled by mutation state
    }
  };

  // Handlers - Resources
  const handleCreateResource = async () => {
    if (!resourceFormData.name.trim()) return;
    try {
      await createResourceMutation.mutateAsync({
        name: resourceFormData.name,
        ...(resourceFormData.description.trim() && { description: resourceFormData.description }),
        ...(resourceFormData.resource_type_id !== 'none' && {
          resource_type_id: parseInt(resourceFormData.resource_type_id),
        }),
        quantity: parseInt(resourceFormData.quantity) || 1,
      });
      setResourceDialogOpen(false);
      setResourceFormData({ ...defaultResourceFormData });
    } catch {
      // Error handled by mutation state
    }
  };

  const handleRowClick = (resource: Resource) => {
    setEditingResource(resource);
    setEditFormData({
      name: resource.name,
      description: resource.description || '',
      resource_type_id: resource.resource_type ? String(resource.resource_type.id) : 'none',
      quantity: String(resource.quantity),
      is_active: resource.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateResource = async () => {
    if (!editingResource || !editFormData.name.trim()) return;
    try {
      await updateResourceMutation.mutateAsync({
        uuid: editingResource.uuid,
        name: editFormData.name,
        description: editFormData.description || undefined,
        resource_type_id:
          editFormData.resource_type_id !== 'none'
            ? parseInt(editFormData.resource_type_id)
            : undefined,
        quantity: parseInt(editFormData.quantity) || 1,
        is_active: editFormData.is_active,
      });
      setEditDialogOpen(false);
      setEditingResource(null);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, resource: Resource) => {
    e.stopPropagation();
    setDeletingResource(resource);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingResource) return;
    try {
      await deleteResourceMutation.mutateAsync(deletingResource.uuid);
      setDeleteDialogOpen(false);
      setDeletingResource(null);
    } catch {
      // Error handled by mutation state
    }
  };

  const renderTypeSelect = (value: string, onChange: (value: string) => void) => (
    <div className="grid gap-2">
      <Label>{t('form.type')}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t('form.noType')}</SelectItem>
          {resourceTypes?.map((rt) => (
            <SelectItem key={rt.id} value={String(rt.id)}>
              {rt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title={t('title')} description={t('description')} />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'resources'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('resources')}
        >
          {t('tabs.resources')}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'types'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('types')}
        >
          {t('tabs.types')}
        </button>
      </div>

      {/* Resource Types Tab */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setTypeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addType')}
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.description')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typesLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      {tCommon('loading')}
                    </TableCell>
                  </TableRow>
                ) : !resourceTypes || resourceTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      {t('noTypes')}
                    </TableCell>
                  </TableRow>
                ) : (
                  resourceTypes.map((rt) => (
                    <TableRow key={rt.id}>
                      <TableCell className="font-medium">{rt.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {rt.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setResourceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addResource')}
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.type')}</TableHead>
                  <TableHead className="text-right">{t('columns.quantity')}</TableHead>
                  <TableHead>{t('columns.status')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resourcesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {tCommon('loading')}
                    </TableCell>
                  </TableRow>
                ) : !resources || resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('noResources')}
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((resource) => (
                    <TableRow
                      key={resource.uuid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(resource)}
                    >
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {resource.resource_type?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">{resource.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={resource.is_active ? 'default' : 'secondary'}>
                          {resource.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(resource);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => handleDeleteClick(e, resource)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add Resource Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addTypeTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type-name">{t('form.name')} *</Label>
              <Input
                id="type-name"
                value={typeFormData.name}
                onChange={(e) => setTypeFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type-description">{t('form.description')}</Label>
              <Textarea
                id="type-description"
                value={typeFormData.description}
                onChange={(e) =>
                  setTypeFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            {createTypeMutation.isError && (
              <p className="text-sm text-destructive">{t('createError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCreateType}
              disabled={!typeFormData.name.trim() || createTypeMutation.isPending}
            >
              {createTypeMutation.isPending ? tCommon('loading') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addResourceTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="resource-name">{t('form.name')} *</Label>
              <Input
                id="resource-name"
                value={resourceFormData.name}
                onChange={(e) => setResourceFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resource-description">{t('form.description')}</Label>
              <Textarea
                id="resource-description"
                value={resourceFormData.description}
                onChange={(e) =>
                  setResourceFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            {renderTypeSelect(resourceFormData.resource_type_id, (value) =>
              setResourceFormData((prev) => ({ ...prev, resource_type_id: value })),
            )}
            <div className="grid gap-2">
              <Label htmlFor="resource-quantity">{t('form.quantity')}</Label>
              <Input
                id="resource-quantity"
                type="number"
                min="1"
                value={resourceFormData.quantity}
                onChange={(e) =>
                  setResourceFormData((prev) => ({ ...prev, quantity: e.target.value }))
                }
              />
            </div>
            {createResourceMutation.isError && (
              <p className="text-sm text-destructive">{t('createError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCreateResource}
              disabled={!resourceFormData.name.trim() || createResourceMutation.isPending}
            >
              {createResourceMutation.isPending ? tCommon('loading') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editResourceTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-resource-name">{t('form.name')} *</Label>
              <Input
                id="edit-resource-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-resource-description">{t('form.description')}</Label>
              <Textarea
                id="edit-resource-description"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            {renderTypeSelect(editFormData.resource_type_id, (value) =>
              setEditFormData((prev) => ({ ...prev, resource_type_id: value })),
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-resource-quantity">{t('form.quantity')}</Label>
              <Input
                id="edit-resource-quantity"
                type="number"
                min="1"
                value={editFormData.quantity}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-resource-active">{t('form.status')}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {editFormData.is_active ? t('active') : t('inactive')}
                </span>
                <Switch
                  id="edit-resource-active"
                  checked={editFormData.is_active}
                  onCheckedChange={(checked) =>
                    setEditFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
            </div>
            {updateResourceMutation.isError && (
              <p className="text-sm text-destructive">{t('updateError')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleUpdateResource}
              disabled={!editFormData.name.trim() || updateResourceMutation.isPending}
            >
              {updateResourceMutation.isPending ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            {t('deleteConfirm', { name: deletingResource?.name || '' })}
          </p>
          {deleteResourceMutation.isError && (
            <p className="text-sm text-destructive">{t('deleteError')}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteResourceMutation.isPending}
            >
              {deleteResourceMutation.isPending ? tCommon('loading') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
