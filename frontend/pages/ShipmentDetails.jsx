import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  MoreHorizontal,
  Store,
  Warehouse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const emptyItem = {
  product_id: '',
  sent_quantity: '',
  accepted_quantity: '',
  logistics_cost: ''
};

export default function ShipmentDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const shipmentId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);

  const { data: shipment, isLoading: loadingShipment } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: async () => {
      const shipments = await api.entities.Shipment.filter({ id: shipmentId });
      return shipments[0];
    },
    enabled: !!shipmentId,
  });

  const { data: shipmentItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['shipment-items', shipmentId],
    queryFn: () => api.entities.ShipmentItem.filter({ shipment_id: shipmentId }),
    enabled: !!shipmentId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: (data) => api.entities.ShipmentItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-items', shipmentId] });
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.ShipmentItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-items', shipmentId] });
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => api.entities.ShipmentItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-items', shipmentId] });
      setDeleteItemDialogOpen(false);
      setCurrentItem(null);
    },
  });

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setItemForm({
      product_id: item.product_id || '',
      sent_quantity: item.sent_quantity || '',
      accepted_quantity: item.accepted_quantity || '',
      logistics_cost: item.logistics_cost || ''
    });
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === itemForm.product_id);
    
    const data = {
      shipment_id: shipmentId,
      product_id: itemForm.product_id,
      product_name: product?.name || '',
      sent_quantity: parseFloat(itemForm.sent_quantity) || 0,
      accepted_quantity: parseFloat(itemForm.accepted_quantity) || 0,
      logistics_cost: parseFloat(itemForm.logistics_cost) || 0,
    };

    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const itemColumns = [
    {
      accessorKey: 'product_name',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800">
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.product_name || 'Unknown Product'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'sent_quantity',
      header: 'Sent',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.sent_quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'accepted_quantity',
      header: 'Accepted',
      cell: ({ row }) => (
        <span className={`font-medium ${
          row.original.accepted_quantity >= row.original.sent_quantity
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}>
          {row.original.accepted_quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'logistics_cost',
      header: 'Logistics Cost',
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
            <DropdownMenuItem onClick={() => handleEditItem(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { setCurrentItem(row.original); setDeleteItemDialogOpen(true); }}
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

  if (!shipmentId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">No shipment ID provided</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('Shipments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shipments
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={createPageUrl('Shipments')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader 
          title={shipment?.shipment_number || 'Loading...'}
          description={`${shipment?.store_name || ''} → ${shipment?.warehouse_name || ''}`}
        >
          <StatusBadge status={shipment?.status} />
        </PageHeader>
      </div>

      {/* Shipment Summary */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">Store</p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.store_name || '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">Warehouse</p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.warehouse_name || '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Shipment Date</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.shipment_date ? format(new Date(shipment.shipment_date), 'MMM d, yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Expected Delivery</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {shipment?.expected_date ? format(new Date(shipment.expected_date), 'MMM d, yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Logistics Cost</p>
            <p className="mt-1 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              ${shipment?.logistics_cost?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Shipment Items ({shipmentItems.length})
          </h2>
          <Button onClick={() => { setCurrentItem(null); setItemForm(emptyItem); setItemDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
        <DataTable
          columns={itemColumns}
          data={shipmentItems}
          searchable={false}
          emptyMessage="No items in this shipment"
        />
      </div>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentItem ? 'Edit Item' : 'Add Item'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={itemForm.product_id}
                onValueChange={(value) => setItemForm({ ...itemForm, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.article})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sent_quantity">Sent Quantity *</Label>
                <Input
                  id="sent_quantity"
                  type="number"
                  value={itemForm.sent_quantity}
                  onChange={(e) => setItemForm({ ...itemForm, sent_quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accepted_quantity">Accepted Quantity</Label>
                <Input
                  id="accepted_quantity"
                  type="number"
                  value={itemForm.accepted_quantity}
                  onChange={(e) => setItemForm({ ...itemForm, accepted_quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logistics_cost">Logistics Cost ($)</Label>
              <Input
                id="logistics_cost"
                type="number"
                step="0.01"
                value={itemForm.logistics_cost}
                onChange={(e) => setItemForm({ ...itemForm, logistics_cost: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {currentItem ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from the shipment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemMutation.mutate(currentItem.id)}
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