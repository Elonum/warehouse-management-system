import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api';
import { useServerOffsetPagination } from '@/hooks/useServerOffsetPagination';
import { useI18n } from '@/lib/i18n';
import { Filter, X } from 'lucide-react';
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
import StockTable from '@/features/stock/components/StockTable';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/input';

const LEVEL_FILTERS = new Set(['all', 'positive', 'zero', 'below_reorder']);

function readFiltersFromSearchParams(searchParams) {
  const levelRaw = searchParams.get('levelFilter') || 'all';
  return {
    product: searchParams.get('product') || 'all',
    warehouse: searchParams.get('warehouse') || 'all',
    q: (searchParams.get('q') || '').slice(0, 100),
    levelFilter: LEVEL_FILTERS.has(levelRaw) ? levelRaw : 'all',
  };
}

function StockPageContainer() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const initial = useMemo(() => readFiltersFromSearchParams(searchParams), [searchParams]);

  const [productFilter, setProductFilter] = useState(initial.product);
  const [warehouseFilter, setWarehouseFilter] = useState(initial.warehouse);
  const [q, setQ] = useState(initial.q);
  const [levelFilter, setLevelFilter] = useState(initial.levelFilter);

  const {
    limit,
    offset,
    resetPage,
    clampToTotal,
    toDataTableServerPagination,
  } = useServerOffsetPagination();

  useLayoutEffect(() => {
    const f = readFiltersFromSearchParams(searchParams);
    setProductFilter(f.product);
    setWarehouseFilter(f.warehouse);
    setQ(f.q);
    setLevelFilter(f.levelFilter);
    resetPage();
  }, [searchParams, resetPage]);

  const qNormalized = useMemo(() => q.trim().slice(0, 100), [q]);

  const selectedLevelLabel = useMemo(() => {
    switch (levelFilter) {
      case 'positive':
        return t('stock.filters.levelPositive');
      case 'zero':
        return t('stock.filters.levelZero');
      case 'below_reorder':
        return t('stock.filters.levelBelowReorder');
      default:
        return t('stock.filters.allLevels');
    }
  }, [levelFilter, t]);

  const {
    data: stockPayload,
    isLoading: loadingStock,
    isFetching: fetchingStock,
  } = useQuery({
    queryKey: [
      'stock',
      warehouseFilter !== 'all' ? warehouseFilter : null,
      productFilter !== 'all' ? productFilter : null,
      qNormalized || null,
      levelFilter,
      limit,
      offset,
    ],
    queryFn: async () => {
      const params = { limit, offset };
      if (warehouseFilter !== 'all') {
        params.warehouseId = warehouseFilter;
      }
      if (productFilter !== 'all') {
        params.productId = productFilter;
      }
      if (qNormalized) {
        params.q = qNormalized;
      }
      if (levelFilter && levelFilter !== 'all') {
        params.levelFilter = levelFilter;
      }
      const { items, meta } = await api.stock.getCurrent(params);
      return { items, total: meta.total };
    },
  });

  const stock = stockPayload?.items ?? [];
  const totalRows = stockPayload?.total ?? 0;

  useEffect(() => {
    if (fetchingStock) return;
    clampToTotal(totalRows);
  }, [totalRows, clampToTotal, fetchingStock]);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehousesData, isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.warehouses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

  const selectedProductLabel = useMemo(() => {
    if (productFilter === 'all') return t('stock.filters.allProducts');
    const product = products.find((p) => String(p.productId) === String(productFilter));
    if (!product) return t('stock.filters.product');
    return product.article || t('stock.selectArticleFallback', { id: product.productId });
  }, [productFilter, products, t]);

  const warehouseTriggerLabel = useMemo(() => {
    if (warehouseFilter === 'all') return t('stock.filters.allWarehouses');
    const warehouse = warehouses.find((w) => String(w.warehouseId) === String(warehouseFilter));
    return warehouse?.name || t('stock.filters.warehouse');
  }, [warehouseFilter, warehouses, t]);

  const isLoadingAny = loadingStock || loadingProducts || loadingWarehouses;

  const productsMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.productId, p));
    return map;
  }, [products]);

  const warehousesMap = useMemo(() => {
    const map = new Map();
    warehouses.forEach((w) => map.set(w.warehouseId, w));
    return map;
  }, [warehouses]);

  const selectedWarehouse = useMemo(() => {
    if (warehouseFilter === 'all') return null;
    return (
      warehouses.find((w) => String(w.warehouseId) === String(warehouseFilter)) || null
    );
  }, [warehouseFilter, warehouses]);

  const enrichedStock = useMemo(
    () =>
      stock.map((item) => {
        const product = productsMap.get(item.productId);
        const warehouse = warehousesMap.get(item.warehouseId);
        return {
          ...item,
          productName:
            product?.article || t('stock.unknownProduct', { id: item.productId }),
          productBarcode: product?.barcode ?? null,
          warehouseName:
            warehouse?.name || t('stock.unknownWarehouse', { id: item.warehouseId }),
        };
      }),
    [stock, productsMap, warehousesMap, t],
  );

  const serverPagination = useMemo(
    () =>
      toDataTableServerPagination({
        totalRows,
        pageRowCount: enrichedStock.length,
        isLoading: loadingStock,
        ariaLabel: t('stock.paginationNav'),
      }),
    [
      toDataTableServerPagination,
      totalRows,
      enrichedStock.length,
      loadingStock,
      t,
    ],
  );

  const totals = useMemo(
    () =>
      enrichedStock.reduce(
        (acc, item) => ({
          quantity: acc.quantity + (item.currentQuantity || 0),
          positions: acc.positions + (item.currentQuantity > 0 ? 1 : 0),
        }),
        { quantity: 0, positions: 0 },
      ),
    [enrichedStock],
  );

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
    setQ('');
    setLevelFilter('all');
    resetPage();
  };

  const hasActiveFilters =
    productFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    levelFilter !== 'all' ||
    !!qNormalized;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          selectedWarehouse
            ? `${t('stock.title')} - ${selectedWarehouse.name}`
            : t('stock.title')
        }
        description={
          selectedWarehouse
            ? t('stock.descriptionWarehouse', { warehouse: selectedWarehouse.name })
            : t('stock.description')
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isLoadingAny ? (
          <>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <LoadingState />
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <LoadingState />
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <LoadingState />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stock.stats.totalProducts')}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {totals.quantity.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stock.stats.positions')}
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {totals.positions}
                </p>
              </CardContent>
            </Card>
            {selectedWarehouse && (
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('stock.stats.warehouse')}
                  </p>
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
          </>
        )}
      </div>

      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="pt-6">
          {isLoadingAny ? (
            <LoadingState />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('stock.filters.title')}
                </span>
              </div>
              <div className="relative w-72">
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    resetPage();
                  }}
                  placeholder={t('stock.searchPlaceholder')}
                  className="pr-10"
                />
                {q && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => {
                      setQ('');
                      resetPage();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Select
                value={productFilter}
                onValueChange={(v) => {
                  setProductFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>{selectedProductLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('stock.filters.allProducts')}</SelectItem>
                  {products.map((product) => (
                    <SelectItem
                      key={product.productId}
                      value={String(product.productId)}
                    >
                      {product.article ||
                        t('stock.selectArticleFallback', { id: product.productId })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={warehouseFilter}
                onValueChange={(v) => {
                  setWarehouseFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>{warehouseTriggerLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('stock.filters.allWarehouses')}
                  </SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem
                      key={warehouse.warehouseId}
                      value={warehouse.warehouseId.toString()}
                    >
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={levelFilter}
                onValueChange={(v) => {
                  setLevelFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-56 min-w-[12rem]">
                  <SelectValue>{selectedLevelLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('stock.filters.allLevels')}</SelectItem>
                  <SelectItem value="positive">{t('stock.filters.levelPositive')}</SelectItem>
                  <SelectItem value="zero">{t('stock.filters.levelZero')}</SelectItem>
                  <SelectItem value="below_reorder">
                    {t('stock.filters.levelBelowReorder')}
                  </SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  {t('stock.filters.clear')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoadingAny ? (
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <LoadingState />
          </CardContent>
        </Card>
      ) : enrichedStock.length === 0 ? (
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <EmptyState message={t('stock.emptyMessage')} />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900">
          <StockTable
            t={t}
            stock={enrichedStock}
            warehouseFilter={warehouseFilter}
            isLoading={loadingStock}
            serverPagination={serverPagination}
          />
        </Card>
      )}
    </div>
  );
}

export default StockPageContainer;
