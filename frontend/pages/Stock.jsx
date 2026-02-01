import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useI18n } from '@/lib/i18n';
import { Package, Warehouse, History, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Stock() {
  const { t } = useI18n();
  const urlParams = new URLSearchParams(window.location.search);
  const initialProduct = urlParams.get('product') || 'all';
  const initialWarehouse = urlParams.get('warehouse') || 'all';
  
  const [productFilter, setProductFilter] = useState(initialProduct);
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouse);

  const { data: stockData, isLoading: loadingStock } = useQuery({
    queryKey: ['stock', warehouseFilter !== 'all' ? warehouseFilter : null],
    queryFn: async () => {
      const params = { limit: 1000, offset: 0 };
      if (warehouseFilter !== 'all') {
        params.warehouseId = parseInt(warehouseFilter);
      }
      const response = await api.stock.getCurrent(params);
      return Array.isArray(response) ? response : [];
    },
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

  const stock = Array.isArray(stockData) ? stockData : [];
  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

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

  const enrichedStock = useMemo(() => {
    return stock.map(item => {
      const product = productsMap.get(item.productId);
      const warehouse = warehousesMap.get(item.warehouseId);
      return {
        ...item,
        productName: product?.article || `Товар #${item.productId}`,
        warehouseName: warehouse?.name || `Склад #${item.warehouseId}`,
      };
    });
  }, [stock, productsMap, warehousesMap]);

  const filteredStock = useMemo(() => {
    return enrichedStock.filter(item => {
      const matchesProduct = productFilter === 'all' || item.productId.toString() === productFilter;
      const matchesWarehouse = warehouseFilter === 'all' || item.warehouseId.toString() === warehouseFilter;
      return matchesProduct && matchesWarehouse;
    });
  }, [enrichedStock, productFilter, warehouseFilter]);

  const totals = useMemo(() => {
    return filteredStock.reduce((acc, item) => ({
      quantity: acc.quantity + (item.currentQuantity || 0),
    }), { quantity: 0 });
  }, [filteredStock]);

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
  };

  const hasActiveFilters = productFilter !== 'all' || warehouseFilter !== 'all';

  const columns = [
    {
      accessorKey: 'productName',
      header: t('stock.table.product'),
      cell: ({ row }) => {
        const product = productsMap.get(row.original.productId);
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Package className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {row.original.productName}
              </p>
              {product && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {product.barcode || `ID: ${row.original.productId}`}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'warehouseName',
      header: t('stock.table.warehouse'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.warehouseName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'currentQuantity',
      header: t('stock.table.quantity'),
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.original.currentQuantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`${createPageUrl('StockMovements')}?product=${row.original.productId}`}>
            <History className="w-4 h-4 mr-2" />
            {t('common.history')}
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('stock.title')} 
        description={t('stock.description')}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('stock.stats.totalProducts')}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totals.quantity.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('stock.stats.positions')}</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {filteredStock.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('stock.filters.title')}</span>
            </div>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('stock.filters.product')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} {t('stock.filters.product')}</SelectItem>
                {products.map(product => (
                  <SelectItem key={product.productId} value={product.productId.toString()}>
                    {product.article || `ID: ${product.productId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('stock.filters.warehouse')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} {t('stock.filters.warehouse')}</SelectItem>
                {warehouses.map(warehouse => (
                  <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                {t('stock.filters.clear')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredStock}
        searchPlaceholder={t('stock.searchPlaceholder')}
        emptyMessage={t('stock.emptyMessage')}
        isLoading={loadingStock}
      />
    </div>
  );
}