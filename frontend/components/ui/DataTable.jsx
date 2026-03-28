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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { usePagination } from '@/hooks/usePagination';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

export default function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Поиск...",
  pageSize = 10,
  /** No outer border/radius — for embedding inside Card */
  embedded = false,
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
    canGoPrevious,
    canGoNext,
    goToFirst,
    goToLast,
    goToPrevious,
    goToNext,
    range,
  } = usePagination({
    totalItems: sortedData.length,
    initialPage: 1,
    initialPageSize: pageSize,
  });

  const paginatedData = useMemo(
    () =>
      sortedData.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage,
      ),
    [sortedData, page, itemsPerPage],
  );

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

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
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select
            value={String(itemsPerPage)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / стр</SelectItem>
              <SelectItem value="25">25 / стр</SelectItem>
              <SelectItem value="50">50 / стр</SelectItem>
              <SelectItem value="100">100 / стр</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t('common.pagination.range', {
              from: range.from,
              to: range.to,
              total: sortedData.length,
            }) || `Показано ${range.from}–${range.to} из ${sortedData.length}`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={goToFirst}
              disabled={!canGoPrevious}
              className="h-8 w-8"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={!canGoNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToLast}
              disabled={!canGoNext}
              className="h-8 w-8"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}