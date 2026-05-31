import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Warehouse as WarehouseIcon,
  RefreshCw,
  Truck,
} from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { movementDocumentPath } from '@/features/stock/stockMovementConstants';
import { useI18n } from '@/lib/i18n';

function MovementTypeIcon({ type }) {
  switch (type) {
    case 'SUPPLIER_RECEIPT':
      return <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case 'MP_SHIPMENT_OUT':
      return <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    case 'MP_SHIPMENT_IN':
      return <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case 'INVENTORY_ADJUSTMENT':
      return <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    default:
      return <RefreshCw className="h-4 w-4 text-slate-500" />;
  }
}

export default function StockMovementsTable({
  t,
  rows,
  isLoading,
  serverPagination,
  showWarehouseColumn = true,
}) {
  const { formatDate } = useI18n();
  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: 'movementDate',
        header: t('stockMovements.table.date'),
        cell: ({ row }) => (
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {formatDate(row.original.movementDate)}
          </p>
        ),
      },
      {
        accessorKey: 'documentNumber',
        header: t('stockMovements.table.name'),
        cell: ({ row }) => {
          const docPath = movementDocumentPath(
            row.original.movementType,
            row.original.documentId,
          );
          const label =
            row.original.documentNumber ||
            t('stockMovements.documentFallback', {
              id: String(row.original.documentId || '').slice(0, 8),
            });
          if (!docPath) {
            return <span className="text-sm text-slate-500">{label}</span>;
          }
          return (
            <Button variant="link" className="h-auto p-0 text-sm font-medium" asChild>
              <Link to={docPath}>{label}</Link>
            </Button>
          );
        },
      },
      {
        accessorKey: 'movementType',
        header: t('stockMovements.table.type'),
        cell: ({ row }) => {
          const type = row.original.movementType;
          return (
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-100 p-1.5 dark:bg-slate-800">
                <MovementTypeIcon type={type} />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t(`stockMovements.types.${type}`)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'productArticle',
        header: t('stockMovements.table.product'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Package className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {row.original.productArticle ||
                  t('stockMovements.unknownProduct', { id: row.original.productId })}
              </p>
              {row.original.productBarcode && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {row.original.productBarcode}
                </p>
              )}
            </div>
          </div>
        ),
      },
    ];

    if (showWarehouseColumn) {
      cols.push({
        accessorKey: 'warehouseName',
        header: t('stockMovements.table.warehouse'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">
              {row.original.warehouseName ||
                t('stockMovements.unknownWarehouse', { id: row.original.warehouseId })}
            </span>
          </div>
        ),
      });
    }

    cols.push({
      accessorKey: 'quantity',
      header: t('stockMovements.table.quantity'),
      cell: ({ row }) => {
        const qty = row.original.quantity ?? 0;
        const positive = qty > 0;
        return (
          <span
            className={`font-semibold ${
              positive
                ? 'text-emerald-600 dark:text-emerald-400'
                : qty < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {positive ? '+' : ''}
            {qty.toLocaleString()} {t('common.units')}
          </span>
        );
      },
    });

    return cols;
  }, [t, showWarehouseColumn, formatDate]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      serverPagination={serverPagination}
      searchable={false}
      emptyMessage={t('stockMovements.emptyMessage')}
    />
  );
}
