import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, X, ArrowLeftRight, Layers } from 'lucide-react';
import { api } from '@/api';
import { useServerOffsetPagination } from '@/hooks/useServerOffsetPagination';
import { useI18n } from '@/lib/i18n';
import { createPageUrl } from '@/utils';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import StockSnapshotsTable from '@/features/stock/components/StockSnapshotsTable';

const VIEW_MODES = new Set(['journal', 'latest']);

function readFiltersFromSearchParams(searchParams) {
  const viewRaw = searchParams.get('view') || 'journal';
  return {
    product: searchParams.get('product') || 'all',
    warehouse: searchParams.get('warehouse') || 'all',
    view: VIEW_MODES.has(viewRaw) ? viewRaw : 'journal',
    q: (searchParams.get('q') || '').slice(0, 100),
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || '',
  };
}

export default function StockSnapshotsPageContainer() {
  const { t, formatDate } = useI18n();
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => readFiltersFromSearchParams(searchParams), [searchParams]);

  const [productFilter, setProductFilter] = useState(initial.product);
  const [warehouseFilter, setWarehouseFilter] = useState(initial.warehouse);
  const [viewMode, setViewMode] = useState(initial.view);
  const [q, setQ] = useState(initial.q);
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);
  const [detailRow, setDetailRow] = useState(null);

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
    setViewMode(f.view);
    setQ(f.q);
    setFromDate(f.fromDate);
    setToDate(f.toDate);
    resetPage();
  }, [searchParams, resetPage]);

  const qNormalized = useMemo(() => q.trim().slice(0, 100), [q]);

  const {
    data: snapshotsPayload,
    isLoading: loadingSnapshots,
    isFetching: fetchingSnapshots,
  } = useQuery({
    queryKey: [
      'stock-snapshots',
      productFilter !== 'all' ? productFilter : null,
      warehouseFilter !== 'all' ? warehouseFilter : null,
      viewMode,
      qNormalized || null,
      fromDate || null,
      toDate || null,
      limit,
      offset,
    ],
    queryFn: async () => {
      const params = {
        limit,
        offset,
        view: viewMode,
        ownWarehousesOnly: 'true',
      };
      if (productFilter !== 'all') params.productId = productFilter;
      if (warehouseFilter !== 'all') params.warehouseId = warehouseFilter;
      if (qNormalized) params.q = qNormalized;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      return api.stockSnapshots.list(params);
    },
  });

  const rows = snapshotsPayload?.items ?? [];
  const summary = snapshotsPayload?.summary ?? {
    totalRows: 0,
    uniquePairs: 0,
    earliestDate: null,
    latestDate: null,
  };
  const serverTotal = snapshotsPayload?.meta?.total ?? 0;

  useEffect(() => {
    if (fetchingSnapshots) return;
    clampToTotal(serverTotal);
  }, [serverTotal, clampToTotal, fetchingSnapshots]);

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
    if (productFilter === 'all') return t('stockSnapshots.filters.allProducts');
    const product = products.find((p) => String(p.productId) === String(productFilter));
    return product?.article || t('stockSnapshots.unknownProduct', { id: productFilter });
  }, [productFilter, products, t]);

  const warehouseFilterLabel = useMemo(() => {
    if (warehouseFilter === 'all') return t('stockSnapshots.filters.allWarehouses');
    const warehouse = ownWarehouses.find((w) => String(w.warehouseId) === String(warehouseFilter));
    return warehouse?.name || t('stockSnapshots.unknownWarehouse', { id: warehouseFilter });
  }, [warehouseFilter, ownWarehouses, t]);

  const viewModeLabel =
    viewMode === 'latest'
      ? t('stockSnapshots.viewLatest')
      : t('stockSnapshots.viewJournal');

  const serverPagination = toDataTableServerPagination({
    total: serverTotal,
    ariaLabel: t('stockSnapshots.paginationNav'),
  });

  const isLoadingAny = loadingSnapshots || loadingProducts || loadingWarehouses;

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
    setViewMode('journal');
    setQ('');
    setFromDate('');
    setToDate('');
    resetPage();
  };

  const hasActiveFilters =
    productFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    viewMode !== 'journal' ||
    !!qNormalized ||
    !!fromDate ||
    !!toDate;

  const detailDateParam = detailRow?.snapshotDate
    ? String(detailRow.snapshotDate).slice(0, 10)
    : '';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('stockSnapshots.title')}
        description={t('stockSnapshots.description')}
        titleHint={t('stockSnapshots.titleHint')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoadingAny && !snapshotsPayload ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <LoadingState />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockSnapshots.stats.total')}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {summary.totalRows.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockSnapshots.stats.pairs')}
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.uniquePairs.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockSnapshots.stats.dateFrom')}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(summary.earliestDate)}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stockSnapshots.stats.dateTo')}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(summary.latestDate)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="pt-6">
          {loadingProducts || loadingWarehouses ? (
            <LoadingState />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('stockSnapshots.filters.title')}
                </span>
              </div>

              <div className="relative w-72">
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    resetPage();
                  }}
                  placeholder={t('stockSnapshots.searchPlaceholder')}
                  aria-label={t('stockSnapshots.searchPlaceholder')}
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
                value={viewMode}
                onValueChange={(v) => {
                  setViewMode(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-52" aria-label={t('stockSnapshots.filters.view')}>
                  <SelectValue>{viewModeLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="journal">{t('stockSnapshots.viewJournal')}</SelectItem>
                  <SelectItem value="latest">{t('stockSnapshots.viewLatest')}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={productFilter}
                onValueChange={(v) => {
                  setProductFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-48" aria-label={t('stockSnapshots.filters.product')}>
                  <SelectValue>{productFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('stockSnapshots.filters.allProducts')}</SelectItem>
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
                <SelectTrigger className="w-48" aria-label={t('stockSnapshots.filters.warehouse')}>
                  <SelectValue>{warehouseFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('stockSnapshots.filters.allWarehouses')}</SelectItem>
                  {ownWarehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('stockSnapshots.filters.fromDate')}
                </span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    resetPage();
                  }}
                  aria-label={t('stockSnapshots.filters.fromDate')}
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('stockSnapshots.filters.toDate')}
                </span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    resetPage();
                  }}
                  aria-label={t('stockSnapshots.filters.toDate')}
                  className="w-40"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  {t('stockSnapshots.filters.clear')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoadingAny && rows.length === 0 ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <LoadingState />
          </CardContent>
        </Card>
      ) : rows.length === 0 && !loadingSnapshots ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <EmptyState message={t('stockSnapshots.emptyMessage')} />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900">
          <StockSnapshotsTable
            t={t}
            formatDate={formatDate}
            rows={rows}
            isLoading={loadingSnapshots}
            serverPagination={serverPagination}
            showWarehouseColumn={warehouseFilter === 'all'}
            onOpenDetail={setDetailRow}
          />
        </Card>
      )}

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('stockSnapshots.detail.title')}</DialogTitle>
          </DialogHeader>
          {detailRow ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {Number(detailRow.quantity ?? 0).toLocaleString()}
                </span>
                <span className="text-slate-500">{t('common.units')}</span>
              </div>
              <div className="grid gap-3">
                <div>
                  <Label className="text-slate-500">{t('stockSnapshots.table.date')}</Label>
                  <p className="font-medium">
                    {formatDate(detailRow.snapshotDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('stockSnapshots.table.product')}</Label>
                  <p className="font-medium">
                    {detailRow.productArticle ||
                      t('stockSnapshots.unknownProduct', { id: detailRow.productId })}
                  </p>
                  {detailRow.productBarcode ? (
                    <p className="text-slate-500">{detailRow.productBarcode}</p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-slate-500">{t('stockSnapshots.table.warehouse')}</Label>
                  <p className="font-medium">
                    {detailRow.warehouseName ||
                      t('stockSnapshots.unknownWarehouse', { id: detailRow.warehouseId })}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('stockSnapshots.detail.snapshotId')}</Label>
                  <p className="break-all font-mono text-xs text-slate-600 dark:text-slate-400">
                    {detailRow.snapshotId}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to={`${createPageUrl('StockMovements')}?product=${detailRow.productId}&warehouse=${detailRow.warehouseId}${detailDateParam ? `&fromDate=${detailDateParam}` : ''}`}
                  >
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    {t('stockSnapshots.detail.openMovements')}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to={`${createPageUrl('Stock')}?product=${detailRow.productId}&warehouse=${detailRow.warehouseId}`}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    {t('stockSnapshots.detail.openStock')}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
