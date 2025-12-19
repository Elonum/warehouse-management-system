import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ClipboardList, 
  MoreHorizontal, 
  Eye,
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

const emptyAdjustment = {
  adjustment_number: '',
  adjustment_date: '',
  warehouse_id: '',
  status: 'draft',
  notes: ''
};

export default function InventoryAdjustments() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentAdjustment, setCurrentAdjustment] = useState(null);
  const [formData, setFormData] = useState(emptyAdjustment);

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: () => api.entities.InventoryAdjustment.list('-created_date'),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.InventoryAdjustment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.InventoryAdjustment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.InventoryAdjustment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-adjustments'] });
      setDeleteDialogOpen(false);
      setCurrentAdjustment(null);
    },
  });

  const resetForm = () => {
    setFormData(emptyAdjustment);
    setCurrentAdjustment(null);
  };

  const handleEdit = (adjustment) => {
    setCurrentAdjustment(adjustment);
    setFormData({
      adjustment_number: adjustment.adjustment_number || '',
      adjustment_date: adjustment.adjustment_date || '',
      warehouse_id: adjustment.warehouse_id || '',
      status: adjustment.status || 'draft',
      notes: adjustment.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const warehouse = warehouses.find(w => w.id === formData.warehouse_id);
    
    const data = {
      ...formData,
      warehouse_name: warehouse?.name || '',
    };

    if (currentAdjustment) {
      updateMutation.mutate({ id: currentAdjustment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      accessorKey: 'adjustment_number',
      header: 'Adjustment #',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.adjustment_number}
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
      accessorKey: 'adjustment_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.adjustment_date ? format(new Date(row.original.adjustment_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'total_receipt',
      header: 'Receipt',
      cell: ({ row }) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          +{row.original.total_receipt?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'total_writeoff',
      header: 'Write-off',
      cell: ({ row }) => (
        <span className="font-medium text-rose-600 dark:text-rose-400">
          -{row.original.total_writeoff?.toLocaleString() || 0}
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
              <Link to={`${createPageUrl('InventoryAdjustmentDetails')}?id=${row.original.id}`}>
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
              onClick={() => { setCurrentAdjustment(row.original); setDeleteDialogOpen(true); }}
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
        title="Inventory Adjustments" 
        description="Manage inventory counts and adjustments"
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Adjustment
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={adjustments}
        searchPlaceholder="Search adjustments..."
        emptyMessage="No adjustments found"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentAdjustment ? 'Edit Adjustment' : 'New Inventory Adjustment'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adjustment_number">Adjustment Number *</Label>
                <Input
                  id="adjustment_number"
                  value={formData.adjustment_number}
                  onChange={(e) => setFormData({ ...formData, adjustment_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustment_date">Date *</Label>
                <Input
                  id="adjustment_date"
                  type="date"
                  value={formData.adjustment_date}
                  onChange={(e) => setFormData({ ...formData, adjustment_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {currentAdjustment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete adjustment "{currentAdjustment?.adjustment_number}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(currentAdjustment.id)}
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