import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useI18n } from '@/lib/i18n';
import { 
  Shield,
  Truck,
  ShoppingCart,
  ClipboardList,
  Warehouse,
  BookOpen,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ReferenceData() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  // Order Status states
  const [orderStatusDialogOpen, setOrderStatusDialogOpen] = useState(false);
  const [deleteOrderStatusDialogOpen, setDeleteOrderStatusDialogOpen] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState(null);
  const [orderStatusName, setOrderStatusName] = useState('');
  const [orderStatusError, setOrderStatusError] = useState('');
  const [orderStatusDeleteError, setOrderStatusDeleteError] = useState('');

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: orderStatuses = [], isLoading: orderStatusesLoading } = useQuery({
    queryKey: ['orderStatuses'],
    queryFn: async () => {
      const response = await api.orderStatuses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: shipmentStatuses = [], isLoading: shipmentStatusesLoading } = useQuery({
    queryKey: ['shipmentStatuses'],
    queryFn: async () => {
      const response = await api.shipmentStatuses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: inventoryStatuses = [], isLoading: inventoryStatusesLoading } = useQuery({
    queryKey: ['inventoryStatuses'],
    queryFn: async () => {
      const response = await api.inventoryStatuses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehouseTypes = [], isLoading: warehouseTypesLoading } = useQuery({
    queryKey: ['warehouseTypes'],
    queryFn: async () => {
      const response = await api.warehouseTypes.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => api.roles.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleDialogOpen(false);
      resetRoleForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('referenceData.roles.errors.createFailed'));
      } else {
        setError(t('referenceData.roles.errors.createFailed'));
      }
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => api.roles.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setRoleDialogOpen(false);
      resetRoleForm();
      setError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('referenceData.roles.errors.updateFailed'));
      } else {
        setError(t('referenceData.roles.errors.updateFailed'));
      }
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => api.roles.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeleteDialogOpen(false);
      setCurrentRole(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || t('referenceData.roles.errors.deleteFailed'));
      } else {
        setError(t('referenceData.roles.errors.deleteFailed'));
      }
      setDeleteDialogOpen(false);
    },
  });

  const resetRoleForm = () => {
    setRoleName('');
    setCurrentRole(null);
    setError('');
  };

  const handleOpenRoleDialog = (role = null) => {
    if (role) {
      setCurrentRole(role);
      setRoleName(role.name || '');
    } else {
      resetRoleForm();
    }
    setError('');
    setRoleDialogOpen(true);
  };

  const handleCloseRoleDialog = () => {
    setRoleDialogOpen(false);
    resetRoleForm();
  };

  const handleRoleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const name = roleName.trim();
    if (!name) {
      setError(t('referenceData.roles.errors.nameRequired'));
      return;
    }

    if (name.length < 2) {
      setError(t('referenceData.roles.errors.nameMinLength'));
      return;
    }

    const data = { name };

    if (currentRole) {
      updateRoleMutation.mutate({ id: currentRole.roleId, data });
    } else {
      createRoleMutation.mutate(data);
    }
  };

  const handleDeleteRole = (role) => {
    setCurrentRole(role);
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRole = () => {
    if (!currentRole) return;

    // Check if role is used by any users
    const usersWithRole = users.filter(user => user.roleId === currentRole.roleId);
    if (usersWithRole.length > 0) {
      const count = usersWithRole.length;
      const errorMessage = count === 1 
        ? t('referenceData.roles.errors.roleInUseSingle')
        : t('referenceData.roles.errors.roleInUse', { count });
      setDeleteError(errorMessage);
      return;
    }

    setDeleteError('');
    deleteRoleMutation.mutate(currentRole.roleId);
  };

  // Order Status mutations
  const createOrderStatusMutation = useMutation({
    mutationFn: (data) => api.orderStatuses.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['orderStatuses'] });
      setOrderStatusDialogOpen(false);
      resetOrderStatusForm();
      setOrderStatusError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setOrderStatusError(err.message || t('referenceData.orderStatuses.errors.createFailed'));
      } else {
        setOrderStatusError(t('referenceData.orderStatuses.errors.createFailed'));
      }
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, data }) => api.orderStatuses.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['orderStatuses'] });
      setOrderStatusDialogOpen(false);
      resetOrderStatusForm();
      setOrderStatusError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setOrderStatusError(err.message || t('referenceData.orderStatuses.errors.updateFailed'));
      } else {
        setOrderStatusError(t('referenceData.orderStatuses.errors.updateFailed'));
      }
    },
  });

  const deleteOrderStatusMutation = useMutation({
    mutationFn: (id) => api.orderStatuses.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['orderStatuses'] });
      setDeleteOrderStatusDialogOpen(false);
      setCurrentOrderStatus(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setOrderStatusError(err.message || t('referenceData.orderStatuses.errors.deleteFailed'));
      } else {
        setOrderStatusError(t('referenceData.orderStatuses.errors.deleteFailed'));
      }
      setDeleteOrderStatusDialogOpen(false);
    },
  });

  const resetOrderStatusForm = () => {
    setOrderStatusName('');
    setCurrentOrderStatus(null);
    setOrderStatusError('');
  };

  const handleOpenOrderStatusDialog = (orderStatus = null) => {
    if (orderStatus) {
      setCurrentOrderStatus(orderStatus);
      setOrderStatusName(orderStatus.name || '');
    } else {
      resetOrderStatusForm();
    }
    setOrderStatusError('');
    setOrderStatusDialogOpen(true);
  };

  const handleCloseOrderStatusDialog = () => {
    setOrderStatusDialogOpen(false);
    resetOrderStatusForm();
  };

  const handleOrderStatusSubmit = (e) => {
    e.preventDefault();
    setOrderStatusError('');

    const name = orderStatusName.trim();
    if (!name) {
      setOrderStatusError(t('referenceData.orderStatuses.errors.nameRequired'));
      return;
    }

    if (name.length < 2) {
      setOrderStatusError(t('referenceData.orderStatuses.errors.nameMinLength'));
      return;
    }

    const data = { name };

    if (currentOrderStatus) {
      updateOrderStatusMutation.mutate({ id: currentOrderStatus.orderStatusId, data });
    } else {
      createOrderStatusMutation.mutate(data);
    }
  };

  const handleDeleteOrderStatus = (orderStatus) => {
    setCurrentOrderStatus(orderStatus);
    setOrderStatusDeleteError('');
    setDeleteOrderStatusDialogOpen(true);
  };

  const confirmDeleteOrderStatus = () => {
    if (!currentOrderStatus) return;

    // Check if order status is used by any orders
    const ordersWithStatus = supplierOrders.filter(order => order.statusId === currentOrderStatus.orderStatusId);
    if (ordersWithStatus.length > 0) {
      const count = ordersWithStatus.length;
      const errorMessage = count === 1 
        ? t('referenceData.orderStatuses.errors.statusInUseSingle')
        : t('referenceData.orderStatuses.errors.statusInUse', { count });
      setOrderStatusDeleteError(errorMessage);
      return;
    }

    setOrderStatusDeleteError('');
    deleteOrderStatusMutation.mutate(currentOrderStatus.orderStatusId);
  };

  const orderStatusColumns = [
    {
      accessorKey: 'name',
      header: t('referenceData.orderStatuses.table.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20">
            <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenOrderStatusDialog(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteOrderStatus(row.original)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const roleColumns = [
    {
      accessorKey: 'name',
      header: t('referenceData.roles.table.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenRoleDialog(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteRole(row.original)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const referenceSections = [
    {
      key: 'roles',
      title: t('referenceData.roles.title'),
      description: t('referenceData.roles.description'),
      icon: Shield,
      count: roles.length,
      isLoading: rolesLoading,
      color: 'indigo',
      items: roles,
      onManage: () => setSelectedSection('roles'),
    },
    {
      key: 'orderStatuses',
      title: t('referenceData.orderStatuses.title'),
      description: t('referenceData.orderStatuses.description'),
      icon: Truck,
      count: orderStatuses.length,
      isLoading: orderStatusesLoading,
      color: 'blue',
      items: orderStatuses,
      onManage: () => setSelectedSection('orderStatuses'),
    },
    {
      key: 'shipmentStatuses',
      title: t('referenceData.shipmentStatuses.title'),
      description: t('referenceData.shipmentStatuses.description'),
      icon: ShoppingCart,
      count: shipmentStatuses.length,
      isLoading: shipmentStatusesLoading,
      color: 'purple',
      items: shipmentStatuses,
      onManage: () => setSelectedSection('shipmentStatuses'),
    },
    {
      key: 'inventoryStatuses',
      title: t('referenceData.inventoryStatuses.title'),
      description: t('referenceData.inventoryStatuses.description'),
      icon: ClipboardList,
      count: inventoryStatuses.length,
      isLoading: inventoryStatusesLoading,
      color: 'amber',
      items: inventoryStatuses,
      onManage: () => setSelectedSection('inventoryStatuses'),
    },
    {
      key: 'warehouseTypes',
      title: t('referenceData.warehouseTypes.title'),
      description: t('referenceData.warehouseTypes.description'),
      icon: Warehouse,
      count: warehouseTypes.length,
      isLoading: warehouseTypesLoading,
      color: 'emerald',
      items: warehouseTypes,
      onManage: () => setSelectedSection('warehouseTypes'),
    },
  ];

  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
  };

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.users.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: supplierOrders = [] } = useQuery({
    queryKey: ['supplierOrders'],
    queryFn: async () => {
      const response = await api.supplierOrders.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  if (selectedSection === 'roles') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              onClick={() => setSelectedSection(null)}
            >
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('referenceData.roles.title')}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('referenceData.roles.description')}
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenRoleDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('referenceData.roles.addRole')}
          </Button>
        </div>

        <DataTable
          columns={roleColumns}
          data={roles}
          isLoading={rolesLoading}
          searchPlaceholder={t('referenceData.roles.searchPlaceholder')}
          emptyMessage={t('referenceData.roles.emptyMessage')}
        />

        <Dialog open={roleDialogOpen} onOpenChange={handleCloseRoleDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {currentRole ? t('referenceData.roles.editRole') : t('referenceData.roles.addRole')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="roleName">
                  {t('referenceData.roles.form.name')} *
                </Label>
                <Input
                  id="roleName"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder={t('referenceData.roles.form.namePlaceholder')}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('referenceData.roles.form.nameHint')}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseRoleDialog}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                >
                  {currentRole ? t('common.save') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setCurrentRole(null);
            setDeleteError('');
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('referenceData.roles.deleteConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('referenceData.roles.deleteConfirm.description', { name: currentRole?.name || '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {deleteError}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setCurrentRole(null);
                setDeleteError('');
              }}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDeleteRole();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteRoleMutation.isPending}
              >
                {deleteRoleMutation.isPending ? t('common.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (selectedSection === 'orderStatuses') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              onClick={() => setSelectedSection(null)}
            >
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('referenceData.orderStatuses.title')}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('referenceData.orderStatuses.description')}
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenOrderStatusDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('referenceData.orderStatuses.addStatus')}
          </Button>
        </div>

        <DataTable
          columns={orderStatusColumns}
          data={orderStatuses}
          isLoading={orderStatusesLoading}
          searchPlaceholder={t('referenceData.orderStatuses.searchPlaceholder')}
          emptyMessage={t('referenceData.orderStatuses.emptyMessage')}
        />

        <Dialog open={orderStatusDialogOpen} onOpenChange={handleCloseOrderStatusDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {currentOrderStatus ? t('referenceData.orderStatuses.editStatus') : t('referenceData.orderStatuses.addStatus')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleOrderStatusSubmit} className="space-y-4">
              {orderStatusError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {orderStatusError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="orderStatusName">
                  {t('referenceData.orderStatuses.form.name')} *
                </Label>
                <Input
                  id="orderStatusName"
                  value={orderStatusName}
                  onChange={(e) => setOrderStatusName(e.target.value)}
                  placeholder={t('referenceData.orderStatuses.form.namePlaceholder')}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('referenceData.orderStatuses.form.nameHint')}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseOrderStatusDialog}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOrderStatusMutation.isPending || updateOrderStatusMutation.isPending}
                >
                  {currentOrderStatus ? t('common.save') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOrderStatusDialogOpen} onOpenChange={(open) => {
          setDeleteOrderStatusDialogOpen(open);
          if (!open) {
            setCurrentOrderStatus(null);
            setOrderStatusDeleteError('');
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('referenceData.orderStatuses.deleteConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('referenceData.orderStatuses.deleteConfirm.description', { name: currentOrderStatus?.name || '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {orderStatusDeleteError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {orderStatusDeleteError}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteOrderStatusDialogOpen(false);
                setCurrentOrderStatus(null);
                setOrderStatusDeleteError('');
              }}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDeleteOrderStatus();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteOrderStatusMutation.isPending}
              >
                {deleteOrderStatusMutation.isPending ? t('common.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('referenceData.title')} 
        description={t('referenceData.description')}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {referenceSections.map((section) => {
          const Icon = section.icon;
          const colors = colorClasses[section.color];
          
          return (
            <Card 
              key={section.key} 
              className={cn(
                "transition-all duration-200 hover:shadow-lg dark:bg-slate-900 dark:border-slate-800 cursor-pointer",
                "border-2 hover:border-opacity-50",
                colors.border
              )}
              onClick={section.onManage}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "h-14 w-14 rounded-xl flex items-center justify-center",
                    colors.bg
                  )}>
                    <Icon className={cn("h-7 w-7", colors.text)} />
                  </div>
                  {section.isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <div className={cn(
                      "px-3 py-1 rounded-full text-sm font-semibold",
                      colors.bg,
                      colors.text
                    )}>
                      {section.count}
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg mb-2">{section.title}</CardTitle>
                <CardDescription className="text-sm">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {section.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : section.items.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                      {t('referenceData.items')}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {section.items.slice(0, 5).map((item, index) => {
                        const itemId = item.roleId || item.orderStatusId || item.shipmentStatusId || 
                                      item.inventoryStatusId || item.warehouseTypeId || item.id || index;
                        return (
                          <div
                            key={itemId}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg text-sm",
                              "bg-slate-50 dark:bg-slate-800/50"
                            )}
                          >
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {item.name}
                            </span>
                          </div>
                        );
                      })}
                      {section.items.length > 5 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-1">
                          {t('referenceData.moreItems', { count: section.items.length - 5 })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    {t('referenceData.empty')}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className={cn(
                    "flex items-center text-sm font-medium group",
                    colors.text
                  )}>
                    <span>{t('referenceData.manage')}</span>
                    <ChevronRight className={cn(
                      "w-4 h-4 ml-1 transition-transform group-hover:translate-x-1",
                      colors.text
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800">
              <BookOpen className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <CardTitle>{t('referenceData.summary.title')}</CardTitle>
              <CardDescription>{t('referenceData.summary.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            {referenceSections.map((section) => (
              <div key={section.key}>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {section.title}
                </p>
                {section.isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {section.count}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
