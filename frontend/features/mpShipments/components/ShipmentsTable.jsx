import React, { useMemo } from 'react';
import {
  Plus,
  ShoppingCart,
  Store,
  Warehouse as WarehouseIcon,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function ShipmentsTable({
  t,
  shipments,
  isLoading,
  onCreateShipment,
  onEditShipment,
  onRequestDelete,
}) {
  const columns = useMemo(
    () => [
      {
        accessorKey: 'shipmentNumber',
        header: t('shipments.table.shipmentNumber'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/20">
              <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.shipmentNumber}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'storeName',
        header: t('shipments.table.store'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">
              {row.original.storeName || t('common.notSpecified')}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'warehouseName',
        header: t('shipments.table.warehouse'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">
              {row.original.warehouseName || t('common.notSpecified')}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'statusName',
        header: t('shipments.table.status'),
        cell: ({ row }) => (
          <StatusBadge status={row.original.statusName || t('common.notSpecified')} />
        ),
      },
      {
        accessorKey: 'shipmentDate',
        header: t('shipments.table.shipmentDate'),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {row.original.shipmentDate
              ? format(new Date(row.original.shipmentDate), 'dd.MM.yyyy', { locale: ru })
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'sentQty',
        header: t('shipments.table.sentAccepted'),
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.sentQty || 0}
            </span>
            <span className="text-slate-400"> / </span>
            <span
              className={`font-medium ${
                row.original.acceptedQty >= row.original.sentQty
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {row.original.acceptedQty || 0}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'logisticsCost',
        header: t('shipments.table.logistics'),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {row.original.logisticsCost
              ? `${row.original.logisticsCost.toFixed(2)} ₽`
              : '0.00 ₽'}
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
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`${createPageUrl('ShipmentDetails')}?id=${row.original.shipmentId}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('common.details')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditShipment(row.original)}>
                <Edit2 className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onRequestDelete(row.original)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, onEditShipment, onRequestDelete],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('shipments.title')}
        description={t('shipments.description')}
      >
        <Button
          onClick={onCreateShipment}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('shipments.addShipment')}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={shipments}
        isLoading={isLoading}
        searchPlaceholder={t('shipments.searchPlaceholder')}
        emptyMessage={t('shipments.emptyMessage')}
      />
    </div>
  );
}

export default ShipmentsTable;

