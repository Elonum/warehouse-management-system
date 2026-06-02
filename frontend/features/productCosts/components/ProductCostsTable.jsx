import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Edit2, HelpCircle, MoreHorizontal, Trash2 } from 'lucide-react';

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductCostsTable({
  t,
  formatDate,
  rows,
  isLoading,
  serverPagination,
  onEdit,
  onDelete,
}) {
  const columns = useMemo(
    () => [
      {
        accessorKey: 'productArticle',
        header: t('productCosts.table.product'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
              <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {row.original.productArticle ||
                  t('productCosts.unknownProduct', { id: row.original.productId })}
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
      {
        accessorKey: 'periodStart',
        header: t('productCosts.table.periodStart'),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {formatDate(row.original.periodStart)}
          </span>
        ),
      },
      {
        accessorKey: 'periodEnd',
        header: t('productCosts.table.periodEnd'),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {row.original.periodEnd
              ? formatDate(row.original.periodEnd)
              : t('productCosts.currentPeriod')}
          </span>
        ),
      },
      {
        accessorKey: 'unitCostToWarehouse',
        header: t('productCosts.table.unitCost'),
        headerClassName: 'text-right',
        className: 'text-right',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatMoney(row.original.unitCostToWarehouse)} ₽
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: (
          <div className="flex items-center gap-1">
            <span>{t('productCosts.table.createdAt')}</span>
            <span
              className="relative inline-flex items-center group"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <HelpCircle className="w-3 h-3 text-slate-400" />
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md border bg-white px-2 py-1 text-xs font-normal text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {t('productCosts.meta.createdAtHint')}
              </span>
            </span>
          </div>
        ),
        sortable: false,
        cell: ({ row }) => {
          const user = row.original.createdByName || t('common.notSpecified');
          const dt = row.original.createdAt ? formatDate(row.original.createdAt, 'dd.MM.yyyy HH:mm') : '—';
          return (
            <div className="leading-tight" title={`${user}\n${dt}`}>
              <div className="text-slate-600 dark:text-slate-400">{dt}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'updatedAt',
        header: (
          <div className="flex items-center gap-1">
            <span>{t('productCosts.table.updatedAt')}</span>
            <span
              className="relative inline-flex items-center group"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <HelpCircle className="w-3 h-3 text-slate-400" />
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md border bg-white px-2 py-1 text-xs font-normal text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {t('productCosts.meta.updatedAtHint')}
              </span>
            </span>
          </div>
        ),
        sortable: false,
        cell: ({ row }) => {
          const user = row.original.updatedByName || t('common.notSpecified');
          const dt = row.original.updatedAt ? formatDate(row.original.updatedAt, 'dd.MM.yyyy HH:mm') : '—';
          return (
            <div className="leading-tight" title={`${user}\n${dt}`}>
              <div className="text-slate-600 dark:text-slate-400">{dt}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user}</div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: t('productCosts.table.status'),
        sortable: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge
              status={t('productCosts.activeBadge')}
              className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
            />
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        accessorKey: 'notes',
        header: t('productCosts.table.notes'),
        cell: ({ row }) => (
          <span className="block max-w-xs truncate text-sm text-slate-500 dark:text-slate-400">
            {row.original.notes || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        sortable: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Edit2 className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(row.original)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, formatDate, onEdit, onDelete],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable={false}
      embedded
      serverPagination={serverPagination}
      emptyMessage={t('productCosts.emptyMessage')}
      isLoading={isLoading}
      onRowDoubleClick={onEdit}
    />
  );
}
