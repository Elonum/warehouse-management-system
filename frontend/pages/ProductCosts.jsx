import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { Plus, Edit2, Trash2, DollarSign, MoreHorizontal, Package } from 'lucide-react';
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
import { format } from 'date-fns';

const emptyCost = {
  product_id: '',
  period_start: '',
  period_end: '',
  unit_cost: '',
  notes: ''
};

export default function ProductCosts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentCost, setCurrentCost] = useState(null);
  const [formData, setFormData] = useState(emptyCost);

  const { data: productCosts = [], isLoading } = useQuery({
    queryKey: ['product-costs'],
    queryFn: () => api.entities.ProductCost.list('-period_start'),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.ProductCost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-costs'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.ProductCost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-costs'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.ProductCost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-costs'] });
      setDeleteDialogOpen(false);
      setCurrentCost(null);
    },
  });

  const resetForm = () => {
    setFormData(emptyCost);
    setCurrentCost(null);
  };

  const handleEdit = (cost) => {
    setCurrentCost(cost);
    setFormData({
      product_id: cost.product_id || '',
      period_start: cost.period_start || '',
      period_end: cost.period_end || '',
      unit_cost: cost.unit_cost || '',
      notes: cost.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === formData.product_id);
    
    const data = {
      ...formData,
      product_name: product?.name || '',
      unit_cost: parseFloat(formData.unit_cost) || 0,
    };

    if (currentCost) {
      updateMutation.mutate({ id: currentCost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      accessorKey: 'product_name',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.product_name || 'Unknown Product'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'period_start',
      header: 'Period Start',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.period_start ? format(new Date(row.original.period_start), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'period_end',
      header: 'Period End',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.period_end ? format(new Date(row.original.period_end), 'MMM d, yyyy') : 'Current'}
        </span>
      ),
    },
    {
      accessorKey: 'unit_cost',
      header: 'Unit Cost',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ${row.original.unit_cost?.toFixed(2) || '0.00'}
          </span>
        </div>
      ),
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
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { setCurrentCost(row.original); setDeleteDialogOpen(true); }}
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
        title="Product Costs" 
        description="Manage product cost periods"
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Cost Period
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={productCosts}
        searchPlaceholder="Search product costs..."
        emptyMessage="No product costs found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentCost ? 'Edit Cost Period' : 'Add Cost Period'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
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
                <Label htmlFor="period_start">Period Start *</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">Period End</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost ($) *</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {currentCost ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cost period? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(currentCost.id)}
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