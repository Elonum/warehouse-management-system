import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  FileText, 
  Package,
  Warehouse,
  MoreHorizontal,
  ExternalLink,
  HelpCircle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { useI18n } from '@/lib/i18n';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyItem = {
  productId: null,
  warehouseId: null,
  orderedQty: '',
  receivedQty: '',
  purchasePrice: null,
  totalPrice: null,
  totalWeight: 0,
  totalLogistics: null,
  unitLogistics: null,
  unitSelfCost: null,
  totalSelfCost: null,
  fulfillmentCost: null,
};

const computeOrderAggregatesFromItems = (items) => {
  const safeItems = Array.isArray(items) ? items : [];
  const positionsQty = safeItems.length;
  const totalQty = safeItems.reduce((sum, it) => sum + (Number(it?.orderedQty) || 0), 0);

  // totalWeight in items is stored as number (in UI we show "г"), in order we store weight in kg (float)
  const totalWeightGrams = safeItems.reduce((sum, it) => sum + (Number(it?.totalWeight) || 0), 0);
  const orderItemWeightKg = positionsQty > 0 ? totalWeightGrams / 1000 : null;

  const orderItemCost = safeItems.reduce((sum, it) => sum + (Number(it?.totalPrice) || 0), 0);
  const orderItemCostValue = positionsQty > 0 ? orderItemCost : null;

  const logisticsTotal = safeItems.reduce((sum, it) => sum + (Number(it?.totalLogistics) || 0), 0);
  const logisticsTotalValue = positionsQty > 0 ? logisticsTotal : null;

  return {
    positionsQty,
    totalQty,
    orderItemWeight: orderItemWeightKg,
    orderItemCost: orderItemCostValue,
    logisticsTotal: logisticsTotalValue,
  };
};

export default function SupplierOrderDetails() {
  const { t } = useI18n();
  const urlParams = new URLSearchParams(window.location.search);
  const orderIdParam = urlParams.get('id');
  const orderId = orderIdParam || null;
  const queryClient = useQueryClient();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [error, setError] = useState('');

  const { data: orderData, isLoading: loadingOrder } = useQuery({
    queryKey: ['supplierOrder', orderId],
    queryFn: async () => {
      const response = await api.supplierOrders.get(orderId);
      return response;
    },
    enabled: !!orderId,
  });

  const { data: orderItemsData, isLoading: loadingItems, refetch: refetchItems } = useQuery({
    queryKey: ['supplierOrderItems', orderId],
    queryFn: async () => {
      const response = await api.supplierOrders.getItems(orderId);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!orderId,
  });

  const { data: orderDocumentsData, isLoading: loadingDocs, refetch: refetchDocuments } = useQuery({
    queryKey: ['supplierOrderDocuments', orderId],
    queryFn: async () => {
      const response = await api.supplierOrders.getDocuments(orderId);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!orderId,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.warehouses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: orderStatusesData } = useQuery({
    queryKey: ['orderStatuses'],
    queryFn: async () => {
      const response = await api.orderStatuses.list({ limit: 100, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const order = orderData;
  const orderItems = Array.isArray(orderItemsData) ? orderItemsData : [];
  const orderDocuments = Array.isArray(orderDocumentsData) ? orderDocumentsData : [];
  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
  const orderStatuses = Array.isArray(orderStatusesData) ? orderStatusesData : [];

  const productsMap = useMemo(() => {
    const map = new Map();
    products.forEach(p => map.set(p.productId, p));
    return map;
  }, [products]);

  const warehousesMap = useMemo(() => {
    const map = new Map();
    warehouses.forEach(w => map.set(w.warehouseId, w));
    return map;
  }, [warehouses]);

  const orderStatusesMap = useMemo(() => {
    const map = new Map();
    orderStatuses.forEach(s => map.set(s.orderStatusId, s.name));
    return map;
  }, [orderStatuses]);

  const getOrderStatusName = (statusId) => {
    if (!statusId) return '—';
    return orderStatusesMap.get(statusId) || '—';
  };

  const applyOptimisticOrderAggregates = (nextItems) => {
    const agg = computeOrderAggregatesFromItems(nextItems);

    queryClient.setQueryData(['supplierOrder', orderId], (old) => {
      if (!old) return old;
      return {
        ...old,
        positionsQty: agg.positionsQty,
        totalQty: agg.totalQty,
        orderItemWeight: agg.orderItemWeight,
        orderItemCost: agg.orderItemCost,
        // Important: logistics_total in DB is also stored; we update it optimistically to avoid lag in UI
        logisticsTotal: agg.logisticsTotal,
      };
    });

    // Keep list page in sync if it's already cached
    queryClient.setQueryData(['supplierOrders'], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((o) => {
        if (o?.orderId !== orderId) return o;
        return {
          ...o,
          positionsQty: agg.positionsQty,
          totalQty: agg.totalQty,
          orderItemWeight: agg.orderItemWeight,
          orderItemCost: agg.orderItemCost,
          logisticsTotal: agg.logisticsTotal,
        };
      });
    });
  };

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: (data) => api.supplierOrderItems.create(data),
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['supplierOrderItems', orderId] });
      const previousItems = queryClient.getQueryData(['supplierOrderItems', orderId]);
      const previousOrder = queryClient.getQueryData(['supplierOrder', orderId]);
      const previousOrdersList = queryClient.getQueryData(['supplierOrders']);

      const optimisticItem = {
        ...newItem,
        orderItemId: -Date.now(),
      };

      const nextItems = Array.isArray(previousItems) ? [...previousItems, optimisticItem] : [optimisticItem];
      queryClient.setQueryData(['supplierOrderItems', orderId], nextItems);
      applyOptimisticOrderAggregates(nextItems);

      return { previousItems, previousOrder, previousOrdersList };
    },
    onSuccess: async () => {
      setItemDialogOpen(false);
      resetItemForm();
      setError('');
      await refetchItems();
      await queryClient.invalidateQueries({ queryKey: ['supplierOrder', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
    },
    onError: (err, _newItem, context) => {
      if (context?.previousItems !== undefined) {
        queryClient.setQueryData(['supplierOrderItems', orderId], context.previousItems);
      }
      if (context?.previousOrder !== undefined) {
        queryClient.setQueryData(['supplierOrder', orderId], context.previousOrder);
      }
      if (context?.previousOrdersList !== undefined) {
        queryClient.setQueryData(['supplierOrders'], context.previousOrdersList);
      }

    if (err instanceof ApiError) {
      let message = err.message || t('supplierOrderDetails.itemErrors.createFailed');
      if (err.code === 'INVALID_REQUEST') {
        if (err.message?.includes('orderId is required')) {
          message = t('supplierOrderDetails.itemErrors.orderRequired');
        } else if (err.message?.includes('productId is required')) {
          message = t('supplierOrderDetails.itemErrors.productRequired');
        } else if (err.message?.includes('warehouseId is required')) {
          message = t('supplierOrderDetails.itemErrors.warehouseRequired');
        } else if (
          err.message?.includes('orderedQty must be non-negative') ||
          err.message?.includes('receivedQty must be non-negative') ||
          err.message?.includes('totalWeight must be non-negative') ||
          err.message?.includes('purchasePrice must be non-negative') ||
          err.message?.includes('totalPrice must be non-negative') ||
          err.message?.includes('totalLogistics must be non-negative') ||
          err.message?.includes('unitLogistics must be non-negative')
        ) {
          message = t('supplierOrderDetails.itemErrors.nonNegative');
        }
      } else if (err.code === 'INVALID_QUANTITY') {
        message = t('supplierOrderDetails.itemErrors.invalidQuantity');
      } else if (err.code === 'ORDER_NOT_FOUND') {
        message = t('supplierOrderDetails.itemErrors.orderNotFound');
      } else if (err.code === 'PRODUCT_NOT_FOUND') {
        message = t('supplierOrderDetails.itemErrors.productNotFound');
      } else if (err.code === 'WAREHOUSE_NOT_FOUND') {
        message = t('supplierOrderDetails.itemErrors.warehouseNotFound');
      } else if (err.code === 'ITEM_EXISTS') {
        message = t('supplierOrderDetails.itemErrors.invalidQuantity');
      }
      setError(message);
    } else {
      setError(t('supplierOrderDetails.itemErrors.createFailed'));
    }
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => api.supplierOrderItems.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['supplierOrderItems', orderId] });
      const previousItems = queryClient.getQueryData(['supplierOrderItems', orderId]);
      const previousOrder = queryClient.getQueryData(['supplierOrder', orderId]);
      const previousOrdersList = queryClient.getQueryData(['supplierOrders']);

      const nextItems = Array.isArray(previousItems)
        ? previousItems.map((it) => (it?.orderItemId === id ? { ...it, ...data } : it))
        : previousItems;

      queryClient.setQueryData(['supplierOrderItems', orderId], nextItems);
      applyOptimisticOrderAggregates(nextItems);

      return { previousItems, previousOrder, previousOrdersList };
    },
    onSuccess: async () => {
      setItemDialogOpen(false);
      resetItemForm();
      setError('');
      await refetchItems();
      await queryClient.invalidateQueries({ queryKey: ['supplierOrder', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
    },
    onError: (err, _vars, context) => {
      if (context?.previousItems !== undefined) {
        queryClient.setQueryData(['supplierOrderItems', orderId], context.previousItems);
      }
      if (context?.previousOrder !== undefined) {
        queryClient.setQueryData(['supplierOrder', orderId], context.previousOrder);
      }
      if (context?.previousOrdersList !== undefined) {
        queryClient.setQueryData(['supplierOrders'], context.previousOrdersList);
      }

    if (err instanceof ApiError) {
      let message = err.message || t('supplierOrderDetails.itemErrors.updateFailed');
      if (err.code === 'INVALID_REQUEST') {
        if (err.message?.includes('orderId is required')) {
          message = t('supplierOrderDetails.itemErrors.orderRequired');
        } else if (err.message?.includes('productId is required')) {
          message = t('supplierOrderDetails.itemErrors.productRequired');
        } else if (err.message?.includes('warehouseId is required')) {
          message = t('supplierOrderDetails.itemErrors.warehouseRequired');
        } else if (
          err.message?.includes('orderedQty must be non-negative') ||
          err.message?.includes('receivedQty must be non-negative') ||
          err.message?.includes('totalWeight must be non-negative') ||
          err.message?.includes('purchasePrice must be non-negative') ||
          err.message?.includes('totalPrice must be non-negative') ||
          err.message?.includes('totalLogistics must be non-negative') ||
          err.message?.includes('unitLogistics must be non-negative')
        ) {
          message = t('supplierOrderDetails.itemErrors.nonNegative');
        }
      } else if (err.code === 'INVALID_QUANTITY') {
        message = t('supplierOrderDetails.itemErrors.invalidQuantity');
      } else if (err.code === 'ORDER_NOT_FOUND') {
        message = t('supplierOrderDetails.itemErrors.orderNotFound');
      } else if (err.code === 'PRODUCT_NOT_FOUND') {
        message = t('supplierOrderDetails.itemErrors.productNotFound');
      } else if (err.code === 'WAREHOUSE_NOT_FOUND') {
        message = t('supplierOrderDetails.itemErrors.warehouseNotFound');
      } else if (err.code === 'ITEM_NOT_FOUND') {
        message = t('supplierOrderDetails.itemErrors.itemNotFound');
      }
      setError(message);
    } else {
      setError(t('supplierOrderDetails.itemErrors.updateFailed'));
    }
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => api.supplierOrderItems.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['supplierOrderItems', orderId] });
      const previousData = queryClient.getQueryData(['supplierOrderItems', orderId]);
      const previousOrder = queryClient.getQueryData(['supplierOrder', orderId]);
      const previousOrdersList = queryClient.getQueryData(['supplierOrders']);
      
      const nextItems = Array.isArray(previousData)
        ? previousData.filter((item) => item.orderItemId !== deletedId)
        : previousData;

      queryClient.setQueryData(['supplierOrderItems', orderId], nextItems);
      applyOptimisticOrderAggregates(nextItems);
      
      return { previousData, previousOrder, previousOrdersList };
    },
    onSuccess: async () => {
      setDeleteItemDialogOpen(false);
      setCurrentItem(null);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['supplierOrderItems', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['supplierOrder', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
      await refetchItems();
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['supplierOrderItems', orderId], context.previousData);
      }
      if (context?.previousOrder !== undefined) {
        queryClient.setQueryData(['supplierOrder', orderId], context.previousOrder);
      }
      if (context?.previousOrdersList !== undefined) {
        queryClient.setQueryData(['supplierOrders'], context.previousOrdersList);
      }
      if (err instanceof ApiError) {
        let message = err.message || t('supplierOrderDetails.itemErrors.deleteFailed');
        if (err.code === 'ITEM_NOT_FOUND') {
          message = t('supplierOrderDetails.itemErrors.itemNotFound');
        }
        setError(message);
      } else {
        setError(t('supplierOrderDetails.itemErrors.deleteFailed'));
      }
      setDeleteItemDialogOpen(false);
    },
  });

  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [deleteDocumentDialogOpen, setDeleteDocumentDialogOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentForm, setDocumentForm] = useState({ name: '', description: '', file: null });
  const [uploadError, setUploadError] = useState('');

  const resetItemForm = () => {
    setItemForm(emptyItem);
    setCurrentItem(null);
    setError('');
  };

  const resetDocumentForm = () => {
    setDocumentForm({ name: '', description: '', file: null });
    setUploadError('');
  };

  // Document mutations
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, name, description }) => {
      if (!orderId) {
        throw new Error(t('supplierOrderDetails.itemErrors.orderRequired'));
      }
      // First upload the file
      const uploadResult = await api.upload.uploadFile(file);
      
      // Then create document record
      return await api.supplierOrderDocuments.create({
        orderId: orderId,
        name: name || file.name,
        description: description || null,
        filePath: uploadResult.filePath,
      });
    },
    onSuccess: async () => {
      setDocumentDialogOpen(false);
      resetDocumentForm();
      setUploadError('');
      await refetchDocuments();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setUploadError(err.message || t('supplierOrderDetails.documents.uploadFailed'));
      } else {
        setUploadError(t('supplierOrderDetails.documents.uploadFailed'));
      }
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => api.supplierOrderDocuments.delete(id),
    onSuccess: async () => {
      setDeleteDocumentDialogOpen(false);
      setCurrentDocument(null);
      setUploadError('');
      await refetchDocuments();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setUploadError(err.message || t('supplierOrderDetails.documents.deleteFailed'));
      } else {
        setUploadError(t('supplierOrderDetails.documents.deleteFailed'));
      }
      setDeleteDocumentDialogOpen(false);
    },
  });

  const handleDocumentSubmit = (e) => {
    e.preventDefault();
    setUploadError('');

    if (!documentForm.file) {
      setUploadError(t('supplierOrderDetails.documents.noFile'));
      return;
    }

    const name = documentForm.name.trim() || documentForm.file.name;
    if (!name) {
      setUploadError(t('supplierOrderDetails.documents.nameRequired'));
      return;
    }

    uploadDocumentMutation.mutate({
      file: documentForm.file,
      name,
      description: documentForm.description?.trim() || null,
    });
  };

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setItemForm({
      productId: item.productId,
      warehouseId: item.warehouseId,
      orderedQty: item.orderedQty || '',
      receivedQty: item.receivedQty || '',
      purchasePrice: item.purchasePrice || null,
      totalPrice: item.totalPrice || null,
      totalWeight: item.totalWeight || 0,
      totalLogistics: item.totalLogistics || null,
      unitLogistics: item.unitLogistics || null,
      unitSelfCost: item.unitSelfCost || null,
      totalSelfCost: item.totalSelfCost || null,
      fulfillmentCost: item.fulfillmentCost || null,
    });
    setItemDialogOpen(true);
  };

  const getSelectedProductLabel = () => {
    if (!itemForm.productId) return '';
    const product = productsMap.get(itemForm.productId);
    return product?.article || '';
  };

  const getSelectedWarehouseLabel = () => {
    if (!itemForm.warehouseId) return '';
    const warehouse = warehousesMap.get(itemForm.warehouseId);
    return warehouse?.name || '';
  };

  // Helper function to normalize quantity from string or number to number
  const normalizeQty = (qty) => {
    if (typeof qty === 'string') {
      return qty === '' ? 0 : parseInt(qty) || 0;
    }
    return qty || 0;
  };

  // Calculate logistics automatically based on weight distribution
  // Formula: unit_logistics = (item_weight_kg / total_order_weight_kg) * total_order_logistics
  // Returns null if logistics cannot be calculated (order doesn't have logistics_total or order_item_weight)
  const calculateItemLogistics = (itemWeightGrams, orderedQty) => {
    if (!order || !order.logisticsTotal || !order.orderItemWeight) {
      return { unitLogistics: null, totalLogistics: null };
    }

    const itemWeightKg = itemWeightGrams / 1000.0;
    const totalOrderWeightKg = Number(order.orderItemWeight) || 0;
    const totalOrderLogistics = Number(order.logisticsTotal) || 0;

    if (totalOrderWeightKg <= 0 || totalOrderLogistics <= 0) {
      return { unitLogistics: null, totalLogistics: null };
    }

    // Calculate unit logistics: (item_weight_kg / total_order_weight_kg) * total_order_logistics
    const unitLogistics = (itemWeightKg / totalOrderWeightKg) * totalOrderLogistics;
    // Calculate total logistics: unit_logistics * ordered_qty
    const totalLogistics = unitLogistics * orderedQty;

    return { unitLogistics, totalLogistics };
  };

  const calculateItemTotals = (formData) => {
    const orderedQty = normalizeQty(formData.orderedQty);
    const receivedQty = normalizeQty(formData.receivedQty);
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const product = productsMap.get(formData.productId);
    const unitWeight = product?.unitWeight || 0;

    const totalPrice = purchasePrice > 0 ? purchasePrice * orderedQty : 0;
    const totalWeight = unitWeight * orderedQty;

    // Logistics: auto-calculated proportional to weight
    const { unitLogistics, totalLogistics } = calculateItemLogistics(totalWeight, orderedQty);

    // Self-cost: purchase_price + unit_logistics (mirrors backend logic)
    // total_self_cost uses receivedQty (goods actually received), matching backend
    let unitSelfCost = null;
    let totalSelfCost = null;
    if (purchasePrice > 0 || unitLogistics != null) {
      unitSelfCost = purchasePrice + (unitLogistics ?? 0);
      // For preview in the form we use orderedQty since receivedQty may be 0 on creation
      const qtyForSelfCost = receivedQty > 0 ? receivedQty : orderedQty;
      totalSelfCost = unitSelfCost * qtyForSelfCost;
    }

    return {
      totalPrice,
      totalWeight,
      totalLogistics,
      unitLogistics,
      unitSelfCost,
      totalSelfCost,
    };
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!itemForm.productId) {
      setError(t('supplierOrderDetails.itemErrors.productRequired'));
      return;
    }

    if (!itemForm.warehouseId) {
      setError(t('supplierOrderDetails.itemErrors.warehouseRequired'));
      return;
    }

    const orderedQty = normalizeQty(itemForm.orderedQty);
    if (orderedQty <= 0) {
      setError(t('supplierOrderDetails.itemErrors.orderedQtyPositive'));
      return;
    }

    const receivedQty = normalizeQty(itemForm.receivedQty);
    if (receivedQty > orderedQty) {
      setError(t('supplierOrderDetails.itemErrors.receivedNotGreater'));
      return;
    }

    if (!orderId) {
      setError(t('supplierOrderDetails.itemErrors.orderRequired'));
      return;
    }

    const totals = calculateItemTotals(itemForm);

    const data = {
      orderId: orderId,
      productId: itemForm.productId,
      warehouseId: itemForm.warehouseId,
      orderedQty: orderedQty,
      receivedQty: receivedQty,
      purchasePrice: itemForm.purchasePrice ? parseFloat(itemForm.purchasePrice) : null,
      totalPrice: totals.totalPrice || null,
      totalWeight: totals.totalWeight,
      // Logistics: null means not yet calculable (order has no logistics_total / weight)
      totalLogistics: totals.totalLogistics != null ? totals.totalLogistics : null,
      unitLogistics: totals.unitLogistics != null ? totals.unitLogistics : null,
      // Self-cost is recalculated server-side; send preview values so optimistic UI looks right
      unitSelfCost: totals.unitSelfCost != null ? totals.unitSelfCost : null,
      totalSelfCost: totals.totalSelfCost != null ? totals.totalSelfCost : null,
    };

    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.orderItemId, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const itemColumns = [
    {
      accessorKey: 'productId',
      header: t('supplierOrderDetails.table.product'),
      cell: ({ row }) => {
        const product = productsMap.get(row.original.productId);
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-slate-800">
              <Package className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {product?.article || `ID: ${row.original.productId}`}
              </p>
              {product?.barcode && (
                <p className="text-xs text-slate-500">
                  {product.barcode}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'warehouseId',
      header: t('supplierOrderDetails.table.warehouse'),
      cell: ({ row }) => {
        const warehouse = warehousesMap.get(row.original.warehouseId);
        return (
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">
              {warehouse?.name || `ID: ${row.original.warehouseId}`}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'orderedQty',
      header: t('supplierOrderDetails.table.orderedQty'),
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.orderedQty?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'receivedQty',
      header: t('supplierOrderDetails.table.receivedQty'),
      cell: ({ row }) => {
        const received = row.original.receivedQty || 0;
        const ordered = row.original.orderedQty || 0;
        return (
          <span className={`font-medium ${
            received >= ordered
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {received.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: 'weight',
      header: t('supplierOrderDetails.table.weight'),
      cell: ({ row }) => {
        const product = productsMap.get(row.original.productId);
        const unitWeightGrams = product?.unitWeight || 0;
        const orderedQty = row.original.orderedQty || 0;
        const totalWeightGrams =
          row.original.totalWeight != null
            ? row.original.totalWeight
            : unitWeightGrams * orderedQty;
        const totalWeightKg = totalWeightGrams / 1000;

        return (
          <div className="flex flex-col text-sm text-slate-700 dark:text-slate-300">
            <span>
              {t('supplierOrderDetails.weight.perUnit')}{' '}
              {unitWeightGrams
                ? `${unitWeightGrams} ${t(
                    'supplierOrderDetails.weight.unitGrams'
                  )}`
                : '—'}
            </span>
            <span>
              <span className="font-semibold">
                {t('supplierOrderDetails.weight.total')}:
              </span>{' '}
              {totalWeightGrams
                ? `${totalWeightKg.toFixed(2)} ${t(
                    'supplierOrderDetails.weight.unitKg'
                  )}`
                : '—'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'price',
      header: t('supplierOrderDetails.table.price'),
      cell: ({ row }) => {
        const purchasePrice = row.original.purchasePrice;
        const totalPrice = row.original.totalPrice;
        return (
          <div className="flex flex-col text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {t('supplierOrderDetails.table.purchasePriceLabel')}: {purchasePrice ? `₽${purchasePrice.toFixed(2)}` : '—'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {t('supplierOrderDetails.table.totalPriceLabel')}: {totalPrice ? `₽${totalPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'logistics',
      header: t('supplierOrderDetails.table.logistics'),
      cell: ({ row }) => {
        const unitLogistics = row.original.unitLogistics;
        const totalLogistics = row.original.totalLogistics;
        return (
          <div className="flex flex-col text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {t('supplierOrderDetails.table.unitLogisticsLabel')}: {unitLogistics != null ? `₽${unitLogistics.toFixed(2)}` : '—'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {t('supplierOrderDetails.table.totalLogisticsLabel')}: {totalLogistics != null ? `₽${totalLogistics.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'selfCost',
      header: t('supplierOrderDetails.table.selfCost'),
      cell: ({ row }) => {
        const unitSelfCost = row.original.unitSelfCost;
        const totalSelfCost = row.original.totalSelfCost;
        return (
          <div className="flex flex-col text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {t('supplierOrderDetails.table.unitSelfCostLabel')}: {unitSelfCost != null ? `₽${unitSelfCost.toFixed(2)}` : '—'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {t('supplierOrderDetails.table.totalSelfCostLabel')}: {totalSelfCost != null ? `₽${totalSelfCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: t('supplierOrderDetails.table.actions'),
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
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { setCurrentItem(row.original); setDeleteItemDialogOpen(true); }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const orderTotals = useMemo(() => {
    return orderItems.reduce((acc, item) => ({
      totalQty: acc.totalQty + (item.orderedQty || 0),
      receivedQty: acc.receivedQty + (item.receivedQty || 0),
      totalPrice: acc.totalPrice + (item.totalPrice || 0),
      totalWeight: acc.totalWeight + (item.totalWeight || 0),
    }), { totalQty: 0, receivedQty: 0, totalPrice: 0, totalWeight: 0 });
  }, [orderItems]);

  if (!orderId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{t('supplierOrderDetails.noId')}</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('SupplierOrders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('supplierOrderDetails.backToList')}
          </Link>
        </Button>
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{t('supplierOrderDetails.notFound')}</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('SupplierOrders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('supplierOrderDetails.backToList')}
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
          title={order.orderNumber || t('supplierOrderDetails.title')}
          description={order.buyer || ''}
        >
          <StatusBadge status={getOrderStatusName(order.statusId)} />
        </PageHeader>
      </div>

      {/* Order Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* Block 1: Order Date */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('supplierOrderDetails.summaryPurchaseDate')}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {order.purchaseDate ? format(new Date(order.purchaseDate), 'dd.MM.yyyy') : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Block 2: Planned Receipt */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('supplierOrderDetails.summaryPlannedReceipt')}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {order.plannedReceiptDate ? format(new Date(order.plannedReceiptDate), 'dd.MM.yyyy') : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Block 3: Ordered Quantity */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('supplierOrderDetails.summaryOrderedQty')}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {orderTotals.totalQty} {t('supplierOrderDetails.summaryUnits')}
            </p>
          </CardContent>
        </Card>

        {/* Block 4: Received Quantity */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('supplierOrderDetails.summaryReceivedQty')}
            </p>
            <p className={`mt-1 text-base font-semibold ${
              orderTotals.receivedQty >= orderTotals.totalQty
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {orderTotals.receivedQty} {t('supplierOrderDetails.summaryUnits')}
            </p>
          </CardContent>
        </Card>

        {/* Block 5: Total Logistics */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('supplierOrderDetails.summaryTotalLogistics')}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {order.logisticsTotal ? `₽${order.logisticsTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Block 6: Items Cost */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('supplierOrderDetails.summaryItemsCost')}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {order.orderItemCost ? `₽${order.orderItemCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Block 7: Order Total */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('supplierOrderDetails.summaryTotal')}
              </p>
              <span
                className="relative inline-flex items-center group"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <HelpCircle className="w-3 h-3 text-slate-400" />
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md border bg-white px-2 py-1 text-xs font-normal text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {t('supplierOrderDetails.summaryTotalHint')}
                </span>
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {(() => {
                const itemsCost = Number(order.orderItemCost) || 0;
                const logisticsTotal = Number(order.logisticsTotal) || 0;
                const total = itemsCost + logisticsTotal;
                return total > 0 ? `₽${total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—';
              })()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="items">
              {t('supplierOrderDetails.tabsItems')} ({orderItems.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              {t('supplierOrderDetails.tabsDocuments')} ({orderDocuments.length})
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => { resetItemForm(); setItemDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('supplierOrderDetails.addItem')}
          </Button>
        </div>

        <TabsContent value="items" className="space-y-4">
          <DataTable
            columns={itemColumns}
            data={orderItems}
            searchable={false}
            emptyMessage={t('supplierOrderDetails.emptyItems')}
            isLoading={loadingItems}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {uploadError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
              {uploadError}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => { resetDocumentForm(); setDocumentDialogOpen(true); }}>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить документ
            </Button>
          </div>
          <div className="grid gap-4">
            {orderDocuments.length === 0 ? (
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">Документы не загружены</p>
                </CardContent>
              </Card>
            ) : (
              orderDocuments.map(doc => (
                <Card key={doc.documentId} className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {doc.name}
                        </p>
                        {doc.description && (
                          <p className="text-sm text-slate-500">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.filePath && (
                        <>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={api.upload.getFileUrl(doc.filePath) || '#'} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setCurrentDocument(doc);
                              setDeleteDocumentDialogOpen(true);
                            }}
                            disabled={deleteDocumentMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Item Dialog */}
      <Dialog 
        open={itemDialogOpen} 
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) {
            resetItemForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentItem
                ? t('supplierOrderDetails.itemForm.submitUpdate')
                : t('supplierOrderDetails.itemForm.submitCreate')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productId">
                  {t('supplierOrderDetails.itemForm.product')} *
                </Label>
                <Select
                  value={itemForm.productId ? itemForm.productId.toString() : ''}
                  onValueChange={(value) => {
                    const qty = normalizeQty(itemForm.orderedQty);
                    const totals = calculateItemTotals({ ...itemForm, productId: value || null, orderedQty: qty });
                    setItemForm({ 
                      ...itemForm, 
                      productId: value || null,
                      totalWeight: totals.totalWeight,
                      totalPrice: totals.totalPrice,
                      totalLogistics: totals.totalLogistics,
                      totalSelfCost: totals.totalSelfCost,
                    });
                  }}
                >
                  <SelectTrigger id="productId">
                    <SelectValue placeholder={t('supplierOrderDetails.itemForm.product')}>
                      {getSelectedProductLabel()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.productId} value={product.productId.toString()}>
                        {product.article || product.name || t('common.notSpecified')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseId">
                  {t('supplierOrderDetails.itemForm.warehouse')} *
                </Label>
                <Select
                  value={itemForm.warehouseId ? itemForm.warehouseId.toString() : ''}
                  onValueChange={(value) => {
                    setItemForm({ 
                      ...itemForm, 
                      warehouseId: value || null 
                    });
                  }}
                >
                  <SelectTrigger id="warehouseId">
                    <SelectValue placeholder={t('supplierOrderDetails.itemForm.warehouse')}>
                      {getSelectedWarehouseLabel()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(warehouse => (
                      <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId.toString()}>
                        {warehouse.name || t('common.notSpecified')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderedQty">
                  {t('supplierOrderDetails.itemForm.orderedQty')} *
                </Label>
                <Input
                  id="orderedQty"
                  type="number"
                  min="1"
                  value={itemForm.orderedQty}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const qty = raw === '' ? '' : normalizeQty(raw);
                    const totals = calculateItemTotals({ ...itemForm, orderedQty: qty === '' ? 0 : qty });
                    setItemForm({ 
                      ...itemForm, 
                      orderedQty: raw,
                      totalWeight: totals.totalWeight,
                      totalPrice: totals.totalPrice,
                      totalLogistics: totals.totalLogistics,
                      unitLogistics: totals.unitLogistics,
                      totalSelfCost: totals.totalSelfCost,
                      unitSelfCost: totals.unitSelfCost,
                    });
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedQty">
                  {t('supplierOrderDetails.itemForm.receivedQty')}
                </Label>
                <Input
                  id="receivedQty"
                  type="number"
                  min="0"
                  max={normalizeQty(itemForm.orderedQty)}
                  value={itemForm.receivedQty}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const totals = calculateItemTotals({ ...itemForm, receivedQty: raw });
                    setItemForm({
                      ...itemForm,
                      receivedQty: raw,
                      totalSelfCost: totals.totalSelfCost,
                    });
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">
                  {t('supplierOrderDetails.itemForm.purchasePrice')} (₽)
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.purchasePrice || ''}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || null;
                    const totals = calculateItemTotals({ ...itemForm, purchasePrice: price });
                    setItemForm({ 
                      ...itemForm, 
                      purchasePrice: price,
                      totalPrice: totals.totalPrice,
                      totalLogistics: totals.totalLogistics,
                      unitLogistics: totals.unitLogistics,
                      totalSelfCost: totals.totalSelfCost,
                      unitSelfCost: totals.unitSelfCost,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitLogistics">
                  {t('supplierOrderDetails.itemForm.unitLogistics')} (₽)
                </Label>
                <Input
                  id="unitLogistics"
                  type="number"
                  step="0.01"
                  min="0"
                  readOnly
                  value={(() => {
                    const totals = calculateItemTotals(itemForm);
                    return totals.unitLogistics != null ? totals.unitLogistics.toFixed(2) : '';
                  })()}
                  className="bg-slate-50 dark:bg-slate-800 cursor-not-allowed"
                  title={t('supplierOrderDetails.itemForm.logisticsAutoCalculated')}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('supplierOrderDetails.itemForm.logisticsAutoCalculated')}
                </p>
              </div>
            </div>
            {/* Calculated fields preview */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                {t('common.calculated')}
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('supplierOrderDetails.itemForm.totalPrice')}:</span>
                  <span className="font-semibold">₽{(itemForm.totalPrice || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('supplierOrderDetails.table.weight')}:</span>
                  <span className="font-semibold">
                    {itemForm.totalWeight || 0} {t('supplierOrderDetails.weight.unitGrams')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('supplierOrderDetails.itemForm.totalLogistics')}:</span>
                  <span className="font-semibold">
                    {itemForm.totalLogistics != null ? `₽${Number(itemForm.totalLogistics).toFixed(2)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('supplierOrderDetails.itemForm.totalSelfCost')}:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {itemForm.totalSelfCost != null ? `₽${Number(itemForm.totalSelfCost).toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setItemDialogOpen(false);
                  resetItemForm();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
              >
                {currentItem
                  ? t('supplierOrderDetails.itemForm.submitUpdate')
                  : t('supplierOrderDetails.itemForm.submitCreate')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('supplierOrderDetails.itemErrors.deleteFailed')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('supplierOrderDetails.itemErrors.deleteFailed')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteItemDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteItemMutation.mutate(currentItem.orderItemId);
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteItemMutation.isPending}
            >
              {deleteItemMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Upload Dialog */}
      <Dialog 
        open={documentDialogOpen} 
        onOpenChange={(open) => {
          setDocumentDialogOpen(open);
          if (!open) {
            resetDocumentForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('supplierOrderDetails.documents.uploadTitle')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDocumentSubmit} className="space-y-4">
            {uploadError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {uploadError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="doc-file">
                {t('supplierOrderDetails.documents.file')} *
              </Label>
              <Input
                id="doc-file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf,.odt,.ods,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.zip,.rar,.7z,.tar,.gz,.csv,.xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDocumentForm({ 
                      ...documentForm, 
                      file,
                      name: documentForm.name || file.name 
                    });
                  }
                }}
                required
              />
              <p className="text-xs text-slate-500">
                {t('supplierOrderDetails.documents.allowedFormats')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-name">
                {t('supplierOrderDetails.documents.name')} *
              </Label>
              <Input
                id="doc-name"
                value={documentForm.name}
                onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                placeholder={
                  documentForm.file?.name ||
                  t('supplierOrderDetails.documents.namePlaceholder')
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-description">
                {t('supplierOrderDetails.documents.description')}
              </Label>
              <Input
                id="doc-description"
                value={documentForm.description || ''}
                onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                placeholder={t(
                  'supplierOrderDetails.documents.descriptionPlaceholder'
                )}
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setDocumentDialogOpen(false);
                  resetDocumentForm();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={uploadDocumentMutation.isPending || !documentForm.file}
              >
                {uploadDocumentMutation.isPending
                  ? t('common.loading')
                  : t('supplierOrderDetails.documents.upload')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={deleteDocumentDialogOpen} onOpenChange={setDeleteDocumentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('supplierOrderDetails.documents.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('supplierOrderDetails.documents.deleteDescription', {
                name: currentDocument?.name || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDocumentDialogOpen(false);
              setCurrentDocument(null);
            }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentDocument) {
                  deleteDocumentMutation.mutate(currentDocument.documentId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending
                ? t('common.deleting')
                : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}