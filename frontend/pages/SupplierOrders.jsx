import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Truck, 
  MoreHorizontal, 
  Eye,
  ChevronDown,
  ChevronRight,
  FileText,
  Package
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyOrder = {
  order_number: '',
  supplier_name: '',
  status: 'draft',
  order_date: '',
  expected_date: '',
  logistics_cost: '',
  notes: ''
};

export default function SupplierOrders() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [formData, setFormData] = useState(emptyOrder);
  const [expandedOrders, setExpandedOrders] = useState({});

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['supplier-orders'],
    queryFn: () => api.entities.SupplierOrder.list('-created_date'),
  });

  // Group orders by parent
  const parentOrders = orders.filter(o => !o.parent_order_id);
  const childOrdersMap = orders.reduce((acc, order) => {
    if (order.parent_order_id) {
      if (!acc[order.parent_order_id]) acc[order.parent_order_id] = [];
      acc[order.parent_order_id].push(order);
    }
    return acc;
  }, {});

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.SupplierOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.SupplierOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.SupplierOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      setDeleteDialogOpen(false);
      setCurrentOrder(null);
    },
  });

  const resetForm = () => {
    setFormData(emptyOrder);
    setCurrentOrder(null);
  };

  const handleEdit = (order) => {
    setCurrentOrder(order);
    setFormData({
      order_number: order.order_number || '',
      supplier_name: order.supplier_name || '',
      status: order.status || 'draft',
      order_date: order.order_date || '',
      expected_date: order.expected_date || '',
      logistics_cost: order.logistics_cost || '',
      notes: order.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      logistics_cost: formData.logistics_cost ? parseFloat(formData.logistics_cost) : null,
    };

    if (currentOrder) {
      updateMutation.mutate({ id: currentOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const OrderRow = ({ order, isChild = false }) => {
    const hasChildren = childOrdersMap[order.id]?.length > 0;
    const isExpanded = expandedOrders[order.id];

    return (
      <>
        <tr className={`border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isChild ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => toggleExpanded(order.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              )}
              {isChild && <div className="w-6" />}
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isChild ? 'bg-purple-100 dark:bg-purple-500/20' : 'bg-indigo-100 dark:bg-indigo-500/20'}`}>
                  <Truck className={`h-5 w-5 ${isChild ? 'text-purple-600 dark:text-purple-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {order.order_number}
                  </p>
                  {isChild && (
                    <p className="text-xs text-slate-500">Sub-order</p>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
            {order.supplier_name}
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={order.status} />
          </td>
          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
            {order.order_date ? format(new Date(order.order_date), 'MMM d, yyyy') : '—'}
          </td>
          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
            {order.expected_date ? format(new Date(order.expected_date), 'MMM d, yyyy') : '—'}
          </td>
          <td className="px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                ${(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500">
                {order.total_quantity || 0} items
              </p>
            </div>
          </td>
          <td className="px-4 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`${createPageUrl('SupplierOrderDetails')}?id=${order.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(order)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { setCurrentOrder(order); setDeleteDialogOpen(true); }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
        {hasChildren && isExpanded && childOrdersMap[order.id].map(child => (
          <OrderRow key={child.id} order={child} isChild={true} />
        ))}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Supplier Orders" 
        description="Manage purchase orders from suppliers"
      >
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </PageHeader>

      <div className="overflow-hidden bg-white border rounded-lg dark:bg-slate-900 dark:border-slate-800">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-800/50 dark:border-slate-800">
              <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Order Number</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Supplier</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Order Date</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Expected</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300">Total</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-slate-700 dark:text-slate-300"></th>
            </tr>
          </thead>
          <tbody>
            {parentOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                  No orders found
                </td>
              </tr>
            ) : (
              parentOrders.map(order => (
                <OrderRow key={order.id} order={order} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentOrder ? 'Edit Order' : 'New Supplier Order'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_number">Order Number *</Label>
                <Input
                  id="order_number"
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
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
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="partially_received">Partially Received</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Supplier Name *</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_date">Order Date</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
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
                {currentOrder ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order "{currentOrder?.order_number}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(currentOrder.id)}
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