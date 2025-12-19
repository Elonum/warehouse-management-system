import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  FileText, 
  Download,
  Package,
  Warehouse,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyItem = {
  product_id: '',
  warehouse_id: '',
  ordered_quantity: '',
  received_quantity: '',
  purchase_price: '',
  logistics_cost: ''
};

export default function SupplierOrderDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['supplier-order', orderId],
    queryFn: async () => {
      const orders = await api.entities.SupplierOrder.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId,
  });

  const { data: orderItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['supplier-order-items', orderId],
    queryFn: () => api.entities.SupplierOrderItem.filter({ order_id: orderId }),
    enabled: !!orderId,
  });

  const { data: orderDocuments = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['supplier-order-documents', orderId],
    queryFn: () => api.entities.SupplierOrderDocument.filter({ order_id: orderId }),
    enabled: !!orderId,
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
    mutationFn: (data) => api.entities.SupplierOrderItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-order-items', orderId] });
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.SupplierOrderItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-order-items', orderId] });
      setItemDialogOpen(false);
      setItemForm(emptyItem);
      setCurrentItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => api.entities.SupplierOrderItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-order-items', orderId] });
      setDeleteItemDialogOpen(false);
      setCurrentItem(null);
    },
  });

  // Document upload
  const uploadDocMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      return api.entities.SupplierOrderDocument.create({
        order_id: orderId,
        document_name: file.name,
        document_type: 'other',
        file_url,
        file_size: file.size
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-order-documents', orderId] });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => api.entities.SupplierOrderDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-order-documents', orderId] });
    },
  });

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setItemForm({
      product_id: item.product_id || '',
      warehouse_id: item.warehouse_id || '',
      ordered_quantity: item.ordered_quantity || '',
      received_quantity: item.received_quantity || '',
      purchase_price: item.purchase_price || '',
      logistics_cost: item.logistics_cost || ''
    });
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    const product = products.find(p => p.id === itemForm.product_id);
    const warehouse = warehouses.find(w => w.id === itemForm.warehouse_id);
    
    const data = {
      order_id: orderId,
      product_id: itemForm.product_id,
      product_name: product?.name || '',
      warehouse_id: itemForm.warehouse_id,
      warehouse_name: warehouse?.name || '',
      ordered_quantity: parseFloat(itemForm.ordered_quantity) || 0,
      received_quantity: parseFloat(itemForm.received_quantity) || 0,
      purchase_price: parseFloat(itemForm.purchase_price) || 0,
      logistics_cost: parseFloat(itemForm.logistics_cost) || 0,
      self_cost: (parseFloat(itemForm.purchase_price) || 0) + (parseFloat(itemForm.logistics_cost) || 0)
    };

    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocMutation.mutate(file);
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
      accessorKey: 'warehouse_name',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.warehouse_name || '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'ordered_quantity',
      header: 'Ordered',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.ordered_quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'received_quantity',
      header: 'Received',
      cell: ({ row }) => (
        <span className={`font-medium ${
          row.original.received_quantity >= row.original.ordered_quantity
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}>
          {row.original.received_quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'purchase_price',
      header: 'Unit Price',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          ${row.original.purchase_price?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      accessorKey: 'self_cost',
      header: 'Self Cost',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          ${row.original.self_cost?.toFixed(2) || '0.00'}
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

  if (!orderId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">No order ID provided</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('SupplierOrders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={createPageUrl('SupplierOrders')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader 
          title={order?.order_number || 'Loading...'}
          description={order?.supplier_name}
        >
          <StatusBadge status={order?.status} />
        </PageHeader>
      </div>

      {/* Order Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Order Date</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {order?.order_date ? format(new Date(order.order_date), 'MMM d, yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Expected Delivery</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {order?.expected_date ? format(new Date(order.expected_date), 'MMM d, yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Logistics Cost</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              ${order?.logistics_cost?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-1 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              ${order?.total?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Order Items ({orderItems.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({orderDocuments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setCurrentItem(null); setItemForm(emptyItem); setItemDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
          <DataTable
            columns={itemColumns}
            data={orderItems}
            searchable={false}
            emptyMessage="No items added to this order"
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <label>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadDocMutation.isPending}
              />
              <Button asChild disabled={uploadDocMutation.isPending}>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadDocMutation.isPending ? 'Uploading...' : 'Upload Document'}
                </span>
              </Button>
            </label>
          </div>
          <div className="grid gap-4">
            {orderDocuments.length === 0 ? (
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">No documents uploaded</p>
                </CardContent>
              </Card>
            ) : (
              orderDocuments.map(doc => (
                <Card key={doc.id} className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {doc.document_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''} • {doc.document_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteDocMutation.mutate(doc.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

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
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select
                value={itemForm.warehouse_id}
                onValueChange={(value) => setItemForm({ ...itemForm, warehouse_id: value })}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ordered_quantity">Ordered Qty *</Label>
                <Input
                  id="ordered_quantity"
                  type="number"
                  value={itemForm.ordered_quantity}
                  onChange={(e) => setItemForm({ ...itemForm, ordered_quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="received_quantity">Received Qty</Label>
                <Input
                  id="received_quantity"
                  type="number"
                  value={itemForm.received_quantity}
                  onChange={(e) => setItemForm({ ...itemForm, received_quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={itemForm.purchase_price}
                  onChange={(e) => setItemForm({ ...itemForm, purchase_price: e.target.value })}
                />
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
              Are you sure you want to remove this item from the order?
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