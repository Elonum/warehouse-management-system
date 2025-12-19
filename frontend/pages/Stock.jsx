import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { Layers, Package, Warehouse, History, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Stock() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialProduct = urlParams.get('product') || 'all';
  const initialWarehouse = urlParams.get('warehouse') || 'all';
  
  const [productFilter, setProductFilter] = useState(initialProduct);
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouse);

  const { data: stock = [], isLoading: loadingStock } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.entities.Stock.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list(),
  });

  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      const matchesProduct = productFilter === 'all' || item.product_id === productFilter;
      const matchesWarehouse = warehouseFilter === 'all' || item.warehouse_id === warehouseFilter;
      return matchesProduct && matchesWarehouse;
    });
  }, [stock, productFilter, warehouseFilter]);

  const totals = useMemo(() => {
    return filteredStock.reduce((acc, item) => ({
      quantity: acc.quantity + (item.quantity || 0),
      available: acc.available + (item.available_quantity || 0),
      reserved: acc.reserved + (item.reserved_quantity || 0),
      value: acc.value + (item.total_value || 0),
    }), { quantity: 0, available: 0, reserved: 0, value: 0 });
  }, [filteredStock]);

  const clearFilters = () => {
    setProductFilter('all');
    setWarehouseFilter('all');
  };

  const hasActiveFilters = productFilter !== 'all' || warehouseFilter !== 'all';

  const columns = [
    {
      accessorKey: 'product_name',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Package className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {row.original.product_name || 'Unknown Product'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ID: {row.original.product_id}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'warehouse_name',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.warehouse_name || 'Unknown Warehouse'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'On Hand',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.original.quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'reserved_quantity',
      header: 'Reserved',
      cell: ({ row }) => (
        <span className="text-amber-600 dark:text-amber-400">
          {row.original.reserved_quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'available_quantity',
      header: 'Available',
      cell: ({ row }) => (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {row.original.available_quantity?.toLocaleString() || row.original.quantity?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'unit_cost',
      header: 'Unit Cost',
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-400">
          {row.original.unit_cost ? `$${row.original.unit_cost.toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'total_value',
      header: 'Total Value',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          ${(row.original.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`${createPageUrl('StockMovements')}?product=${row.original.product_id}`}>
            <History className="w-4 h-4 mr-2" />
            History
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock Balances" 
        description="Current inventory levels across all warehouses"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total On Hand</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totals.quantity.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Available</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totals.available.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Reserved</p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totals.reserved.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Value</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              ${totals.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters:</span>
            </div>
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
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredStock}
        searchPlaceholder="Search stock..."
        emptyMessage="No stock records found"
      />
    </div>
  );
}