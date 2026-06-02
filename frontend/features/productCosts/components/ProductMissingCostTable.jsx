import React, { useMemo } from 'react';
import { Package, MoreHorizontal } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function formatInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : '—';
}

export default function ProductMissingCostTable({ t, rows, isLoading, serverPagination }) {
  const columns = useMemo(
    () => [
      {
        accessorKey: 'productArticle',
        header: t('productCosts.missing.table.product'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
              <Package className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {row.original.productArticle || t('productCosts.unknownProduct', { id: row.original.productId })}
              </p>
              {row.original.productBarcode ? (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.original.productBarcode}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'totalQuantity',
        header: t('productCosts.missing.table.totalQuantity'),
        headerClassName: 'text-right',
        className: 'text-right',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatInt(row.original.totalQuantity)}
          </span>
        ),
      },
      {
        accessorKey: 'warehouseCount',
        header: t('productCosts.missing.table.warehouseCount'),
        headerClassName: 'text-right',
        className: 'text-right',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {formatInt(row.original.warehouseCount)}
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
              <DropdownMenuItem asChild>
                <Link to={`${createPageUrl('Stock')}?product=${row.original.productId}`}>{t('productCosts.missing.actions.openStock')}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  to={`${createPageUrl('ProductCosts')}?product=${row.original.productId}&view=active`}
                >
                  {t('productCosts.missing.actions.openCosts')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable={false}
      embedded
      serverPagination={serverPagination}
      emptyMessage={t('productCosts.missing.emptyMessage')}
      isLoading={isLoading}
    />
  );
}

