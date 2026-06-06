import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Plus, X } from 'lucide-react';
import { api } from '@/api';
import { useServerOffsetPagination } from '@/hooks/useServerOffsetPagination';
import { useServerSearchQuery } from '@/hooks/useServerSearchQuery';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ProductCostsTable from '@/features/productCosts/components/ProductCostsTable';
import ProductMissingCostTable from '@/features/productCosts/components/ProductMissingCostTable';
import ProductCostFormDialog from '@/features/productCosts/components/ProductCostFormDialog';
import { messageForProductCostError } from '@/features/productCosts/productCostErrors';

const VIEW_MODES = new Set(['journal', 'active']);

const emptyForm = {
  productId: null,
  periodStart: null,
  periodEnd: null,
  unitCostToWarehouse: '',
  notes: null,
  closePrevious: true,
};

function readFiltersFromSearchParams(searchParams) {
  const viewRaw = searchParams.get('view') || 'journal';
  return {
    product: searchParams.get('product') || 'all',
    view: VIEW_MODES.has(viewRaw) ? viewRaw : 'journal',
    q: (searchParams.get('q') || '').slice(0, 100),
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || '',
  };
}

function toDateISO(dateStr) {
  if (!dateStr) return null;
  return `${dateStr}T00:00:00.000Z`;
}

function toInputDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

export default function ProductCostsPageContainer() {
  const { t, formatDate } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => readFiltersFromSearchParams(searchParams), [searchParams]);

  const [productFilter, setProductFilter] = useState(initial.product);
  const [viewMode, setViewMode] = useState(initial.view);
  const [q, setQ] = useState(initial.q);
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');

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
    setViewMode(f.view);
    setQ(f.q);
    setFromDate(f.fromDate);
    setToDate(f.toDate);
    resetPage();
  }, [searchParams, resetPage]);

  const { forApi: qForApi, forUi: qForUi } = useServerSearchQuery(q, {
    onDebouncedChange: resetPage,
  });
  const isMissingTab = searchParams.get('tab') === 'missing';

  const {
    data: costsPayload,
    isLoading: loadingCosts,
    isFetching: fetchingCosts,
  } = useQuery({
    queryKey: [
      'product-costs',
      productFilter !== 'all' ? productFilter : null,
      viewMode,
      qForApi || null,
      fromDate || null,
      toDate || null,
      limit,
      offset,
    ],
    enabled: !isMissingTab,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = { limit, offset, view: viewMode };
      if (productFilter !== 'all') params.productId = productFilter;
      if (qForApi) params.q = qForApi;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      return api.productCosts.list(params);
    },
  });

  const {
    data: missingPayload,
    isLoading: loadingMissing,
    isFetching: fetchingMissing,
  } = useQuery({
    queryKey: ['product-costs-missing', qForApi || null, limit, offset],
    enabled: isMissingTab,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = { limit, offset };
      if (qForApi) params.q = qForApi;
      return api.productCosts.missing(params);
    },
  });

  const {
    data: qualityPayload,
    isLoading: loadingQuality,
  } = useQuery({
    queryKey: ['product-costs-data-quality'],
    enabled: !isMissingTab,
    queryFn: async () => api.productCosts.dataQuality(),
  });

  const costsRows = costsPayload?.items ?? [];
  const missingRows = missingPayload?.items ?? [];
  const rows = isMissingTab ? missingRows : costsRows;
  const summary = costsPayload?.summary ?? { totalRows: 0, activeRows: 0, productRows: 0 };
  const serverTotal = (isMissingTab ? missingPayload?.meta?.total : costsPayload?.meta?.total) ?? 0;

  useEffect(() => {
    if (isMissingTab ? fetchingMissing : fetchingCosts) return;
    clampToTotal(serverTotal);
  }, [serverTotal, clampToTotal, fetchingCosts, fetchingMissing, isMissingTab]);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    enabled: !isMissingTab,
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const products = Array.isArray(productsData) ? productsData : [];

  const getProductLabel = (productOrId) => {
    const product =
      typeof productOrId === 'object' && productOrId
        ? productOrId
        : products.find((p) => String(p.productId) === String(productOrId));
    if (!product) {
      return typeof productOrId === 'string'
        ? t('productCosts.unknownProduct', { id: productOrId })
        : t('productCosts.unknownProduct', { id: '—' });
    }
    return product.article || `#${product.productId}`;
  };

  const productFilterLabel = useMemo(() => {
    if (productFilter === 'all') return t('productCosts.filters.allProducts');
    return getProductLabel(productFilter);
  }, [productFilter, products, t]);

  const viewModeLabel =
    viewMode === 'active' ? t('productCosts.viewActive') : t('productCosts.viewJournal');

  const periodsLink = useMemo(() => {
    const params = new URLSearchParams();
    params.set('view', viewMode);
    if (productFilter !== 'all') params.set('product', productFilter);
    if (qForApi) params.set('q', qForApi);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const qs = params.toString();
    return qs ? `${createPageUrl('ProductCosts')}?${qs}` : createPageUrl('ProductCosts');
  }, [createPageUrl, viewMode, productFilter, qForApi, fromDate, toDate]);

  const missingLink = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tab', 'missing');
    if (qForApi) params.set('q', qForApi);
    const qs = params.toString();
    return qs ? `${createPageUrl('ProductCosts')}?${qs}` : createPageUrl('ProductCosts');
  }, [createPageUrl, qForApi]);

  const serverPagination = useMemo(
    () =>
      toDataTableServerPagination({
        totalRows: serverTotal,
        pageRowCount: rows.length,
        isLoading: isMissingTab ? fetchingMissing : fetchingCosts,
        ariaLabel: t('productCosts.paginationNav'),
      }),
    [
      toDataTableServerPagination,
      serverTotal,
      rows.length,
      isMissingTab,
      fetchingMissing,
      fetchingCosts,
      t,
    ],
  );

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      productId: productFilter !== 'all' ? productFilter : null,
    });
    setCurrentRow(null);
    setFormError('');
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.productCosts.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-costs'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => {
      setFormError(messageForProductCostError(err, t, 'productCosts.errors.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.productCosts.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-costs'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err) => {
      setFormError(messageForProductCostError(err, t, 'productCosts.errors.updateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.productCosts.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-costs'] });
      setDeleteDialogOpen(false);
      setCurrentRow(null);
    },
    onError: (err) => {
      setFormError(messageForProductCostError(err, t, 'productCosts.errors.deleteFailed'));
      setDeleteDialogOpen(false);
    },
  });

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (row) => {
    setCurrentRow(row);
    setFormData({
      productId: row.productId,
      periodStart: toInputDate(row.periodStart),
      periodEnd: toInputDate(row.periodEnd),
      unitCostToWarehouse: row.unitCostToWarehouse?.toString() ?? '',
      notes: row.notes || null,
      closePrevious: true,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    productId: formData.productId,
    periodStart: toDateISO(formData.periodStart),
    periodEnd: toDateISO(formData.periodEnd),
    unitCostToWarehouse: parseFloat(formData.unitCostToWarehouse) || 0,
    notes: formData.notes?.trim() || null,
    ...(currentRow ? {} : { closePrevious: formData.closePrevious !== false }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.productId || !formData.periodStart) {
      setFormError(t('productCosts.errors.createFailed'));
      return;
    }
    const payload = buildPayload();
    if (currentRow) {
      updateMutation.mutate({ id: currentRow.costId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const clearFilters = () => {
    setProductFilter('all');
    setViewMode('journal');
    setQ('');
    setFromDate('');
    setToDate('');
    resetPage();
  };

  const hasActiveFilters = isMissingTab
    ? !!qForUi
    : productFilter !== 'all' ||
      viewMode !== 'journal' ||
      !!qForUi ||
      !!fromDate ||
      !!toDate;

  const isLoadingFilterOptions = !isMissingTab && loadingProducts && products.length === 0;
  const isLoadingStats = isMissingTab
    ? !missingPayload && loadingMissing
    : isLoadingFilterOptions || (!costsPayload && (loadingCosts || loadingProducts));
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const showTableLoading = isMissingTab
    ? loadingMissing && missingRows.length === 0
    : loadingCosts && rows.length === 0;
  const isRefreshingList = isMissingTab
    ? fetchingMissing && missingRows.length > 0
    : fetchingCosts && rows.length > 0;

  const renderSearchBox = () => (
    <div className="relative w-72">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('productCosts.searchPlaceholder')}
        aria-label={t('productCosts.searchPlaceholder')}
        className="pr-10"
      />
      {q ? (
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
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={isMissingTab ? t('productCosts.missing.title') : t('productCosts.title')}
        description={isMissingTab ? t('productCosts.missing.description') : t('productCosts.description')}
        titleHint={!isMissingTab ? t('productCosts.titleHint') : undefined}
      >
        {isMissingTab ? (
          <Button variant="outline" asChild>
            <Link to={periodsLink}>{t('productCosts.missing.backToPeriods')}</Link>
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={missingLink}>{t('productCosts.missing.openReport')}</Link>
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('productCosts.addPeriod')}
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isMissingTab ? (
          isLoadingStats ? (
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <LoadingState />
              </CardContent>
            </Card>
          ) : (
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('productCosts.missing.stats.total')}</p>
                <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {serverTotal.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )
        ) : isLoadingStats ? (
          [1, 2, 3].map((i) => (
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
                  {t('productCosts.stats.total')}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {summary.totalRows.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('productCosts.stats.active')}
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {summary.activeRows.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('productCosts.stats.products')}
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.productRows.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {!isMissingTab && !loadingQuality && (qualityPayload?.overlapPairCount ?? 0) > 0 ? (
        <Card className="dark:border-amber-500/40 dark:bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('productCosts.quality.overlapPairs', { count: qualityPayload.overlapPairCount })}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="pt-6">
          {isMissingTab ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('productCosts.filters.title')}
                </span>
              </div>
              {renderSearchBox()}

              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  {t('productCosts.filters.clear')}
                </Button>
              ) : null}
            </div>
          ) : isLoadingFilterOptions ? (
            <LoadingState />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('productCosts.filters.title')}
                </span>
              </div>

              {renderSearchBox()}

              <Select
                value={viewMode}
                onValueChange={(v) => {
                  setViewMode(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-48" aria-label={t('productCosts.filters.view')}>
                  <SelectValue>{viewModeLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="journal">{t('productCosts.viewJournal')}</SelectItem>
                  <SelectItem value="active">{t('productCosts.viewActive')}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={productFilter}
                onValueChange={(v) => {
                  setProductFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-48" aria-label={t('productCosts.filters.product')}>
                  <SelectValue>{productFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('productCosts.filters.allProducts')}</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.productId} value={String(product.productId)}>
                      {getProductLabel(product)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('productCosts.filters.fromDate')}
                </span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    resetPage();
                  }}
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('productCosts.filters.toDate')}
                </span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    resetPage();
                  }}
                  className="w-40"
                />
              </div>

              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  {t('productCosts.filters.clear')}
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {isMissingTab ? (
        showTableLoading ? (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="pt-6">
              <LoadingState />
            </CardContent>
          </Card>
        ) : missingRows.length === 0 && !fetchingMissing ? (
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="pt-6">
              <EmptyState message={t('productCosts.missing.emptyMessage')} />
            </CardContent>
          </Card>
        ) : (
          <Card
            className={`overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900${
              isRefreshingList ? ' opacity-80 transition-opacity duration-150' : ''
            }`}
            aria-busy={isRefreshingList || undefined}
          >
            <ProductMissingCostTable
              t={t}
              rows={missingRows}
              isLoading={showTableLoading}
              serverPagination={serverPagination}
            />
          </Card>
        )
      ) : showTableLoading ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <LoadingState />
          </CardContent>
        </Card>
      ) : rows.length === 0 && !fetchingCosts ? (
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
            <EmptyState message={t('productCosts.emptyMessage')} />
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900${
            isRefreshingList ? ' opacity-80 transition-opacity duration-150' : ''
          }`}
          aria-busy={isRefreshingList || undefined}
        >
          <ProductCostsTable
            t={t}
            formatDate={formatDate}
            rows={rows}
            isLoading={showTableLoading}
            serverPagination={serverPagination}
            onEdit={handleEdit}
            onDelete={(row) => {
              setCurrentRow(row);
              setDeleteDialogOpen(true);
            }}
          />
        </Card>
      )}

      {!isMissingTab ? (
        <>
          <ProductCostFormDialog
            t={t}
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
            isEdit={!!currentRow}
            formData={formData}
            onChangeField={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
            products={products}
            getProductLabel={getProductLabel}
            error={formError}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              resetForm();
            }}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('productCosts.deleteConfirm.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('productCosts.deleteConfirm.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setCurrentRow(null);
                  }}
                >
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentRow) {
                      deleteMutation.mutate(currentRow.costId);
                    }
                  }}
                >
                  {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}
