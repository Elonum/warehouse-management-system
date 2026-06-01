import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '@/api';
import { useServerOffsetPagination } from '@/hooks/useServerOffsetPagination';
import { useI18n } from '@/lib/i18n';
import { Filter, X, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import StockTable from '@/features/stock/components/StockTable';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/input';
import { fetchMarketplaceStock } from '@/features/stock/marketplaceStockAdapter';
import { summarizeStockRows } from '@/features/stock/stockMetrics';

const LEVEL_FILTERS = new Set(['all', 'positive', 'zero', 'below_reorder']);
const STOCK_SOURCES = new Set(['our', 'wildberries', 'ozon']);

function messageForMarketplaceStockError(err, t) {
  if (err instanceof ApiError) {
    if (err.code === 'WB_STATISTICS_TOKEN_MISSING' || err.code === 'OZON_CREDENTIALS_MISSING') {
      return t('stock.marketplaceConfigNeeded');
    }
    if (err.code === 'WB_STOCKS_LIST_FAILED' || err.code === 'OZON_STOCKS_LIST_FAILED') {
      return t('stock.marketplaceUpstreamError');
    }
    if (err.code === 'NETWORK_ERROR') {
      return t('stock.marketplaceLoadError');
    }
  }
  return t('stock.marketplaceLoadError');
}

function readFiltersFromSearchParams(searchParams) {
  const levelRaw = searchParams.get('levelFilter') || 'all';
  const sourceRaw = searchParams.get('source') || 'our';
  return {
    source: STOCK_SOURCES.has(sourceRaw) ? sourceRaw : 'our',
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

  const [stockSource, setStockSource] = useState(initial.source);
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
    setStockSource(f.source);
    setProductFilter(f.product);
    setWarehouseFilter(f.warehouse);
    setQ(f.q);
    setLevelFilter(f.levelFilter);
    resetPage();
  }, [searchParams, resetPage]);

  const qNormalized = useMemo(() => q.trim().slice(0, 100), [q]);
  const isOwnStockMode = stockSource === 'our';
  const isMarketplaceMode = !isOwnStockMode;

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
    data: ownStockPayload,
    isLoading: loadingOwnStock,
    isFetching: fetchingOwnStock,
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
    enabled: isOwnStockMode,
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

  const {
    data: marketplaceStockPayload,
    isLoading: loadingMarketplaceStock,
    isFetching: fetchingMarketplaceStock,
    isError: marketplaceStockQueryError,
    error: marketplaceStockErrorObj,
  } = useQuery({
    queryKey: ['stock-marketplace', stockSource],
    enabled: isMarketplaceMode,
    queryFn: async () => {
      const data = await fetchMarketplaceStock({ source: stockSource });
      return data;
    },
  });

  const stock = isOwnStockMode
    ? ownStockPayload?.items ?? []
    : marketplaceStockPayload?.items ?? [];
  const ownStockServerTotal = ownStockPayload?.total ?? 0;
  const loadingStock = isOwnStockMode ? loadingOwnStock : loadingMarketplaceStock;
  const fetchingStock = isOwnStockMode ? fetchingOwnStock : fetchingMarketplaceStock;

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    enabled: isOwnStockMode,
    queryFn: async () => {
      const response = await api.products.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehousesData, isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    enabled: isOwnStockMode,
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

  const mpListingOptions = useMemo(() => {
    if (!isMarketplaceMode) return [];
    const seen = new Map();
    for (const row of stock) {
      const sku = String(row.productId);
      const article = (row.listingArticle || row.productName || '').trim();
      const label = article && article !== `#${sku}` ? `${article} (${sku})` : sku;
      if (!seen.has(sku)) {
        seen.set(sku, label);
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, 'ru'),
    );
  }, [stock, isMarketplaceMode]);

  const selectedProductLabel = useMemo(() => {
    if (productFilter === 'all') {
      return isMarketplaceMode ? t('stock.filters.allSkus') : t('stock.filters.allProducts');
    }
    if (isMarketplaceMode) {
      const option = mpListingOptions.find((o) => o.value === productFilter);
      return option?.label || productFilter;
    }
    const product = products.find((p) => String(p.productId) === String(productFilter));
    if (!product) return t('stock.filters.product');
    return product.article || t('stock.selectArticleFallback', { id: product.productId });
  }, [productFilter, products, isMarketplaceMode, mpListingOptions, t]);

  const warehouseTriggerLabel = useMemo(() => {
    if (warehouseFilter === 'all') return t('stock.filters.allWarehouses');
    const warehouse = ownWarehouses.find((w) => String(w.warehouseId) === String(warehouseFilter));
    return warehouse?.name || t('stock.filters.warehouse');
  }, [warehouseFilter, ownWarehouses, t]);

  const isLoadingAny = loadingStock || (isOwnStockMode && (loadingProducts || loadingWarehouses));

  const marketplaceBlockingErrorMessage = useMemo(() => {
    if (!isMarketplaceMode || !marketplaceStockQueryError || !marketplaceStockErrorObj) {
      return null;
    }
    return messageForMarketplaceStockError(marketplaceStockErrorObj, t);
  }, [isMarketplaceMode, marketplaceStockQueryError, marketplaceStockErrorObj, t]);

  const productsMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.productId, p));
    return map;
  }, [products]);

  const warehousesMap = useMemo(() => {
    const map = new Map();
    ownWarehouses.forEach((w) => map.set(w.warehouseId, w));
    return map;
  }, [ownWarehouses]);

  const selectedWarehouse = useMemo(() => {
    if (!isOwnStockMode || warehouseFilter === 'all') return null;
    return ownWarehouses.find((w) => String(w.warehouseId) === String(warehouseFilter)) || null;
  }, [warehouseFilter, ownWarehouses, isOwnStockMode]);

  const enrichedStock = useMemo(
    () =>
      stock.map((item) => {
        const product = productsMap.get(item.productId);
        const warehouse = warehousesMap.get(item.warehouseId);
        return {
          ...item,
          productName:
            item.productName ||
            product?.article ||
            t('stock.unknownProduct', { id: item.productId }),
          productBarcode: item.productBarcode ?? product?.barcode ?? null,
          warehouseName:
            item.warehouseName || warehouse?.name || t('stock.unknownWarehouse', { id: item.warehouseId }),
        };
      }),
    [stock, productsMap, warehousesMap, t],
  );

  // Our stock: one API page. Marketplace: full list; filter by search here, slice to page below.
  const rowsForPaging = useMemo(() => {
    if (isOwnStockMode) return enrichedStock;
    let rows = enrichedStock;
    if (productFilter !== 'all') {
      rows = rows.filter((item) => String(item.productId) === productFilter);
    }
    if (!qNormalized) return rows;
    const needle = qNormalized.toLowerCase();
    return rows.filter((item) => {
      const blob = [
        item.productName,
        item.listingArticle,
        item.productBarcode,
        String(item.productId),
        item.warehouseName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [isOwnStockMode, enrichedStock, qNormalized, productFilter]);

  const serverTotalRows = isOwnStockMode ? ownStockServerTotal : rowsForPaging.length;

  const displayedStock = useMemo(() => {
    if (isOwnStockMode) return rowsForPaging;
    return rowsForPaging.slice(offset, offset + limit);
  }, [isOwnStockMode, rowsForPaging, offset, limit]);

  useEffect(() => {
    if (fetchingStock) return;
    clampToTotal(serverTotalRows);
  }, [serverTotalRows, clampToTotal, fetchingStock]);

  const serverPagination = useMemo(
    () =>
      toDataTableServerPagination({
        totalRows: serverTotalRows,
        pageRowCount: displayedStock.length,
        isLoading: loadingStock,
        ariaLabel: t('stock.paginationNav'),
      }),
    [
      toDataTableServerPagination,
      serverTotalRows,
      displayedStock.length,
      loadingStock,
      t,
    ],
  );

  const stockSummary = useMemo(() => summarizeStockRows(rowsForPaging), [rowsForPaging]);

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
    setQ('');
    setLevelFilter('all');
    resetPage();
  };

  const hasActiveFilters =
    productFilter !== 'all' ||
    !!qNormalized ||
    (isOwnStockMode && (warehouseFilter !== 'all' || levelFilter !== 'all'));

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          selectedWarehouse
            ? `${t('stock.ourTitle')} - ${selectedWarehouse.name}`
            : isOwnStockMode
              ? t('stock.ourTitle')
              : t('stock.marketplaceTitle', {
                  source: stockSource === 'wildberries'
                    ? t('stock.sources.wildberries')
                    : t('stock.sources.ozon'),
                })
        }
        description={
          selectedWarehouse
            ? t('stock.descriptionWarehouse', { warehouse: selectedWarehouse.name })
            : isOwnStockMode
              ? t('stock.ourDescription')
              : t('stock.marketplaceDescription', {
                  source: stockSource === 'wildberries'
                    ? t('stock.sources.wildberries')
                    : t('stock.sources.ozon'),
                })
        }
      >
        {isOwnStockMode ? (
          <Button variant="outline" asChild>
            <Link to={createPageUrl('StockSnapshots')}>
              <Database className="mr-2 h-4 w-4" />
              {t('stockSnapshots.title')}
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={stockSource === 'our' ? 'default' : 'outline'}
          onClick={() => {
            setStockSource('our');
            setProductFilter('all');
            setWarehouseFilter('all');
            setLevelFilter('all');
            resetPage();
          }}
        >
          {t('stock.sources.our')}
        </Button>
        <Button
          variant={stockSource === 'wildberries' ? 'default' : 'outline'}
          className={
            stockSource === 'wildberries'
              ? 'border-transparent bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-600 hover:to-fuchsia-600'
              : ''
          }
          onClick={() => {
            setStockSource('wildberries');
            setProductFilter('all');
            setWarehouseFilter('all');
            setLevelFilter('all');
            resetPage();
          }}
        >
          {t('stock.sources.wildberries')}
        </Button>
        <Button
          variant={stockSource === 'ozon' ? 'default' : 'outline'}
          className={
            stockSource === 'ozon'
              ? 'border-transparent bg-gradient-to-r from-sky-600 to-blue-700 text-white hover:from-sky-600 hover:to-blue-700'
              : ''
          }
          onClick={() => {
            setStockSource('ozon');
            setProductFilter('all');
            setWarehouseFilter('all');
            setLevelFilter('all');
            resetPage();
          }}
        >
          {t('stock.sources.ozon')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoadingAny ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="pt-6">
                  <LoadingState />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t('stock.stats.stockTotal')}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stockSummary.totalUnits.toLocaleString()}{' '}
                  <span className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                    {t('common.units')}
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stock.stats.uniqueSkus')}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stockSummary.uniqueProductsWithStock.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('stock.stats.positions')}
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stockSummary.positionsWithStock.toLocaleString()}
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
                  <SelectItem value="all">
                    {isMarketplaceMode
                      ? t('stock.filters.allSkus')
                      : t('stock.filters.allProducts')}
                  </SelectItem>
                  {isMarketplaceMode
                    ? mpListingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    : products.map((product) => (
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
              {isOwnStockMode && (
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
                    {ownWarehouses.map((warehouse) => (
                      <SelectItem
                        key={warehouse.warehouseId}
                        value={warehouse.warehouseId.toString()}
                      >
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isOwnStockMode && (
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
              )}
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

      {marketplaceBlockingErrorMessage ? (
        <Card className="dark:bg-slate-900 dark:border-slate-800 border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">
            {marketplaceBlockingErrorMessage}
          </CardContent>
        </Card>
      ) : isLoadingAny ? (
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <LoadingState />
          </CardContent>
        </Card>
      ) : rowsForPaging.length === 0 ? (
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <EmptyState
              message={
                isOwnStockMode
                  ? t('stock.emptyMessage')
                  : t('stock.marketplaceEmptyMessage')
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 dark:border-slate-800 dark:bg-slate-900">
          <StockTable
            t={t}
            stock={displayedStock}
            warehouseFilter={warehouseFilter}
            isLoading={loadingStock}
            serverPagination={serverPagination}
            showReorderPoint={isOwnStockMode}
            showHistoryAction={isOwnStockMode}
          />
        </Card>
      )}
    </div>
  );
}

export default StockPageContainer;
