import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  ClipboardList,
  MoreHorizontal,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createPageUrl } from '@/utils';

function InventoryAdjustmentsTable({
  t,
  statusFilter,
  onStatusFilterChange,
  inventories,
  isLoading,
  onCreateAdjustment,
  onEditAdjustment,
  onRequestDelete,
}) {
  const navigate = useNavigate();

  const filteredInventories = useMemo(() => {
    if (statusFilter === 'final') {
      return inventories.filter((inv) => inv.statusIsFinal);
    }
    if (statusFilter === 'nonFinal') {
      return inventories.filter((inv) => !inv.statusIsFinal);
    }
    return inventories;
  }, [inventories, statusFilter]);

  const columns = [
    {
      accessorKey: 'rowNumber',
      header: t('inventoryAdjustments.table.number'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.rowNumber}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'adjustmentDate',
      header: t('inventoryAdjustments.table.adjustmentDate'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.adjustmentDate
            ? format(new Date(row.original.adjustmentDate), 'dd.MM.yyyy', {
                locale: ru,
              })
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'statusName',
      header: t('inventoryAdjustments.table.status'),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.statusName || t('common.notSpecified')}
          className={
            row.original.statusIsFinal
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : ''
          }
        />
      ),
    },
    {
      accessorKey: 'totalReceiptQty',
      header: t('inventoryAdjustments.table.receipt'),
      cell: ({ row }) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {row.original.totalReceiptQty > 0
            ? `+${row.original.totalReceiptQty.toLocaleString()}`
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalWriteOffQty',
      header: t('inventoryAdjustments.table.writeOff'),
      cell: ({ row }) => (
        <span className="font-medium text-rose-600 dark:text-rose-400">
          {row.original.totalWriteOffQty > 0
            ? `-${row.original.totalWriteOffQty.toLocaleString()}`
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: t('inventoryAdjustments.table.notes'),
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400 truncate max-w-xs">
          {row.original.notes || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: (
        <div className="flex items-center gap-1">
          <span>{t('inventoryAdjustments.table.createdAt')}</span>
          <span
            className="relative inline-flex items-center group"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md border bg-white px-2 py-1 text-xs font-normal text-slate-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {t('inventoryAdjustments.table.createdAtHint')}
            </span>
          </span>
        </div>
      ),
      cell: ({ row }) => (
        <span
          className="text-slate-600 dark:text-slate-400"
          title={[
            t('inventoryAdjustments.meta.createdByAt', {
              user: row.original.createdByName || t('common.notSpecified'),
              datetime: format(new Date(row.original.createdAt), 'dd.MM.yyyy HH:mm', {
                locale: ru,
              }),
            }),
            row.original.statusIsFinal &&
            row.original.completedByName &&
            row.original.completedAt
              ? t('inventoryAdjustments.meta.completedByAt', {
                  user: row.original.completedByName,
                  datetime: format(new Date(row.original.completedAt), 'dd.MM.yyyy HH:mm', {
                    locale: ru,
                  }),
                })
              : null,
          ]
            .filter(Boolean)
            .join('\n')}
        >
          {format(new Date(row.original.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
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
              <Link
                to={`${createPageUrl('InventoryAdjustmentDetails')}?id=${row.original.inventoryId}`}
              >
                <Eye className="w-4 h-4 mr-2" />
                {t('common.details')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditAdjustment(row.original)}>
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventoryAdjustments.title')}
        description={t('inventoryAdjustments.description')}
      >
        <Button onClick={onCreateAdjustment}>
          <Plus className="w-4 h-4 mr-2" />
          {t('inventoryAdjustments.addAdjustment')}
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
        <span>{t('inventoryAdjustments.filters.status')}</span>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-56">
            <SelectValue>
              {statusFilter === 'all'
                ? t('inventoryAdjustments.filters.all')
                : statusFilter === 'final'
                ? t('inventoryAdjustments.filters.final')
                : t('inventoryAdjustments.filters.nonFinal')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventoryAdjustments.filters.all')}</SelectItem>
            <SelectItem value="final">{t('inventoryAdjustments.filters.final')}</SelectItem>
            <SelectItem value="nonFinal">
              {t('inventoryAdjustments.filters.nonFinal')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredInventories}
        isLoading={isLoading}
        searchPlaceholder={t('inventoryAdjustments.searchPlaceholder')}
        emptyMessage={t('inventoryAdjustments.emptyMessage')}
        onRowDoubleClick={(row) => {
          if (!row.inventoryId) return;
          navigate(`${createPageUrl('InventoryAdjustmentDetails')}?id=${row.inventoryId}`);
        }}
      />
    </div>
  );
}

export default InventoryAdjustmentsTable;

