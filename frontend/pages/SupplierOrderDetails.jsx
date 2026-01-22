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
  ExternalLink
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
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const emptyItem = {
  productId: null,
  warehouseId: null,
  orderedQty: 0,
  receivedQty: 0,
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
        setError(err.message || 'Ошибка создания позиции');
      } else {
        setError('Ошибка создания позиции');
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
        setError(err.message || 'Ошибка обновления позиции');
      } else {
        setError('Ошибка обновления позиции');
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
        setError(err.message || 'Ошибка удаления позиции');
      } else {
        setError('Ошибка удаления позиции');
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
        throw new Error('ID заказа не указан');
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
        setUploadError(err.message || 'Ошибка загрузки документа');
      } else {
        setUploadError('Ошибка загрузки документа');
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
        setUploadError(err.message || 'Ошибка удаления документа');
      } else {
        setUploadError('Ошибка удаления документа');
      }
      setDeleteDocumentDialogOpen(false);
    },
  });

  const handleDocumentSubmit = (e) => {
    e.preventDefault();
    setUploadError('');

    if (!documentForm.file) {
      setUploadError('Выберите файл для загрузки');
      return;
    }

    const name = documentForm.name.trim() || documentForm.file.name;
    if (!name) {
      setUploadError('Введите название документа');
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
      orderedQty: item.orderedQty || 0,
      receivedQty: item.receivedQty || 0,
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

  const calculateItemTotals = (formData) => {
    const orderedQty = parseInt(formData.orderedQty) || 0;
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const unitLogistics = parseFloat(formData.unitLogistics) || 0;
    const product = productsMap.get(formData.productId);
    const unitWeight = product?.unitWeight || 0;

    const totalPrice = purchasePrice * orderedQty;
    const totalWeight = unitWeight * orderedQty;
    const totalLogistics = unitLogistics * orderedQty;
    const unitSelfCost = purchasePrice + unitLogistics;
    const totalSelfCost = unitSelfCost * orderedQty;
    const fulfillmentCost = totalLogistics * 0.1; // Пример расчета

    return {
      totalPrice,
      totalWeight,
      totalLogistics,
      unitSelfCost,
      totalSelfCost,
      fulfillmentCost,
    };
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!itemForm.productId) {
      setError('Выберите товар');
      return;
    }

    if (!itemForm.warehouseId) {
      setError('Выберите склад');
      return;
    }

    const orderedQty = parseInt(itemForm.orderedQty) || 0;
    if (orderedQty <= 0) {
      setError('Количество должно быть больше 0');
      return;
    }

    const receivedQty = parseInt(itemForm.receivedQty) || 0;
    if (receivedQty > orderedQty) {
      setError('Полученное количество не может превышать заказанное');
      return;
    }

    if (!orderId) {
      setError('ID заказа не указан');
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
      totalLogistics: totals.totalLogistics || null,
      unitLogistics: itemForm.unitLogistics ? parseFloat(itemForm.unitLogistics) : null,
      unitSelfCost: totals.unitSelfCost || null,
      totalSelfCost: totals.totalSelfCost || null,
      fulfillmentCost: totals.fulfillmentCost || null,
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
      header: 'Товар',
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
      header: 'Склад',
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
      header: 'Заказано',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.orderedQty?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'receivedQty',
      header: 'Получено',
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
      accessorKey: 'purchasePrice',
      header: 'Цена закупки',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.purchasePrice ? `₽${row.original.purchasePrice.toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalPrice',
      header: 'Сумма',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.original.totalPrice ? `₽${row.original.totalPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
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
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { setCurrentItem(row.original); setDeleteItemDialogOpen(true); }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
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
        <p className="text-slate-500">ID заказа не указан</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('SupplierOrders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к заказам
          </Link>
        </Button>
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Загрузка...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Заказ не найден</p>
        <Button asChild className="mt-4">
          <Link to={createPageUrl('SupplierOrders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к заказам
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
          title={order.orderNumber || 'Заказ'}
          description={order.buyer || 'Без покупателя'}
        >
          <StatusBadge status={getOrderStatusName(order.statusId)} />
        </PageHeader>
      </div>

      {/* Order Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Дата заказа</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {order.purchaseDate ? format(new Date(order.purchaseDate), 'dd.MM.yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">План. получение</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {order.plannedReceiptDate ? format(new Date(order.plannedReceiptDate), 'dd.MM.yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Логистика</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {order.logisticsTotal ? `₽${order.logisticsTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Сумма заказа</p>
            <p className="mt-1 text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {order.orderItemCost ? `₽${order.orderItemCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Позиции заказа ({orderItems.length})</TabsTrigger>
          <TabsTrigger value="documents">Документы ({orderDocuments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Всего: {orderTotals.totalQty} шт. | Получено: {orderTotals.receivedQty} шт. | 
              Сумма: ₽{orderTotals.totalPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
            <Button onClick={() => { resetItemForm(); setItemDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить позицию
            </Button>
          </div>
          <DataTable
            columns={itemColumns}
            data={orderItems}
            searchable={false}
            emptyMessage="Позиции не добавлены"
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
              {currentItem ? 'Редактировать позицию' : 'Добавить позицию'}
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
                <Label htmlFor="productId">Товар *</Label>
                <Select
                  value={itemForm.productId ? itemForm.productId.toString() : ''}
                  onValueChange={(value) => {
                    const product = productsMap.get(value);
                    setItemForm({ 
                      ...itemForm, 
                      productId: value || null,
                      totalWeight: product ? (product.unitWeight || 0) * (parseInt(itemForm.orderedQty) || 0) : 0,
                    });
                  }}
                >
                  <SelectTrigger id="productId">
                    <SelectValue placeholder="Выберите товар" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.productId} value={product.productId.toString()}>
                        {product.article} {product.barcode ? `(${product.barcode})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseId">Склад *</Label>
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
                    <SelectValue placeholder="Выберите склад" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(warehouse => (
                      <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderedQty">Заказано *</Label>
                <Input
                  id="orderedQty"
                  type="number"
                  min="1"
                  value={itemForm.orderedQty}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0;
                    const product = productsMap.get(itemForm.productId);
                    const totals = calculateItemTotals({ ...itemForm, orderedQty: qty });
                    setItemForm({ 
                      ...itemForm, 
                      orderedQty: qty,
                      totalWeight: totals.totalWeight,
                      totalPrice: totals.totalPrice,
                      totalLogistics: totals.totalLogistics,
                      totalSelfCost: totals.totalSelfCost,
                    });
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedQty">Получено</Label>
                <Input
                  id="receivedQty"
                  type="number"
                  min="0"
                  max={itemForm.orderedQty}
                  value={itemForm.receivedQty}
                  onChange={(e) => setItemForm({ ...itemForm, receivedQty: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Цена закупки (₽)</Label>
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
                      totalSelfCost: totals.totalSelfCost,
                      unitSelfCost: totals.unitSelfCost,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitLogistics">Логистика за единицу (₽)</Label>
                <Input
                  id="unitLogistics"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.unitLogistics || ''}
                  onChange={(e) => {
                    const logistics = parseFloat(e.target.value) || null;
                    const totals = calculateItemTotals({ ...itemForm, unitLogistics: logistics });
                    setItemForm({ 
                      ...itemForm, 
                      unitLogistics: logistics,
                      totalLogistics: totals.totalLogistics,
                      totalSelfCost: totals.totalSelfCost,
                      unitSelfCost: totals.unitSelfCost,
                    });
                  }}
                />
              </div>
            </div>
            {(itemForm.totalPrice || itemForm.totalSelfCost) && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Сумма:</span>{' '}
                    <span className="font-semibold">₽{itemForm.totalPrice?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Себестоимость:</span>{' '}
                    <span className="font-semibold">₽{itemForm.totalSelfCost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Вес:</span>{' '}
                    <span className="font-semibold">{itemForm.totalWeight} г</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Логистика:</span>{' '}
                    <span className="font-semibold">₽{itemForm.totalLogistics?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setItemDialogOpen(false);
                  resetItemForm();
                }}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
              >
                {currentItem ? 'Обновить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить позицию</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить эту позицию из заказа?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteItemDialogOpen(false)}>
              Отмена
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
              {deleteItemMutation.isPending ? 'Удаление...' : 'Удалить'}
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
            <DialogTitle>Загрузить документ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDocumentSubmit} className="space-y-4">
            {uploadError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {uploadError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="doc-file">Файл *</Label>
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
                Разрешенные форматы: PDF, DOC, DOCX, XLS, XLSX, TXT, RTF, ODT, ODS, изображения, архивы, CSV, XML (макс. 50 МБ)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-name">Название документа *</Label>
              <Input
                id="doc-name"
                value={documentForm.name}
                onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                placeholder={documentForm.file?.name || 'Введите название'}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-description">Описание</Label>
              <Input
                id="doc-description"
                value={documentForm.description || ''}
                onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                placeholder="Необязательное описание документа"
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
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={uploadDocumentMutation.isPending || !documentForm.file}
              >
                {uploadDocumentMutation.isPending ? 'Загрузка...' : 'Загрузить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={deleteDocumentDialogOpen} onOpenChange={setDeleteDocumentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить документ "{currentDocument?.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDocumentDialogOpen(false);
              setCurrentDocument(null);
            }}>
              Отмена
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
              {deleteDocumentMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}