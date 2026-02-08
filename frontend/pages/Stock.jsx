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
    queryKey: ['stock', warehouseFilter !== 'all' ? warehouseFilter : null, productFilter !== 'all' ? productFilter : null],
    queryFn: async () => {
      const params = { limit: 1000, offset: 0 };
      if (warehouseFilter !== 'all') {
        params.warehouseId = warehouseFilter;
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

  const selectedWarehouse = useMemo(() => {
    if (warehouseFilter === 'all') return null;
    return warehousesMap.get(warehouseFilter) || null;
  }, [warehouseFilter, warehousesMap]);

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
      const matchesProduct = productFilter === 'all' || item.productId.toString() === productFilter.toString();
      const matchesWarehouse = warehouseFilter === 'all' || item.warehouseId.toString() === warehouseFilter.toString();
      return matchesProduct && matchesWarehouse;
    });
  }, [enrichedStock, productFilter, warehouseFilter]);

  const totals = useMemo(() => {
    return filteredStock.reduce((acc, item) => ({
      quantity: acc.quantity + (item.currentQuantity || 0),
      positions: acc.positions + (item.currentQuantity > 0 ? 1 : 0),
    }), { quantity: 0, positions: 0 });
  }, [filteredStock]);

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
  };

  const hasActiveFilters = productFilter !== 'all' || warehouseFilter !== 'all';

  const columns = useMemo(() => {
    const cols = [
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
    ];

    // Показываем колонку склада только если не выбран конкретный склад
    if (warehouseFilter === 'all') {
      cols.push({
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
      });
    }

    cols.push(
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
      }
    );

    return cols;
  }, [warehouseFilter, productsMap, t]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title={selectedWarehouse ? `${t('stock.title')} - ${selectedWarehouse.name}` : t('stock.title')} 
        description={selectedWarehouse ? t('stock.descriptionWarehouse', { warehouse: selectedWarehouse.name }) : t('stock.description')}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              {totals.positions}
            </p>
          </CardContent>
        </Card>
        {selectedWarehouse && (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('stock.stats.warehouse')}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedWarehouse.name}
              </p>
              {selectedWarehouse.location && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedWarehouse.location}
                </p>
              )}
            </CardContent>
          </Card>
        )}
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
                <SelectValue>
                  {productFilter === 'all' 
                    ? t('stock.filters.allProducts')
                    : (() => {
                        const product = products.find(p => p.productId.toString() === productFilter.toString());
                        return product ? product.article : t('stock.filters.product');
                      })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stock.filters.allProducts')}</SelectItem>
                {products.map(product => (
                  <SelectItem key={product.productId} value={product.productId.toString()}>
                    {product.article || `ID: ${product.productId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-48">
                <SelectValue>
                  {warehouseFilter === 'all'
                    ? t('stock.filters.allWarehouses')
                    : (() => {
                        const warehouse = warehouses.find(w => w.warehouseId.toString() === warehouseFilter.toString());
                        return warehouse ? warehouse.name : t('stock.filters.warehouse');
                      })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stock.filters.allWarehouses')}</SelectItem>
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
