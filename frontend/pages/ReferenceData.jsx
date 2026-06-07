import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { messageForDeleteError } from '@/lib/deleteErrors';
import { useI18n } from '@/lib/i18n';
import { 
  Shield,
  Truck,
  ShoppingCart,
  ClipboardList,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GuardedButton, GuardedMenuItem } from '@/components/auth/PermissionControls';
import { usePermissions } from '@/hooks/usePermissions';
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
  const { canAdmin } = usePermissions();
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
  const [orderStatusIsFinal, setOrderStatusIsFinal] = useState(false);
  
  // Shipment Status states
  const [shipmentStatusDialogOpen, setShipmentStatusDialogOpen] = useState(false);
  const [deleteShipmentStatusDialogOpen, setDeleteShipmentStatusDialogOpen] = useState(false);
  const [currentShipmentStatus, setCurrentShipmentStatus] = useState(null);
  const [shipmentStatusName, setShipmentStatusName] = useState('');
  const [shipmentStatusError, setShipmentStatusError] = useState('');
  const [shipmentStatusDeleteError, setShipmentStatusDeleteError] = useState('');
  const [shipmentStatusIsFinal, setShipmentStatusIsFinal] = useState(false);
  
  // Inventory Status states
  const [inventoryStatusDialogOpen, setInventoryStatusDialogOpen] = useState(false);
  const [deleteInventoryStatusDialogOpen, setDeleteInventoryStatusDialogOpen] = useState(false);
  const [currentInventoryStatus, setCurrentInventoryStatus] = useState(null);
  const [inventoryStatusName, setInventoryStatusName] = useState('');
  const [inventoryStatusError, setInventoryStatusError] = useState('');
  const [inventoryStatusDeleteError, setInventoryStatusDeleteError] = useState('');
  const [inventoryStatusIsFinal, setInventoryStatusIsFinal] = useState(false);

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
      setDeleteError(messageForDeleteError(err, t, { failedKey: 'referenceData.roles.errors.deleteFailed' }));
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
      setOrderStatusDeleteError(messageForDeleteError(err, t, {
        failedKey: 'referenceData.orderStatuses.errors.deleteFailed',
        inUseKey: 'referenceData.orderStatuses.errors.statusInUseSingle',
      }));
    },
  });

  const resetOrderStatusForm = () => {
    setOrderStatusName('');
    setCurrentOrderStatus(null);
    setOrderStatusError('');
    setOrderStatusIsFinal(false);
  };

  const handleOpenOrderStatusDialog = (orderStatus = null) => {
    if (orderStatus) {
      setCurrentOrderStatus(orderStatus);
      setOrderStatusName(orderStatus.name || '');
      setOrderStatusIsFinal(!!orderStatus.isFinal);
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

    const data = { name, isFinal: orderStatusIsFinal };

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

  // Shipment Status mutations
  const createShipmentStatusMutation = useMutation({
    mutationFn: (data) => api.shipmentStatuses.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['shipmentStatuses'] });
      setShipmentStatusDialogOpen(false);
      resetShipmentStatusForm();
      setShipmentStatusError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setShipmentStatusError(err.message || t('referenceData.shipmentStatuses.errors.createFailed'));
      } else {
        setShipmentStatusError(t('referenceData.shipmentStatuses.errors.createFailed'));
      }
    },
  });

  const updateShipmentStatusMutation = useMutation({
    mutationFn: ({ id, data }) => api.shipmentStatuses.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['shipmentStatuses'] });
      setShipmentStatusDialogOpen(false);
      resetShipmentStatusForm();
      setShipmentStatusError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setShipmentStatusError(err.message || t('referenceData.shipmentStatuses.errors.updateFailed'));
      } else {
        setShipmentStatusError(t('referenceData.shipmentStatuses.errors.updateFailed'));
      }
    },
  });

  const deleteShipmentStatusMutation = useMutation({
    mutationFn: (id) => api.shipmentStatuses.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['shipmentStatuses'] });
      setDeleteShipmentStatusDialogOpen(false);
      setCurrentShipmentStatus(null);
    },
    onError: (err) => {
      setShipmentStatusDeleteError(messageForDeleteError(err, t, {
        failedKey: 'referenceData.shipmentStatuses.errors.deleteFailed',
        inUseKey: 'referenceData.shipmentStatuses.errors.statusInUseSingle',
      }));
    },
  });

  const resetShipmentStatusForm = () => {
    setShipmentStatusName('');
    setCurrentShipmentStatus(null);
    setShipmentStatusError('');
    setShipmentStatusIsFinal(false);
  };

  const handleOpenShipmentStatusDialog = (shipmentStatus = null) => {
    if (shipmentStatus) {
      setCurrentShipmentStatus(shipmentStatus);
      setShipmentStatusName(shipmentStatus.name || '');
      setShipmentStatusIsFinal(!!shipmentStatus.isFinal);
    } else {
      resetShipmentStatusForm();
    }
    setShipmentStatusError('');
    setShipmentStatusDialogOpen(true);
  };

  const handleCloseShipmentStatusDialog = () => {
    setShipmentStatusDialogOpen(false);
    resetShipmentStatusForm();
  };

  const handleShipmentStatusSubmit = (e) => {
    e.preventDefault();
    setShipmentStatusError('');

    const name = shipmentStatusName.trim();
    if (!name) {
      setShipmentStatusError(t('referenceData.shipmentStatuses.errors.nameRequired'));
      return;
    }

    if (name.length < 2) {
      setShipmentStatusError(t('referenceData.shipmentStatuses.errors.nameMinLength'));
      return;
    }

    const data = { name, isFinal: shipmentStatusIsFinal };

    if (currentShipmentStatus) {
      updateShipmentStatusMutation.mutate({ id: currentShipmentStatus.shipmentStatusId, data });
    } else {
      createShipmentStatusMutation.mutate(data);
    }
  };

  const handleDeleteShipmentStatus = (shipmentStatus) => {
    setCurrentShipmentStatus(shipmentStatus);
    setShipmentStatusDeleteError('');
    setDeleteShipmentStatusDialogOpen(true);
  };

  const confirmDeleteShipmentStatus = () => {
    if (!currentShipmentStatus) return;

    // Check if shipment status is used by any shipments
    const shipmentsWithStatus = shipments.filter(shipment => shipment.statusId === currentShipmentStatus.shipmentStatusId);
    if (shipmentsWithStatus.length > 0) {
      const count = shipmentsWithStatus.length;
      const errorMessage = count === 1 
        ? t('referenceData.shipmentStatuses.errors.statusInUseSingle')
        : t('referenceData.shipmentStatuses.errors.statusInUse', { count });
      setShipmentStatusDeleteError(errorMessage);
      return;
    }

    setShipmentStatusDeleteError('');
    deleteShipmentStatusMutation.mutate(currentShipmentStatus.shipmentStatusId);
  };

  const shipmentStatusColumns = [
    {
      accessorKey: 'name',
      header: t('referenceData.shipmentStatuses.table.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20">
            <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'isFinal',
      header: t('referenceData.shipmentStatuses.table.isFinal'),
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            row.original.isFinal
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300',
          )}
        >
          {row.original.isFinal
            ? t('referenceData.shipmentStatuses.table.isFinalYes')
            : t('referenceData.shipmentStatuses.table.isFinalNo')}
        </span>
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
            <GuardedMenuItem allowed={canAdmin} onClick={() => handleOpenShipmentStatusDialog(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </GuardedMenuItem>
            <DropdownMenuSeparator />
            <GuardedMenuItem
              allowed={canAdmin}
              onClick={() => handleDeleteShipmentStatus(row.original)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </GuardedMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Inventory Status mutations
  const createInventoryStatusMutation = useMutation({
    mutationFn: (data) => api.inventoryStatuses.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryStatuses'] });
      setInventoryStatusDialogOpen(false);
      resetInventoryStatusForm();
      setInventoryStatusError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setInventoryStatusError(err.message || t('referenceData.inventoryStatuses.errors.createFailed'));
      } else {
        setInventoryStatusError(t('referenceData.inventoryStatuses.errors.createFailed'));
      }
    },
  });

  const updateInventoryStatusMutation = useMutation({
    mutationFn: ({ id, data }) => api.inventoryStatuses.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryStatuses'] });
      setInventoryStatusDialogOpen(false);
      resetInventoryStatusForm();
      setInventoryStatusError('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setInventoryStatusError(err.message || t('referenceData.inventoryStatuses.errors.updateFailed'));
      } else {
        setInventoryStatusError(t('referenceData.inventoryStatuses.errors.updateFailed'));
      }
    },
  });

  const deleteInventoryStatusMutation = useMutation({
    mutationFn: (id) => api.inventoryStatuses.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryStatuses'] });
      setDeleteInventoryStatusDialogOpen(false);
      setCurrentInventoryStatus(null);
    },
    onError: (err) => {
      setInventoryStatusDeleteError(messageForDeleteError(err, t, {
        failedKey: 'referenceData.inventoryStatuses.errors.deleteFailed',
        inUseKey: 'referenceData.inventoryStatuses.errors.statusInUseSingle',
      }));
    },
  });

  const resetInventoryStatusForm = () => {
    setInventoryStatusName('');
    setCurrentInventoryStatus(null);
    setInventoryStatusError('');
    setInventoryStatusIsFinal(false);
  };

  const handleOpenInventoryStatusDialog = (inventoryStatus = null) => {
    if (inventoryStatus) {
      setCurrentInventoryStatus(inventoryStatus);
      setInventoryStatusName(inventoryStatus.name || '');
      setInventoryStatusIsFinal(!!inventoryStatus.isFinal);
    } else {
      resetInventoryStatusForm();
    }
    setInventoryStatusError('');
    setInventoryStatusDialogOpen(true);
  };

  const handleCloseInventoryStatusDialog = () => {
    setInventoryStatusDialogOpen(false);
    resetInventoryStatusForm();
  };

  const handleInventoryStatusSubmit = (e) => {
    e.preventDefault();
    setInventoryStatusError('');

    const name = inventoryStatusName.trim();
    if (!name) {
      setInventoryStatusError(t('referenceData.inventoryStatuses.errors.nameRequired'));
      return;
    }

    if (name.length < 2) {
      setInventoryStatusError(t('referenceData.inventoryStatuses.errors.nameMinLength'));
      return;
    }

    const data = { name, isFinal: inventoryStatusIsFinal };

    if (currentInventoryStatus) {
      updateInventoryStatusMutation.mutate({ id: currentInventoryStatus.inventoryStatusId, data });
    } else {
      createInventoryStatusMutation.mutate(data);
    }
  };

  const handleDeleteInventoryStatus = (inventoryStatus) => {
    setCurrentInventoryStatus(inventoryStatus);
    setInventoryStatusDeleteError('');
    setDeleteInventoryStatusDialogOpen(true);
  };

  const confirmDeleteInventoryStatus = () => {
    if (!currentInventoryStatus) return;

    // Check if inventory status is used by any inventories
    const inventoriesWithStatus = inventories.filter(inventory => inventory.statusId === currentInventoryStatus.inventoryStatusId);
    if (inventoriesWithStatus.length > 0) {
      const count = inventoriesWithStatus.length;
      const errorMessage = count === 1 
        ? t('referenceData.inventoryStatuses.errors.statusInUseSingle')
        : t('referenceData.inventoryStatuses.errors.statusInUse', { count });
      setInventoryStatusDeleteError(errorMessage);
      return;
    }

    setInventoryStatusDeleteError('');
    deleteInventoryStatusMutation.mutate(currentInventoryStatus.inventoryStatusId);
  };

  const inventoryStatusColumns = [
    {
      accessorKey: 'name',
      header: t('referenceData.inventoryStatuses.table.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'isFinal',
      header: t('referenceData.inventoryStatuses.table.isFinal'),
      cell: ({ row }) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          row.original.isFinal
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-slate-50 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300'
        )}>
          {row.original.isFinal
            ? t('referenceData.inventoryStatuses.table.isFinalYes')
            : t('referenceData.inventoryStatuses.table.isFinalNo')}
        </span>
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
            <GuardedMenuItem allowed={canAdmin} onClick={() => handleOpenInventoryStatusDialog(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </GuardedMenuItem>
            <DropdownMenuSeparator />
            <GuardedMenuItem
              allowed={canAdmin}
              onClick={() => handleDeleteInventoryStatus(row.original)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </GuardedMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

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
      accessorKey: 'isFinal',
      header: t('referenceData.orderStatuses.table.isFinal'),
      cell: ({ row }) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          row.original.isFinal
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-slate-50 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300'
        )}>
          {row.original.isFinal
            ? t('referenceData.orderStatuses.table.isFinalYes')
            : t('referenceData.orderStatuses.table.isFinalNo')}
        </span>
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
            <GuardedMenuItem allowed={canAdmin} onClick={() => handleOpenOrderStatusDialog(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </GuardedMenuItem>
            <DropdownMenuSeparator />
            <GuardedMenuItem
              allowed={canAdmin}
              onClick={() => handleDeleteOrderStatus(row.original)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </GuardedMenuItem>
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
            <GuardedMenuItem allowed={canAdmin} onClick={() => handleOpenRoleDialog(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </GuardedMenuItem>
            <DropdownMenuSeparator />
            <GuardedMenuItem
              allowed={canAdmin}
              onClick={() => handleDeleteRole(row.original)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </GuardedMenuItem>
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

  const { data: shipments = [] } = useQuery({
    queryKey: ['mpShipments'],
    queryFn: async () => {
      const response = await api.mpShipments.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: inventories = [] } = useQuery({
    queryKey: ['inventories'],
    queryFn: async () => {
      const response = await api.inventories.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  if (selectedSection === 'roles') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSection(null)}
              aria-label={t('common.back')}
              title={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
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
          <GuardedButton allowed={canAdmin} onClick={() => handleOpenRoleDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('referenceData.roles.addRole')}
          </GuardedButton>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSection(null)}
              aria-label={t('common.back')}
              title={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
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
          <GuardedButton allowed={canAdmin} onClick={() => handleOpenOrderStatusDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('referenceData.orderStatuses.addStatus')}
          </GuardedButton>
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
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="orderStatusIsFinal" className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t('referenceData.orderStatuses.form.isFinal')}
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('referenceData.orderStatuses.form.isFinalHint')}
                  </p>
                </div>
                <input
                  id="orderStatusIsFinal"
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={orderStatusIsFinal}
                  onChange={(e) => setOrderStatusIsFinal(e.target.checked)}
                />
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

  if (selectedSection === 'shipmentStatuses') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSection(null)}
              aria-label={t('common.back')}
              title={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('referenceData.shipmentStatuses.title')}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('referenceData.shipmentStatuses.description')}
              </p>
            </div>
          </div>
          <GuardedButton allowed={canAdmin} onClick={() => handleOpenShipmentStatusDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('referenceData.shipmentStatuses.addStatus')}
          </GuardedButton>
        </div>

        <DataTable
          columns={shipmentStatusColumns}
          data={shipmentStatuses}
          isLoading={shipmentStatusesLoading}
          searchPlaceholder={t('referenceData.shipmentStatuses.searchPlaceholder')}
          emptyMessage={t('referenceData.shipmentStatuses.emptyMessage')}
        />

        <Dialog open={shipmentStatusDialogOpen} onOpenChange={handleCloseShipmentStatusDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {currentShipmentStatus ? t('referenceData.shipmentStatuses.editStatus') : t('referenceData.shipmentStatuses.addStatus')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleShipmentStatusSubmit} className="space-y-4">
              {shipmentStatusError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {shipmentStatusError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="shipmentStatusName">
                  {t('referenceData.shipmentStatuses.form.name')} *
                </Label>
                <Input
                  id="shipmentStatusName"
                  value={shipmentStatusName}
                  onChange={(e) => setShipmentStatusName(e.target.value)}
                  placeholder={t('referenceData.shipmentStatuses.form.namePlaceholder')}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('referenceData.shipmentStatuses.form.nameHint')}
                </p>
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="shipmentStatusIsFinal" className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t('referenceData.shipmentStatuses.form.isFinal')}
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('referenceData.shipmentStatuses.form.isFinalHint')}
                  </p>
                </div>
                <input
                  id="shipmentStatusIsFinal"
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={shipmentStatusIsFinal}
                  onChange={(e) => setShipmentStatusIsFinal(e.target.checked)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseShipmentStatusDialog}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createShipmentStatusMutation.isPending || updateShipmentStatusMutation.isPending}
                >
                  {currentShipmentStatus ? t('common.save') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteShipmentStatusDialogOpen} onOpenChange={(open) => {
          setDeleteShipmentStatusDialogOpen(open);
          if (!open) {
            setCurrentShipmentStatus(null);
            setShipmentStatusDeleteError('');
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('referenceData.shipmentStatuses.deleteConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('referenceData.shipmentStatuses.deleteConfirm.description', { name: currentShipmentStatus?.name || '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {shipmentStatusDeleteError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {shipmentStatusDeleteError}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteShipmentStatusDialogOpen(false);
                setCurrentShipmentStatus(null);
                setShipmentStatusDeleteError('');
              }}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDeleteShipmentStatus();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteShipmentStatusMutation.isPending}
              >
                {deleteShipmentStatusMutation.isPending ? t('common.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (selectedSection === 'inventoryStatuses') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSection(null)}
              aria-label={t('common.back')}
              title={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('referenceData.inventoryStatuses.title')}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t('referenceData.inventoryStatuses.description')}
              </p>
            </div>
          </div>
          <GuardedButton allowed={canAdmin} onClick={() => handleOpenInventoryStatusDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('referenceData.inventoryStatuses.addStatus')}
          </GuardedButton>
        </div>

        <DataTable
          columns={inventoryStatusColumns}
          data={inventoryStatuses}
          isLoading={inventoryStatusesLoading}
          searchPlaceholder={t('referenceData.inventoryStatuses.searchPlaceholder')}
          emptyMessage={t('referenceData.inventoryStatuses.emptyMessage')}
        />

        <Dialog open={inventoryStatusDialogOpen} onOpenChange={handleCloseInventoryStatusDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {currentInventoryStatus ? t('referenceData.inventoryStatuses.editStatus') : t('referenceData.inventoryStatuses.addStatus')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInventoryStatusSubmit} className="space-y-4">
              {inventoryStatusError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {inventoryStatusError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="inventoryStatusName">
                  {t('referenceData.inventoryStatuses.form.name')} *
                </Label>
                <Input
                  id="inventoryStatusName"
                  value={inventoryStatusName}
                  onChange={(e) => setInventoryStatusName(e.target.value)}
                  placeholder={t('referenceData.inventoryStatuses.form.namePlaceholder')}
                  required
                  minLength={2}
                  maxLength={100}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('referenceData.inventoryStatuses.form.nameHint')}
                </p>
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="inventoryStatusIsFinal" className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t('referenceData.inventoryStatuses.form.isFinal')}
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('referenceData.inventoryStatuses.form.isFinalHint')}
                  </p>
                </div>
                <input
                  id="inventoryStatusIsFinal"
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={inventoryStatusIsFinal}
                  onChange={(e) => setInventoryStatusIsFinal(e.target.checked)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseInventoryStatusDialog}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInventoryStatusMutation.isPending || updateInventoryStatusMutation.isPending}
                >
                  {currentInventoryStatus ? t('common.save') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteInventoryStatusDialogOpen} onOpenChange={(open) => {
          setDeleteInventoryStatusDialogOpen(open);
          if (!open) {
            setCurrentInventoryStatus(null);
            setInventoryStatusDeleteError('');
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('referenceData.inventoryStatuses.deleteConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('referenceData.inventoryStatuses.deleteConfirm.description', { name: currentInventoryStatus?.name || '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {inventoryStatusDeleteError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {inventoryStatusDeleteError}
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteInventoryStatusDialogOpen(false);
                setCurrentInventoryStatus(null);
                setInventoryStatusDeleteError('');
              }}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDeleteInventoryStatus();
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteInventoryStatusMutation.isPending}
              >
                {deleteInventoryStatusMutation.isPending ? t('common.deleting') : t('common.delete')}
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

      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
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
                                      item.inventoryStatusId || item.id || index;
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
