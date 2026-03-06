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
  HelpCircle,
  Copy,
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
  // Custom weight per unit (grams). If null → falls back to product.unitWeight
  customUnitWeight: '',
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
  const subOrderFromUrl = urlParams.get('suborder') === '1';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('items');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [error, setError] = useState('');
  const [subOrderDialogOpen, setSubOrderDialogOpen] = useState(subOrderFromUrl && !!orderId);
  const [subOrderError, setSubOrderError] = useState('');
  const [subOrderTransfers, setSubOrderTransfers] = useState({});

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
        switch (err.code) {
          case 'ORDER_NOT_FOUND':
            setUploadError(t('supplierOrderDetails.itemErrors.orderNotFound'));
            break;
          case 'INVALID_DOCUMENT_NAME':
            setUploadError(t('supplierOrderDetails.documents.nameRequired'));
            break;
          case 'DOCUMENT_CREATE_FAILED':
          case 'INVALID_REQUEST':
          default:
            setUploadError(t('supplierOrderDetails.documents.uploadFailed'));
            break;
        }
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

    const rawName = (documentForm.name || documentForm.file.name || '').trim();
    if (!rawName) {
      setUploadError(t('supplierOrderDetails.documents.nameRequired'));
      return;
    }

    if (rawName.length > 255) {
      setUploadError(t('supplierOrderDetails.documents.nameTooLong'));
      return;
    }

    const rawDescription = documentForm.description?.trim() || '';
    if (rawDescription.length > 500) {
      setUploadError(t('supplierOrderDetails.documents.descriptionTooLong'));
      return;
    }

    uploadDocumentMutation.mutate({
      file: documentForm.file,
      name: rawName,
      description: rawDescription || null,
    });
  };

  const handleEditItem = (item) => {
    setCurrentItem(item);

    // Reverse-calculate the per-unit weight that was used when saving this item.
    // If the stored totalWeight differs from product.unitWeight * orderedQty, the user
    // had set a custom weight — restore it so they can see and edit it.
    const product = productsMap.get(item.productId);
    const productUnitWeight = product?.unitWeight || 0;
    const orderedQty = item.orderedQty || 0;
    const storedTotalWeight = item.totalWeight || 0;
    const derivedUnitWeight = orderedQty > 0 ? storedTotalWeight / orderedQty : 0;
    // Show custom weight only when it meaningfully differs from the product default
    const isCustomWeight = productUnitWeight > 0
      ? Math.abs(derivedUnitWeight - productUnitWeight) > 0.001
      : derivedUnitWeight > 0;
    const customUnitWeight = isCustomWeight ? String(derivedUnitWeight) : '';

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
      customUnitWeight,
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

  // Basic calculation of total price and total weight for the item.
  // All logistics and self-cost fields are computed on the backend to keep business rules in one place.
  const calculateItemTotals = (formData) => {
    const orderedQty = normalizeQty(formData.orderedQty);
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const product = productsMap.get(formData.productId);

    // Use custom weight if provided, otherwise fall back to product's unitWeight
    const customWeight = formData.customUnitWeight !== '' && formData.customUnitWeight != null
      ? parseFloat(formData.customUnitWeight) || 0
      : null;
    const unitWeight = customWeight != null ? customWeight : (product?.unitWeight || 0);

    const totalPrice = purchasePrice > 0 ? purchasePrice * orderedQty : 0;
    const totalWeight = unitWeight * orderedQty;

    return {
      totalPrice,
      totalWeight,
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
      // All logistics and self-cost fields are calculated on the backend.
      totalLogistics: null,
      unitLogistics: null,
      unitSelfCost: null,
      totalSelfCost: null,
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
        const orderedQty = row.original.orderedQty || 0;
        const totalWeightGrams =
          row.original.totalWeight != null
            ? row.original.totalWeight
            : (product?.unitWeight || 0) * orderedQty;
        // Derive per-unit weight from stored total (reflects any custom override)
        const effectiveUnitWeightGrams =
          orderedQty > 0 ? totalWeightGrams / orderedQty : (product?.unitWeight || 0);
        const totalWeightKg = totalWeightGrams / 1000;

        return (
          <div className="flex flex-col text-sm text-slate-700 dark:text-slate-300">
            <span>
              {t('supplierOrderDetails.weight.perUnit')}{' '}
              {effectiveUnitWeightGrams
                ? `${effectiveUnitWeightGrams} ${t(
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

  const handleToggleSubOrderItem = (itemId, checked, available) => {
    setSubOrderTransfers((prev) => {
      // Если позиции нет доступного количества, всегда снимаем выбор
      if (available <= 0) {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      const existing = prev[itemId] || {};
      if (!checked) {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [itemId]: {
          ...existing,
          selected: true,
        },
      };
    });
  };

  const handleChangeSubOrderQty = (itemId, value, available) => {
    const normalized = value.replace(/[^\d]/g, '');
    setSubOrderTransfers((prev) => {
      const existing = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: normalized,
        },
      };
    });
  };

  const subOrderSelectionSummary = useMemo(() => {
    let items = 0;
    let qty = 0;
    orderItems.forEach((item) => {
      const state = subOrderTransfers[item.orderItemId];
      if (!state || !state.selected) return;
      items += 1;

      const ordered = item.orderedQty || 0;
      const received = item.receivedQty || 0;
      const available = Math.max(0, ordered - received);
      if (state.quantity && state.quantity.trim() !== '') {
        const parsed = parseInt(state.quantity, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          qty += Math.min(parsed, available);
          return;
        }
      }
      qty += available;
    });
    return { items, qty };
  }, [orderItems, subOrderTransfers]);

  const createSubOrderMutation = useMutation({
    mutationFn: (payload) => api.supplierOrders.createSubOrder(orderId, payload),
    onSuccess: async () => {
      setSubOrderDialogOpen(false);
      setSubOrderError('');
      setSubOrderTransfers({});
      await refetchItems();
      await queryClient.invalidateQueries({ queryKey: ['supplierOrder', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        let message = err.message || t('supplierOrderDetails.subOrder.errors.createFailed');
        if (err.code === 'ORDER_NOT_FOUND') {
          message = t('supplierOrderDetails.subOrder.errors.orderNotFound');
        } else if (err.code === 'ORDER_ITEM_NOT_FOUND') {
          message = t('supplierOrderDetails.subOrder.errors.orderItemNotFound');
        } else if (err.code === 'INVALID_QUANTITY') {
          message = t('supplierOrderDetails.subOrder.errors.invalidQuantity');
        }
        setSubOrderError(message);
      } else {
        setSubOrderError(t('supplierOrderDetails.subOrder.errors.createFailed'));
      }
    },
  });

  const handleCreateSubOrderSubmit = (e) => {
    e.preventDefault();
    setSubOrderError('');

    if (!orderId) {
      setSubOrderError(t('supplierOrderDetails.itemErrors.orderRequired'));
      return;
    }

    const transfers = [];
    for (const item of orderItems) {
      const tx = subOrderTransfers[item.orderItemId];
      if (!tx || !tx.selected) continue;

      const ordered = item.orderedQty || 0;
      const received = item.receivedQty || 0;
      const available = Math.max(0, ordered - received);
      if (available <= 0) {
        continue;
      }

      let quantity = null;
      if (tx.quantity && tx.quantity.trim() !== '') {
        const parsed = parseInt(tx.quantity, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setSubOrderError(t('supplierOrderDetails.subOrder.errors.invalidQuantity'));
          return;
        }
        if (parsed > available) {
          setSubOrderError(t('supplierOrderDetails.subOrder.errors.quantityExceedsAvailable'));
          return;
        }
        quantity = parsed;
      }

      transfers.push({
        orderItemId: item.orderItemId,
        quantity: quantity != null ? quantity : undefined,
      });
    }

    if (transfers.length === 0) {
      setSubOrderError(t('supplierOrderDetails.subOrder.errors.nothingSelected'));
      return;
    }

    createSubOrderMutation.mutate({ itemsToMove: transfers });
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Block 5: Order Weight (total) */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('supplierOrderDetails.summaryWeight')}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {order.orderItemWeight != null
                ? `${Number(order.orderItemWeight).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t('supplierOrderDetails.weight.unitKg')}`
                : '—'}
            </p>
          </CardContent>
        </Card>

        {/* Block 6: Total Logistics */}
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

        {/* Block 7: Items Cost */}
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

        {/* Block 8: Order Total */}
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

      <Tabs defaultValue="items" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="items">
              {t('supplierOrderDetails.tabsItems')} ({orderItems.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              {t('supplierOrderDetails.tabsDocuments')} ({orderDocuments.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {activeTab === 'items' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubOrderError('');
                    setSubOrderTransfers({});
                    setSubOrderDialogOpen(true);
                  }}
                  disabled={orderItems.length === 0}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('supplierOrders.createSubOrder')}
                </Button>
                <Button onClick={() => { resetItemForm(); setItemDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('supplierOrderDetails.addItem')}
                </Button>
              </>
            )}
            {activeTab === 'documents' && (
              <Button onClick={() => { resetDocumentForm(); setDocumentDialogOpen(true); }}>
                <Upload className="w-4 h-4 mr-2" />
                {t('supplierOrderDetails.documents.upload')}
              </Button>
            )}
          </div>
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
          <div className="grid gap-4">
            {orderDocuments.length === 0 ? (
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">
                    {t('supplierOrderDetails.documents.empty')}
                  </p>
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
                    const hasQty = itemForm.orderedQty !== '' && itemForm.orderedQty != null;
                    const qtyForCalc = hasQty ? normalizeQty(itemForm.orderedQty) : 0;

                    // When product changes, reset custom weight so product default is used
                    const updatedForm = { 
                      ...itemForm, 
                      productId: value || null, 
                      orderedQty: hasQty ? qtyForCalc : '', 
                      customUnitWeight: '' 
                    };
                    const totals = calculateItemTotals({ ...updatedForm, orderedQty: qtyForCalc });
                    setItemForm({ 
                      ...updatedForm,
                      totalWeight: totals.totalWeight,
                      totalPrice: totals.totalPrice,
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
                  value={itemForm.orderedQty ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setItemForm({
                        ...itemForm,
                        orderedQty: '',
                        totalWeight: 0,
                        totalPrice: null,
                      });
                      return;
                    }
                    const qty = normalizeQty(raw);
                    const totals = calculateItemTotals({ ...itemForm, orderedQty: qty });
                    setItemForm({ 
                      ...itemForm, 
                      orderedQty: qty,
                      totalWeight: totals.totalWeight,
                      totalPrice: totals.totalPrice,
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
                    setItemForm({
                      ...itemForm,
                      receivedQty: raw,
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
                    const totals = calculateItemTotals({ ...itemForm, purchasePrice: price ?? 0 });
                    setItemForm({ 
                      ...itemForm, 
                      purchasePrice: price,
                      totalPrice: totals.totalPrice,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customUnitWeight">
                  {t('supplierOrderDetails.itemForm.itemWeight')} ({t('supplierOrderDetails.weight.unitGrams')})
                </Label>
                <Input
                  id="customUnitWeight"
                  type="number"
                  step="1"
                  min="0"
                  value={itemForm.customUnitWeight}
                  placeholder={(() => {
                    const product = productsMap.get(itemForm.productId);
                    const defaultWeight = product?.unitWeight;
                    return defaultWeight != null
                      ? String(defaultWeight)
                      : t('supplierOrderDetails.itemForm.itemWeightPlaceholder');
                  })()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const updatedForm = { ...itemForm, customUnitWeight: raw };
                    const totals = calculateItemTotals(updatedForm);
                    setItemForm({
                      ...updatedForm,
                      totalWeight: totals.totalWeight,
                    });
                  }}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('supplierOrderDetails.itemForm.itemWeightHint')}
                </p>
              </div>
            </div>
            {/* Calculated fields preview: only values, без «пустых» логистики и себестоимости */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {t('common.calculated')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('supplierOrderDetails.itemForm.totalPrice')}:
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100 max-w-[10rem] text-right truncate">
                    {itemForm.totalPrice != null
                      ? `₽${Number(itemForm.totalPrice).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('supplierOrderDetails.table.weight')}:
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100 max-w-[10rem] text-right truncate">
                    {itemForm.totalWeight
                      ? `${(itemForm.totalWeight / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t('supplierOrderDetails.weight.unitKg')}`
                      : '—'}
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

      {/* Sub-order Dialog */}
      <Dialog
        open={subOrderDialogOpen}
        onOpenChange={(open) => {
          setSubOrderDialogOpen(open);
          if (!open) {
            setSubOrderError('');
            setSubOrderTransfers({});
          }
        }}
        className="max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1500px]"
      >
        <DialogContent className="w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('supplierOrderDetails.subOrder.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubOrderSubmit} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('supplierOrderDetails.subOrder.description')}
            </p>

            {subOrderError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {subOrderError}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('supplierOrderDetails.subOrder.itemsTitle')}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {orderItems.length > 0 && (
                    <span className="whitespace-nowrap">
                      {t('supplierOrderDetails.subOrder.available')}:{' '}
                      {orderItems
                        .reduce(
                          (sum, it) =>
                            sum + Math.max(0, (it.orderedQty || 0) - (it.receivedQty || 0)),
                          0,
                        )
                        .toLocaleString()}{' '}
                      {t('supplierOrderDetails.summaryUnits')}
                    </span>
                  )}
                  {subOrderSelectionSummary.items > 0 && (
                    <span className="whitespace-nowrap">
                      {subOrderSelectionSummary.items}{' '}
                      {t('supplierOrderDetails.summaryPositionsLabel')},{' '}
                      {subOrderSelectionSummary.qty.toLocaleString()}{' '}
                      {t('supplierOrderDetails.summaryUnits')}
                    </span>
                  )}
                </div>
              </div>

              {orderItems.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t('supplierOrderDetails.subOrder.noItems')}
                </p>
              ) : (
                <div className="rounded-xl border bg-white/70 shadow-sm dark:bg-slate-900/60 dark:border-slate-800 overflow-hidden">
                  <table className="min-w-full table-fixed border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                        <th className="px-4 py-2 text-left w-56">
                          {t('supplierOrderDetails.subOrder.columnProduct')}
                        </th>
                        <th className="px-4 py-2 text-left w-40">
                          {t('supplierOrderDetails.subOrder.columnQty')}
                        </th>
                        <th className="px-4 py-2 text-left w-44">
                          {t('supplierOrderDetails.subOrder.columnPrice')}
                        </th>
                        <th className="px-4 py-2 text-left w-44">
                          {t('supplierOrderDetails.subOrder.columnWeight')}
                        </th>
                        <th className="px-4 py-2 text-left w-40">
                          {t('supplierOrderDetails.subOrder.available')}
                        </th>
                        <th className="px-4 py-2 text-left w-32">
                          {t('supplierOrderDetails.subOrder.columnMoveQty')}
                        </th>
                        <th className="px-4 py-2 text-left w-32">
                          {t('supplierOrderDetails.subOrder.columnSelect')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item) => {
                        const product = productsMap.get(item.productId);
                        const ordered = item.orderedQty || 0;
                        const received = item.receivedQty || 0;
                        const available = Math.max(0, ordered - received);
                        const totalWeightGrams = item.totalWeight || 0;
                        const unitWeightGrams =
                          ordered > 0 ? totalWeightGrams / ordered : product?.unitWeight || 0;
                        const totalWeightKg = totalWeightGrams / 1000;
                        const transferState = subOrderTransfers[item.orderItemId] || {};
                        const isDisabled = available <= 0;
                        const isSelected = !!transferState.selected && !isDisabled;

                        return (
                          <tr
                            key={item.orderItemId}
                            className={`border-b last:border-0 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/70 ${
                              isSelected ? 'bg-indigo-50/60 dark:bg-indigo-500/10' : ''
                            }`}
                          >
                            {/* Product */}
                            <td className="px-4 py-3 align-top">
                              <div className="max-w-xs">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {product?.article || product?.name || t('common.notSpecified')}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                  {product?.barcode || `ID: ${item.productId}`}
                                </p>
                              </div>
                            </td>

                            {/* Qty */}
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {t('supplierOrderDetails.table.orderedQty')} /{' '}
                                {t('supplierOrderDetails.table.receivedQty')}
                              </p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                {ordered.toLocaleString()} / {received.toLocaleString()}{' '}
                                <span className="ml-1 text-[11px] font-normal text-slate-500">
                                  {t('supplierOrderDetails.summaryUnits')}
                                </span>
                              </p>
                            </td>

                            {/* Price */}
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {t('supplierOrderDetails.table.purchasePriceLabel')} /{' '}
                                {t('supplierOrderDetails.table.totalPriceLabel')}
                              </p>
                              <p className="mt-0.5 text-sm tabular-nums">
                                <span className="text-slate-600 dark:text-slate-300">
                                  {item.purchasePrice != null
                                    ? `₽${item.purchasePrice.toFixed(2)}`
                                    : '—'}
                                </span>
                                <span className="mx-1 text-slate-400">/</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {item.totalPrice != null
                                    ? `₽${item.totalPrice.toLocaleString('ru-RU', {
                                        minimumFractionDigits: 2,
                                      })}`
                                    : '—'}
                                </span>
                              </p>
                            </td>

                            {/* Weight */}
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {t('supplierOrderDetails.weight.perUnit')} /{' '}
                                {t('supplierOrderDetails.weight.total')}
                              </p>
                              <p className="mt-0.5 text-sm tabular-nums">
                                <span className="text-slate-600 dark:text-slate-300">
                                  {unitWeightGrams
                                    ? `${unitWeightGrams.toFixed(0)} ${t(
                                        'supplierOrderDetails.weight.unitGrams',
                                      )}`
                                    : '—'}
                                </span>
                                <span className="mx-1 text-slate-400">/</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {totalWeightGrams
                                    ? `${totalWeightKg.toFixed(2)} ${t(
                                        'supplierOrderDetails.weight.unitKg',
                                      )}`
                                    : '—'}
                                </span>
                              </p>
                            </td>

                            {/* Available */}
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                  isDisabled
                                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                }`}
                              >
                                {available.toLocaleString()} {t('supplierOrderDetails.summaryUnits')}
                              </span>
                            </td>

                            {/* Move qty */}
                            <td className="px-4 py-3 align-top">
                              <Input
                                id={`moveQty-${item.orderItemId}`}
                                type="text"
                                inputMode="numeric"
                                className="h-9 w-full text-right"
                                placeholder={isDisabled ? '' : String(available)}
                                value={transferState.quantity || ''}
                                onChange={(e) =>
                                  handleChangeSubOrderQty(
                                    item.orderItemId,
                                    e.target.value,
                                    available,
                                  )
                                }
                                disabled={isDisabled}
                              />
                              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                {t('supplierOrderDetails.subOrder.moveAllLabel')}
                              </p>
                            </td>

                            {/* Select */}
                            <td className="px-4 py-3 align-top">
                              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                                <input
                                  id={`moveSelect-${item.orderItemId}`}
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    handleToggleSubOrderItem(
                                      item.orderItemId,
                                      e.target.checked,
                                      available,
                                    )
                                  }
                                  disabled={isDisabled}
                                />
                                <span className="whitespace-nowrap">
                                  {t('supplierOrderDetails.subOrder.columnSelect')}
                                </span>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSubOrderDialogOpen(false);
                  setSubOrderError('');
                  setSubOrderTransfers({});
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createSubOrderMutation.isPending || orderItems.length === 0}
              >
                {createSubOrderMutation.isPending
                  ? t('common.loading')
                  : t('supplierOrderDetails.subOrder.submit')}
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
                onChange={(e) => {
                  const value = e.target.value.slice(0, 255);
                  setDocumentForm({ ...documentForm, name: value });
                }}
                placeholder={
                  documentForm.file?.name ||
                  t('supplierOrderDetails.documents.namePlaceholder')
                }
                maxLength={255}
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
                onChange={(e) => {
                  const value = e.target.value.slice(0, 500);
                  setDocumentForm({ ...documentForm, description: value });
                }}
                placeholder={t(
                  'supplierOrderDetails.documents.descriptionPlaceholder'
                )}
                maxLength={500}
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