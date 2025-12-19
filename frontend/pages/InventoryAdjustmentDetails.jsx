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
import { Textarea } from '@/components/ui/textarea';
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
  warehouse_id: '',
  receipt_quantity: '',
  writeoff_quantity: '',
  reason: '',
  notes: ''
};

const reasons = [
  { value: 'count_discrepancy', label: 'Count Discrepancy' },
  { value: 'damage', label: 'Damage' },
  { value: 'expiry', label: 'Expiry' },
  { value: 'theft', label: 'Theft' },
  { value: 'found', label: 'Found' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' }
];

export default function InventoryAdjustmentDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const adjustmentId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);

  const { data: adjustment, isLoading: loadingAdjustment } = useQuery({
    queryKey: ['inventory-adjustment', adjustmentId],
    queryFn: async () => {
      const adjustments = await api.entities.InventoryAdjustment.filter({ id: adjustmentId });
      return adjustments[0];
    },
    enabled: !!adjustmentId,
  });

  const { data: adjustmentItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['inventory-adjustment-items', adjustmentId],
    queryFn: () => api.entities.InventoryAdjustmentItem.filter({ adjustment_id: adjustmentId }),
    enabled: !!adjustmentId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list(),
  });

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: (data) => api.entities.InventoryAdjustmentItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustment-items', adjustmentId] });
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.InventoryAdjustmentItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustment-items', adjustmentId] });
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => api.entities.InventoryAdjustmentItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustment-items', adjustmentId] });
      setDeleteItemDialogOpen(false);
      setCurrentItem(null);
    },
  });

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setItemForm({
      product_id: item.product_id || '',
      warehouse_id: item.warehouse_id || adjustment?.warehouse_id || '',
      receipt_quantity: item.receipt_quantity || '',
      writeoff_quantity: item.writeoff_quantity || '',
      reason: item.reason || '',
      notes: item.notes || ''
    });
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === itemForm.product_id);
    
    const data = {
      adjustment_id: adjustmentId,
      product_id: itemForm.product_id,
      product_name: product?.name || '',
      warehouse_id: itemForm.warehouse_id || adjustment?.warehouse_id,
      receipt_quantity: parseFloat(itemForm.receipt_quantity) || 0,
      writeoff_quantity: parseFloat(itemForm.writeoff_quantity) || 0,
      reason: itemForm.reason,
      notes: itemForm.notes
    };

    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  // Calculate totals
  const totals = adjustmentItems.reduce((acc, item) => ({
    receipt: acc.receipt + (item.receipt_quantity || 0),
    writeoff: acc.writeoff + (item.writeoff_quantity || 0)
  }), { receipt: 0, writeoff: 0 });

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
      accessorKey: 'receipt_quantity',
      header: 'Receipt',
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.receipt_quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
          {row.original.receipt_quantity > 0 ? `+${row.original.receipt_quantity.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'writeoff_quantity',
      header: 'Write-off',
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.writeoff_quantity > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
          {row.original.writeoff_quantity > 0 ? `-${row.original.writeoff_quantity.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => {
        const reason = reasons.find(r => r.value === row.original.reason);
        return (
          <span className="capitalize text-slate-600 dark:text-slate-400">
            {reason?.label || row.original.reason || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="block max-w-xs text-sm truncate text-slate-500 dark:text-slate-400">
          {row.original.notes || '—'}
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

  if (!adjustmentId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">No adjustment ID provided</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('InventoryAdjustments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Adjustments
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={createPageUrl('InventoryAdjustments')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader 
          title={adjustment?.adjustment_number || 'Loading...'}
          description={adjustment?.warehouse_name}
        >
          <StatusBadge status={adjustment?.status} />
        </PageHeader>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-500">Warehouse</p>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {adjustment?.warehouse_name || '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Adjustment Date</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {adjustment?.adjustment_date ? format(new Date(adjustment.adjustment_date), 'MMM d, yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Receipt</p>
            <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              +{totals.receipt.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Write-off</p>
            <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
              -{totals.writeoff.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {adjustment?.notes && (
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="mb-2 text-sm text-slate-500">Notes</p>
            <p className="text-slate-700 dark:text-slate-300">{adjustment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Adjustment Items ({adjustmentItems.length})
          </h2>
          <Button onClick={() => { setCurrentItem(null); setItemForm({ ...emptyItem, warehouse_id: adjustment?.warehouse_id || '' }); setItemDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
        <DataTable
          columns={itemColumns}
          data={adjustmentItems}
          searchable={false}
          emptyMessage="No items in this adjustment"
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
                <Label htmlFor="receipt_quantity">Receipt Quantity</Label>
                <Input
                  id="receipt_quantity"
                  type="number"
                  min="0"
                  value={itemForm.receipt_quantity}
                  onChange={(e) => setItemForm({ ...itemForm, receipt_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="writeoff_quantity">Write-off Quantity</Label>
                <Input
                  id="writeoff_quantity"
                  type="number"
                  min="0"
                  value={itemForm.writeoff_quantity}
                  onChange={(e) => setItemForm({ ...itemForm, writeoff_quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={itemForm.reason}
                onValueChange={(value) => setItemForm({ ...itemForm, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                rows={2}
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
              Are you sure you want to remove this item from the adjustment?
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