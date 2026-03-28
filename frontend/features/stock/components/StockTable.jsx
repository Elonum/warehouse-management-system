import React, { useMemo } from 'react';
import { Package, Warehouse as WarehouseIcon, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function StockTable({ t, stock, warehouseFilter, isLoading }) {
  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: 'productName',
        header: t('stock.table.product'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Package className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {row.original.productName}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {row.original.productBarcode ||
                  t('stock.table.productIdLine', { id: row.original.productId })}
              </p>
            </div>
          </div>
        ),
      },
    ];

    if (warehouseFilter === 'all') {
      cols.push({
        accessorKey: 'warehouseName',
        header: t('stock.table.warehouse'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-slate-400" />
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
        accessorKey: 'reorderPoint',
        header: t('products.table.reorderPoint'),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {row.original.reorderPoint ?? 0}
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
    );

    return cols;
  }, [warehouseFilter, t]);

  return (
    <DataTable
      columns={columns}
      data={stock}
      searchable={false}
      embedded
      pageSize={Math.max(stock.length, 1)}
      emptyMessage={t('stock.emptyMessage')}
      isLoading={isLoading}
    />
  );
}

export default StockTable;

