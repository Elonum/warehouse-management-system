import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  ArrowLeftRight, 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw,
  Package, 
  Warehouse, 
  Filter, 
  X,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export default function StockMovements() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialProduct = urlParams.get('product') || 'all';
  
  const [productFilter, setProductFilter] = useState(initialProduct);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => api.entities.StockMovement.list('-movement_date', 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list(),
  });

  const filteredMovements = useMemo(() => {
    return movements.filter(item => {
      const matchesProduct = productFilter === 'all' || item.product_id === productFilter;
      const matchesWarehouse = warehouseFilter === 'all' || item.warehouse_id === warehouseFilter;
      const matchesType = typeFilter === 'all' || item.movement_type === typeFilter;
      
      let matchesDate = true;
      if (startDate && item.movement_date) {
        matchesDate = new Date(item.movement_date) >= new Date(startDate);
      }
      if (endDate && item.movement_date && matchesDate) {
        matchesDate = new Date(item.movement_date) <= new Date(endDate + 'T23:59:59');
      }
      
      return matchesProduct && matchesWarehouse && matchesType && matchesDate;
    });
  }, [movements, productFilter, warehouseFilter, typeFilter, startDate, endDate]);

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = productFilter !== 'all' || warehouseFilter !== 'all' || typeFilter !== 'all' || startDate || endDate;

  const getMovementIcon = (type) => {
    switch (type) {
      case 'incoming':
        return <ArrowDownRight className="h-4 w-4 text-emerald-600" />;
      case 'outgoing':
        return <ArrowUpRight className="h-4 w-4 text-rose-600" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-amber-600" />;
    }
  };

  const columns = [
    {
      accessorKey: 'movement_date',
      header: 'Date',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.movement_date 
              ? format(new Date(row.original.movement_date), 'MMM d, yyyy')
              : '—'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.movement_date 
              ? format(new Date(row.original.movement_date), 'HH:mm')
              : ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'movement_type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${
            row.original.movement_type === 'incoming' 
              ? 'bg-emerald-100 dark:bg-emerald-500/20' 
              : row.original.movement_type === 'outgoing'
                ? 'bg-rose-100 dark:bg-rose-500/20'
                : row.original.movement_type === 'transfer'
                  ? 'bg-blue-100 dark:bg-blue-500/20'
                  : 'bg-amber-100 dark:bg-amber-500/20'
          }`}>
            {getMovementIcon(row.original.movement_type)}
          </div>
          <StatusBadge status={row.original.movement_type} />
        </div>
      ),
    },
    {
      accessorKey: 'product_name',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.product_name || 'Unknown Product'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'warehouse_name',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.warehouse_name || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'source_type',
      header: 'Source',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
            {row.original.source_type?.replace(/_/g, ' ') || '—'}
          </p>
          {row.original.source_number && (
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {row.original.source_number}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => (
        <span className={`font-semibold ${
          row.original.quantity > 0 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-rose-600 dark:text-rose-400'
        }`}>
          {row.original.quantity > 0 ? '+' : ''}{row.original.quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs block">
          {row.original.notes || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock Movements" 
        description="Track all inventory movements across warehouses"
      />

      {/* Filters */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters:</span>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Product</label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500">Warehouse</label>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredMovements}
        searchPlaceholder="Search movements..."
        emptyMessage="No stock movements found"
        pageSize={25}
      />
    </div>
  );
}