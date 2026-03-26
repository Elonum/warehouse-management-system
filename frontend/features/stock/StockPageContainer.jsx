import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
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

function StockPageContainer() {
  const { t } = useI18n();

  const urlParams = new URLSearchParams(window.location.search);
  const initialProduct = urlParams.get('product') || 'all';
  const initialWarehouse = urlParams.get('warehouse') || 'all';
  const initialQ = urlParams.get('q') || '';
  const initialSort = urlParams.get('sort') || 'product_asc';

  const [productFilter, setProductFilter] = useState(initialProduct);
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouse);
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState(initialSort);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const { data: stockData, isLoading: loadingStock } = useQuery({
    queryKey: [
      'stock',
      warehouseFilter !== 'all' ? warehouseFilter : null,
      productFilter !== 'all' ? productFilter : null,
      q || null,
      sort,
      limit,
      offset,
    ],
    queryFn: async () => {
      const params = { limit, offset, sort };
      if (warehouseFilter !== 'all') {
        params.warehouseId = warehouseFilter;
      }
      if (productFilter !== 'all') {
        params.productId = productFilter;
      }
      if (q) {
        params.q = q;
      }
      const response = await api.stock.getCurrent(params);
      return Array.isArray(response) ? response : [];
    },
  });

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

  const stock = Array.isArray(stockData) ? stockData : [];
  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

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
    return warehousesMap.get(warehouseFilter) || null;
  }, [warehouseFilter, warehousesMap]);

  const enrichedStock = useMemo(
    () =>
      stock.map((item) => {
        const product = productsMap.get(item.productId);
        const warehouse = warehousesMap.get(item.warehouseId);
        return {
          ...item,
          productName: product?.article || `Товар #${item.productId}`,
          warehouseName: warehouse?.name || `Склад #${item.warehouseId}`,
        };
      }),
    [stock, productsMap, warehousesMap],
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
    setSort('product_asc');
    setOffset(0);
  };

  const hasActiveFilters =
    productFilter !== 'all' || warehouseFilter !== 'all' || q || sort !== 'product_asc';

  const canGoPrev = offset > 0;
  const canGoNext = enrichedStock.length === limit;

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
                    setOffset(0);
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
                      setOffset(0);
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
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {productFilter === 'all'
                      ? t('stock.filters.allProducts')
                      : (() => {
                          const product = products.find(
                            (p) => p.productId.toString() === productFilter.toString(),
                          );
                          return product ? product.article : t('stock.filters.product');
                        })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('stock.filters.allProducts')}
                  </SelectItem>
                  {products.map((product) => (
                    <SelectItem
                      key={product.productId}
                      value={product.productId.toString()}
                    >
                      {product.article || `ID: ${product.productId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={warehouseFilter}
                onValueChange={(v) => {
                  setWarehouseFilter(v);
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {warehouseFilter === 'all'
                      ? t('stock.filters.allWarehouses')
                      : (() => {
                          const warehouse = warehouses.find(
                            (w) =>
                              w.warehouseId.toString() === warehouseFilter.toString(),
                          );
                          return warehouse
                            ? warehouse.name
                            : t('stock.filters.warehouse');
                        })()}
                  </SelectValue>
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
                value={sort}
                onValueChange={(v) => {
                  setSort(v);
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_asc">{t('stock.sort.productAsc')}</SelectItem>
                  <SelectItem value="product_desc">{t('stock.sort.productDesc')}</SelectItem>
                  <SelectItem value="quantity_desc">{t('stock.sort.quantityDesc')}</SelectItem>
                  <SelectItem value="quantity_asc">{t('stock.sort.quantityAsc')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / {t('common.page')}</SelectItem>
                  <SelectItem value="50">50 / {t('common.page')}</SelectItem>
                  <SelectItem value="100">100 / {t('common.page')}</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  {t('stock.filters.clear')}
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGoPrev}
                  onClick={() => setOffset((v) => Math.max(0, v - limit))}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext}
                  onClick={() => setOffset((v) => v + limit)}
                >
                  {t('common.next')}
                </Button>
              </div>
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
        <StockTable
          t={t}
          stock={enrichedStock}
          productsMap={productsMap}
          warehouseFilter={warehouseFilter}
          isLoading={loadingStock}
        />
      )}
    </div>
  );
}

export default StockPageContainer;

