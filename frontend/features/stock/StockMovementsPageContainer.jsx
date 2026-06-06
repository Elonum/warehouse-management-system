import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { api } from '@/api';
import { useServerOffsetPagination } from '@/hooks/useServerOffsetPagination';
import { useServerSearchQuery } from '@/hooks/useServerSearchQuery';
import { useI18n } from '@/lib/i18n';
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
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/input';
import StockMovementsTable from '@/features/stock/components/StockMovementsTable';
import { STOCK_MOVEMENT_TYPES } from '@/features/stock/stockMovementConstants';

const MOVEMENT_TYPE_FILTERS = new Set(['all', ...STOCK_MOVEMENT_TYPES]);

function readFiltersFromSearchParams(searchParams) {
  const typeRaw = searchParams.get('movementType') || 'all';
  return {
    product: searchParams.get('product') || 'all',
    warehouse: searchParams.get('warehouse') || 'all',
    movementType: MOVEMENT_TYPE_FILTERS.has(typeRaw) ? typeRaw : 'all',
    q: (searchParams.get('q') || '').slice(0, 100),
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || '',
  };
}

export default function StockMovementsPageContainer() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => readFiltersFromSearchParams(searchParams), [searchParams]);

  const [productFilter, setProductFilter] = useState(initial.product);
  const [warehouseFilter, setWarehouseFilter] = useState(initial.warehouse);
  const [movementTypeFilter, setMovementTypeFilter] = useState(initial.movementType);
  const [q, setQ] = useState(initial.q);
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);

  const {
    limit,
    offset,
    resetPage,
    clampToTotal,
    toDataTableServerPagination,
  } = useServerOffsetPagination({ initialLimit: 25 });

  useLayoutEffect(() => {
    const f = readFiltersFromSearchParams(searchParams);
    setProductFilter(f.product);
    setWarehouseFilter(f.warehouse);
    setMovementTypeFilter(f.movementType);
    setQ(f.q);
    setFromDate(f.fromDate);
    setToDate(f.toDate);
    resetPage();
  }, [searchParams, resetPage]);

  const { forApi: qForApi, forUi: qForUi } = useServerSearchQuery(q, {
    onDebouncedChange: resetPage,
  });

  const {
    data: movementsPayload,
    isLoading: loadingMovements,
    isFetching: fetchingMovements,
  } = useQuery({
    queryKey: [
      'stock-movements',
      productFilter !== 'all' ? productFilter : null,
      warehouseFilter !== 'all' ? warehouseFilter : null,
      movementTypeFilter !== 'all' ? movementTypeFilter : null,
      qForApi || null,
      fromDate || null,
      toDate || null,
      limit,
      offset,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = { limit, offset, ownWarehousesOnly: 'true' };
      if (productFilter !== 'all') params.productId = productFilter;
      if (warehouseFilter !== 'all') params.warehouseId = warehouseFilter;
      if (movementTypeFilter !== 'all') params.movementType = movementTypeFilter;
      if (qForApi) params.q = qForApi;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      return api.stock.listMovements(params);
    },
  });

  const rows = movementsPayload?.items ?? [];
  const summary = movementsPayload?.summary ?? { totalRows: 0, totalIn: 0, totalOut: 0 };
  const serverTotal = movementsPayload?.meta?.total ?? 0;
  const netChange = summary.totalIn - summary.totalOut;

  useEffect(() => {
    if (fetchingMovements) return;
    clampToTotal(serverTotal);
  }, [serverTotal, clampToTotal, fetchingMovements]);

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
  const ownWarehouses = useMemo(
    () => warehouses.filter((w) => !w?.isMarketplace),
    [warehouses],
  );

  const productFilterLabel = useMemo(() => {
    if (productFilter === 'all') return t('stockMovements.filters.allProducts');
    const product = products.find((p) => String(p.productId) === productFilter);
    return product?.article || t('stockMovements.unknownProduct', { id: productFilter });
  }, [productFilter, products, t]);

  const warehouseFilterLabel = useMemo(() => {
    if (warehouseFilter === 'all') return t('stockMovements.filters.allWarehouses');
    const warehouse = ownWarehouses.find((w) => String(w.warehouseId) === warehouseFilter);
    return warehouse?.name || t('stockMovements.unknownWarehouse', { id: warehouseFilter });
  }, [warehouseFilter, ownWarehouses, t]);

  const movementTypeFilterLabel = useMemo(() => {
    if (movementTypeFilter === 'all') return t('stockMovements.filters.allTypes');
    return t(`stockMovements.types.${movementTypeFilter}`);
  }, [movementTypeFilter, t]);

  const isLoadingFilterOptions =
    (loadingProducts && products.length === 0) || (loadingWarehouses && warehouses.length === 0);
  const isLoadingStats = isLoadingFilterOptions || (!movementsPayload && loadingMovements);
  const showTableLoading = loadingMovements && rows.length === 0;
  const isRefreshingList = fetchingMovements && rows.length > 0;

  const serverPagination = useMemo(
    () =>
      toDataTableServerPagination({
        totalRows: serverTotal,
        pageRowCount: rows.length,
        isLoading: fetchingMovements,
        ariaLabel: t('stockMovements.paginationNav'),
      }),
    [toDataTableServerPagination, serverTotal, rows.length, fetchingMovements, t],
  );

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
    setMovementTypeFilter('all');
    setQ('');
    setFromDate('');
    setToDate('');
    resetPage();
  };

  const hasActiveFilters =
    productFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    movementTypeFilter !== 'all' ||
    !!qForUi ||
    !!fromDate ||
    !!toDate;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('stockMovements.title')}
        description={t('stockMovements.description')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoadingStats ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="pt-6">
                  <LoadingState />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockMovements.stats.total')}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {summary.totalRows.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockMovements.stats.incoming')}
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  +{summary.totalIn.toLocaleString()} {t('common.units')}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockMovements.stats.outgoing')}
                </p>
                <p className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                  −{summary.totalOut.toLocaleString()} {t('common.units')}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockMovements.stats.net')}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    netChange > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : netChange < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {netChange > 0 ? '+' : ''}
                  {netChange.toLocaleString()} {t('common.units')}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="pt-6">
          {isLoadingFilterOptions ? (
            <LoadingState />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('stockMovements.filters.title')}
                </span>
              </div>

              <div className="relative w-72">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('stockMovements.searchPlaceholder')}
                  aria-label={t('stockMovements.searchPlaceholder')}
                  className="pr-10"
                />
                {q && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
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
                <SelectTrigger className="w-48" aria-label={t('stockMovements.filters.product')}>
                  <SelectValue>{productFilterLabel}</SelectValue>
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

              <Select
                value={warehouseFilter}
                onValueChange={(v) => {
                  setWarehouseFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-48" aria-label={t('stockMovements.filters.warehouse')}>
                  <SelectValue>{warehouseFilterLabel}</SelectValue>
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

              <Select
                value={movementTypeFilter}
                onValueChange={(v) => {
                  setMovementTypeFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-56" aria-label={t('stockMovements.filters.type')}>
                  <SelectValue>{movementTypeFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('stockMovements.filters.allTypes')}</SelectItem>
                  {STOCK_MOVEMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`stockMovements.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('stockMovements.filters.fromDate')}
                </span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    resetPage();
                  }}
                  aria-label={t('stockMovements.filters.fromDate')}
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('stockMovements.filters.toDate')}
                </span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    resetPage();
                  }}
                  aria-label={t('stockMovements.filters.toDate')}
                  className="w-40"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  {t('stockMovements.filters.clear')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showTableLoading ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <LoadingState />
          </CardContent>
        </Card>
      ) : rows.length === 0 && !fetchingMovements ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <EmptyState message={t('stockMovements.emptyMessage')} />
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900${
            isRefreshingList ? ' opacity-80 transition-opacity duration-150' : ''
          }`}
          aria-busy={isRefreshingList || undefined}
        >
          <StockMovementsTable
            t={t}
            rows={rows}
            isLoading={showTableLoading}
            serverPagination={serverPagination}
            showWarehouseColumn={warehouseFilter === 'all'}
          />
        </Card>
      )}
    </div>
  );
}
