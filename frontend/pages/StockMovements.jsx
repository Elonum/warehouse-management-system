import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Package, Warehouse, Filter, X, Calendar, Boxes } from 'lucide-react';
import { api } from '@/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

const SNAPSHOT_LIST_LIMIT = 500;

export default function StockMovements() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get('product') || 'all';

  const [productFilter, setProductFilter] = useState(initialProduct);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ['stock-snapshots', SNAPSHOT_LIST_LIMIT],
    queryFn: async () => {
      const response = await api.stockSnapshots.list({ limit: SNAPSHOT_LIST_LIMIT, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.warehouses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const ownWarehouses = useMemo(
    () => warehouses.filter((w) => !w?.isMarketplace),
    [warehouses],
  );

  const productsById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(String(p.productId), p));
    return map;
  }, [products]);

  const warehousesById = useMemo(() => {
    const map = new Map();
    ownWarehouses.forEach((w) => map.set(String(w.warehouseId), w));
    return map;
  }, [ownWarehouses]);

  const enrichedSnapshots = useMemo(
    () =>
      snapshots.map((row) => {
        const product = productsById.get(String(row.productId));
        const warehouse = warehousesById.get(String(row.warehouseId));
        return {
          ...row,
          productLabel: product?.article || t('stockMovements.unknownProduct', { id: row.productId }),
          warehouseLabel: warehouse?.name || t('stockMovements.unknownWarehouse', { id: row.warehouseId }),
        };
      }),
    [snapshots, productsById, warehousesById, t],
  );

  const filteredRows = useMemo(() => {
    return enrichedSnapshots.filter((row) => {
      const matchesProduct =
        productFilter === 'all' || String(row.productId) === String(productFilter);
      const matchesWarehouse =
        warehouseFilter === 'all' || String(row.warehouseId) === String(warehouseFilter);

      const snapshotDate = row.snapshotDate ? new Date(row.snapshotDate) : null;
      let matchesDate = true;
      if (startDate && snapshotDate) {
        matchesDate = snapshotDate >= new Date(startDate);
      }
      if (endDate && snapshotDate && matchesDate) {
        matchesDate = snapshotDate <= new Date(`${endDate}T23:59:59`);
      }

      return matchesProduct && matchesWarehouse && matchesDate;
    });
  }, [enrichedSnapshots, productFilter, warehouseFilter, startDate, endDate]);

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    productFilter !== 'all' || warehouseFilter !== 'all' || !!startDate || !!endDate;

  const isLoading = loadingSnapshots || loadingProducts || loadingWarehouses;

  const columns = useMemo(
    () => [
      {
        accessorKey: 'snapshotDate',
        header: t('stockMovements.table.date'),
        cell: ({ row }) => {
          const date = row.original.snapshotDate;
          return (
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {date ? format(new Date(date), 'dd.MM.yyyy') : '—'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {date ? format(new Date(date), 'HH:mm') : ''}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'productLabel',
        header: t('stockMovements.table.product'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Package className="h-4 w-4 text-slate-500" />
            </div>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.productLabel}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'warehouseLabel',
        header: t('stockMovements.table.warehouse'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">{row.original.warehouseLabel}</span>
          </div>
        ),
      },
      {
        accessorKey: 'quantity',
        header: t('stockMovements.table.quantity'),
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {(row.original.quantity ?? 0).toLocaleString()} {t('common.units')}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('stockMovements.title')}
        description={t('stockMovements.description')}
      />

      <Card className="border-amber-200/80 dark:border-amber-500/25 dark:bg-slate-900">
        <CardContent className="flex items-start gap-3 pt-6 text-sm text-slate-600 dark:text-slate-400">
          <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{t('stockMovements.snapshotHint')}</p>
        </CardContent>
      </Card>

      <Card className="dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState />
          ) : (
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('stockMovements.filters.title')}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">{t('stockMovements.filters.product')}</label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('stockMovements.filters.allProducts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('stockMovements.filters.allProducts')}</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.productId} value={String(product.productId)}>
                        {product.article || `#${product.productId}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">{t('stockMovements.filters.warehouse')}</label>
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('stockMovements.filters.allWarehouses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('stockMovements.filters.allWarehouses')}</SelectItem>
                    {ownWarehouses.map((warehouse) => (
                      <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">{t('stockMovements.filters.fromDate')}</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">{t('stockMovements.filters.toDate')}</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
                  <X className="mr-1 h-4 w-4" />
                  {t('stockMovements.filters.clear')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <LoadingState />
          </CardContent>
        </Card>
      ) : filteredRows.length === 0 ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <EmptyState message={t('stockMovements.emptyMessage')} />
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRows}
          searchPlaceholder={t('stockMovements.searchPlaceholder')}
          emptyMessage={t('stockMovements.emptyMessage')}
          pageSize={25}
        />
      )}
    </div>
  );
}
