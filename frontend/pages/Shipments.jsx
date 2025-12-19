import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  MoreHorizontal, 
  Eye,
  Store,
  Warehouse
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyShipment = {
  shipment_number: '',
  store_id: '',
  warehouse_id: '',
  status: 'draft',
  shipment_date: '',
  expected_date: '',
  logistics_cost: ''
};

export default function Shipments() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentShipment, setCurrentShipment] = useState(null);
  const [formData, setFormData] = useState(emptyShipment);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => api.entities.Shipment.list('-created_date'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.entities.Store.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Shipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Shipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Shipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setDeleteDialogOpen(false);
      setCurrentShipment(null);
    },
  });

  const resetForm = () => {
    setFormData(emptyShipment);
    setCurrentShipment(null);
  };

  const handleEdit = (shipment) => {
    setCurrentShipment(shipment);
    setFormData({
      shipment_number: shipment.shipment_number || '',
      store_id: shipment.store_id || '',
      warehouse_id: shipment.warehouse_id || '',
      status: shipment.status || 'draft',
      shipment_date: shipment.shipment_date || '',
      expected_date: shipment.expected_date || '',
      logistics_cost: shipment.logistics_cost || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const store = stores.find(s => s.id === formData.store_id);
    const warehouse = warehouses.find(w => w.id === formData.warehouse_id);
    
    const data = {
      ...formData,
      store_name: store?.name || '',
      warehouse_name: warehouse?.name || '',
      logistics_cost: formData.logistics_cost ? parseFloat(formData.logistics_cost) : null,
    };

    if (currentShipment) {
      updateMutation.mutate({ id: currentShipment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      accessorKey: 'shipment_number',
      header: 'Shipment #',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/20">
            <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.shipment_number}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'store_name',
      header: 'Store',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.store_name || 'Unknown Store'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'warehouse_name',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.warehouse_name || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'shipment_date',
      header: 'Ship Date',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.shipment_date ? format(new Date(row.original.shipment_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'sent_quantity',
      header: 'Sent / Accepted',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.sent_quantity || 0}
          </span>
          <span className="text-slate-400"> / </span>
          <span className={`font-medium ${
            row.original.accepted_quantity >= row.original.sent_quantity
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {row.original.accepted_quantity || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'logistics_cost',
      header: 'Logistics',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          ${row.original.logistics_cost?.toFixed(2) || '0.00'}
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
            <DropdownMenuItem asChild>
              <Link to={`${createPageUrl('ShipmentDetails')}?id=${row.original.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => { setCurrentShipment(row.original); setDeleteDialogOpen(true); }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Marketplace Shipments" 
        description="Manage shipments to marketplace stores"
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Shipment
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={shipments}
        searchPlaceholder="Search shipments..."
        emptyMessage="No shipments found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentShipment ? 'Edit Shipment' : 'New Shipment'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipment_number">Shipment Number *</Label>
                <Input
                  id="shipment_number"
                  value={formData.shipment_number}
                  onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="partially_accepted">Partially Accepted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store">Store *</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value) => setFormData({ ...formData, store_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(warehouse => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipment_date">Shipment Date</Label>
                <Input
                  id="shipment_date"
                  type="date"
                  value={formData.shipment_date}
                  onChange={(e) => setFormData({ ...formData, shipment_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_date">Expected Delivery</Label>
                <Input
                  id="expected_date"
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logistics_cost">Logistics Cost ($)</Label>
              <Input
                id="logistics_cost"
                type="number"
                step="0.01"
                value={formData.logistics_cost}
                onChange={(e) => setFormData({ ...formData, logistics_cost: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {currentShipment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete shipment "{currentShipment?.shipment_number}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(currentShipment.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}