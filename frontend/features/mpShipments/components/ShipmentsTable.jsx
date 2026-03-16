import React, { useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function ShipmentsTable({
  t,
  shipments,
  isLoading,
  onCreateShipment,
  onEditShipment,
  onRequestDelete,
  shipmentStatuses = [],
}) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusFilterLabel = () => {
    if (statusFilter === 'all') {
      return t('shipments.filters.allStatuses');
    }
    const status = shipmentStatuses.find(
      (s) => String(s.shipmentStatusId) === String(statusFilter),
    );
    return status?.name || t('shipments.filters.allStatuses');
  };

  const filteredShipments = useMemo(() => {
    if (statusFilter === 'all') return shipments;
    return shipments.filter(
      (shipment) =>
        shipment.statusId && String(shipment.statusId) === String(statusFilter),
    );
  }, [shipments, statusFilter]);
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
              ? format(new Date(row.original.shipmentDate), 'dd.MM.yyyy', {
                  locale: ru,
                })
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'acceptanceDate',
        header: t('shipments.table.acceptanceDate'),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {row.original.acceptanceDate
              ? format(new Date(row.original.acceptanceDate), 'dd.MM.yyyy', {
                  locale: ru,
                })
              : '—'}
          </span>
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
        accessorKey: 'acceptanceCost',
        header: t('shipments.table.acceptanceCost'),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {row.original.acceptanceCost
              ? `${row.original.acceptanceCost.toFixed(2)} ₽`
              : '0.00 ₽'}
          </span>
        ),
      },
      {
        accessorKey: 'quantitySummary',
        header: t('shipments.table.quantity'),
        cell: ({ row }) => (
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {t('shipments.summary.positions')}:{' '}
              {row.original.positionsQty ?? 0}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {t('shipments.summary.sent')}:{' '}
              {row.original.sentQty ?? 0}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {t('shipments.summary.accepted')}:{' '}
              <span
                className={`font-semibold ${
                  (row.original.acceptedQty ?? 0) >= (row.original.sentQty ?? 0)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {row.original.acceptedQty ?? 0}
              </span>
            </span>
          </div>
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

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <span>{t('shipments.filters.statusesLabel')}</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56 h-8">
              <SelectValue>{getStatusFilterLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('shipments.filters.allStatuses')}
              </SelectItem>
              {shipmentStatuses.map((status) => (
                <SelectItem
                  key={status.shipmentStatusId}
                  value={status.shipmentStatusId.toString()}
                >
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredShipments}
        isLoading={isLoading}
        searchPlaceholder={t('shipments.searchPlaceholder')}
        emptyMessage={t('shipments.emptyMessage')}
        onRowDoubleClick={(row) => {
          if (!row.shipmentId) return;
          navigate(`${createPageUrl('ShipmentDetails')}?id=${row.shipmentId}`);
        }}
      />
    </div>
  );
}

export default ShipmentsTable;

