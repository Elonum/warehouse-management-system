import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Eye, Package } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function StockSnapshotsTable({
  t,
  formatDate,
  rows,
  isLoading,
  serverPagination,
  showWarehouseColumn,
  onOpenDetail,
}) {
  const columns = useMemo(
    () => [
      {
        accessorKey: 'snapshotDate',
        header: t('stockSnapshots.table.date'),
        cell: ({ row }) => (
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatDate(row.original.snapshotDate)}
          </span>
        ),
      },
      {
        accessorKey: 'productArticle',
        header: t('stockSnapshots.table.product'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
              <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {row.original.productArticle ||
                  t('stockSnapshots.unknownProduct', { id: row.original.productId })}
              </p>
              {row.original.productBarcode ? (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {row.original.productBarcode}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      ...(showWarehouseColumn
        ? [
            {
              accessorKey: 'warehouseName',
              header: t('stockSnapshots.table.warehouse'),
              cell: ({ row }) => (
                <span className="text-slate-600 dark:text-slate-400">
                  {row.original.warehouseName ||
                    t('stockSnapshots.unknownWarehouse', { id: row.original.warehouseId })}
                </span>
              ),
            },
          ]
        : []),
      {
        accessorKey: 'quantity',
        header: t('stockSnapshots.table.quantity'),
        headerClassName: 'text-right',
        className: 'text-right',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {Number(row.original.quantity ?? 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('stockSnapshots.table.recordedAt'),
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(row.original.createdAt, 'dd.MM.yyyy HH:mm')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        sortable: false,
        cell: ({ row }) => {
          const dateParam = row.original.snapshotDate
            ? String(row.original.snapshotDate).slice(0, 10)
            : '';
          const movementsUrl = `${createPageUrl('StockMovements')}?product=${row.original.productId}&warehouse=${row.original.warehouseId}${dateParam ? `&fromDate=${dateParam}` : ''}`;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenDetail(row.original)}
                aria-label={t('common.details')}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to={movementsUrl} aria-label={t('stockSnapshots.detail.openMovements')}>
                  <ArrowLeftRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [t, formatDate, showWarehouseColumn, onOpenDetail],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable={false}
      embedded
      serverPagination={serverPagination}
      emptyMessage={t('stockSnapshots.emptyMessage')}
      isLoading={isLoading}
      onRowDoubleClick={(row) => onOpenDetail(row.original)}
    />
  );
}
