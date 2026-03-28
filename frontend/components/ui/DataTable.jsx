import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { usePagination } from '@/hooks/usePagination';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import ServerPaginationFooter from '@/components/ui/ServerPaginationFooter';
import { CLIENT_TABLE_PAGE_SIZES } from '@/lib/pagination/constants';

export default function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Поиск...",
  pageSize = 10,
  /** No outer border/radius — for embedding inside Card */
  embedded = false,
  /**
   * Server-driven paging: full page in `data`, footer under the table.
   * Build with `useServerOffsetPagination().toDataTableServerPagination(...)`.
   */
  serverPagination = null,
  onRowClick,
  onRowDoubleClick,
  emptyMessage,
  isLoading = false,
  className
}) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(row => 
      columns.some(col => {
        const value = col.accessorKey ? row[col.accessorKey] : '';
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  }, [data, searchQuery, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const {
    page,
    pageSize: itemsPerPage,
    setPage,
    setPageSize,
    totalPages,
    goToFirst,
    goToLast,
    goToPrevious,
    goToNext,
    goToPage,
    range,
  } = usePagination({
    totalItems: serverPagination ? 1 : sortedData.length,
    initialPage: 1,
    initialPageSize: serverPagination ? 1 : pageSize,
  });

  const paginatedData = useMemo(() => {
    if (serverPagination) return sortedData;
    return sortedData.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage,
    );
  }, [serverPagination, sortedData, page, itemsPerPage]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clientPaginationFooterProps = useMemo(() => {
    if (serverPagination) return null;
    if (sortedData.length === 0) return null;
    return {
      page,
      totalPages,
      totalRows: sortedData.length,
      pageSize: itemsPerPage,
      pageSizeOptions: CLIENT_TABLE_PAGE_SIZES,
      from: range.from,
      to: range.to,
      pageRowCount: paginatedData.length,
      isLoading,
      onPrev: goToPrevious,
      onNext: goToNext,
      onFirst: goToFirst,
      onLast: goToLast,
      onPageSelect: goToPage,
      onPageSizeChange: (n) => {
        setPageSize(n);
        setPage(1);
      },
      ariaLabel: t('common.pagination.navLabel'),
    };
  }, [
    serverPagination,
    sortedData.length,
    page,
    totalPages,
    itemsPerPage,
    range.from,
    range.to,
    paginatedData.length,
    isLoading,
    goToPrevious,
    goToNext,
    goToFirst,
    goToLast,
    goToPage,
    setPageSize,
    setPage,
    t,
  ]);

  const footerProps = serverPagination || clientPaginationFooterProps;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and controls */}
      {searchable && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className={cn(
          'overflow-hidden bg-white dark:bg-slate-900',
          !embedded && 'rounded-lg border dark:border-slate-800',
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              {columns.map((column) => (
                <TableHead
                  key={column.accessorKey || column.id}
                  className={cn(
                    "font-semibold text-slate-700 dark:text-slate-300",
                    column.sortable !== false && "cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100",
                    column.className,
                    column.headerClassName
                  )}
                  onClick={() => column.sortable !== false && column.accessorKey && handleSort(column.accessorKey)}
                >
                  <div className={cn(
                    "flex items-center gap-2",
                    (column.headerClassName?.includes('text-center') || column.headerClassName?.includes('justify-center')) && "justify-center"
                  )}>
                    {column.header}
                    {sortConfig.key === column.accessorKey && (
                      <span className="text-indigo-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <LoadingState className="h-32" />
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState
                    className="h-32"
                    message={emptyMessage || t('common.noData')}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  className={cn(
                    "transition-colors",
                  (onRowClick || onRowDoubleClick) && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.accessorKey || column.id}
                      className={column.cellClassName}
                    >
                      {column.cell 
                        ? column.cell({ row: { original: row }, getValue: () => row[column.accessorKey] })
                        : row[column.accessorKey]
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {footerProps ? <ServerPaginationFooter {...footerProps} /> : null}
      </div>
    </div>
  );
}
