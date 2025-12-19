import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { 
  Package, 
  Warehouse, 
  Store, 
  Settings,
  Database,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ReferenceData() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.entities.Warehouse.list(),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.entities.Store.list(),
  });

  const referenceItems = [
    {
      title: 'Products',
      description: 'Manage your product catalog including articles, barcodes, and base costs',
      icon: Package,
      count: products.length,
      activeCount: products.filter(p => p.status === 'active').length,
      href: 'Products',
      color: 'indigo'
    },
    {
      title: 'Warehouses',
      description: 'Configure storage locations, types, and capacities',
      icon: Warehouse,
      count: warehouses.length,
      activeCount: warehouses.filter(w => w.status === 'active').length,
      href: 'Warehouses',
      color: 'purple'
    },
    {
      title: 'Stores',
      description: 'Manage marketplace stores and sales channels',
      icon: Store,
      count: stores.length,
      activeCount: stores.filter(s => s.status === 'active').length,
      href: 'Warehouses',
      color: 'emerald'
    }
  ];

  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
    },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reference Data" 
        description="Manage master data for your warehouse system"
      />

      <div className="grid grid-cols-3 gap-6">
        {referenceItems.map((item) => {
          const Icon = item.icon;
          const colors = colorClasses[item.color];
          
          return (
            <Card key={item.title} className="transition-shadow dark:bg-slate-900 dark:border-slate-800 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`h-14 w-14 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    <Icon className={`h-7 w-7 ${colors.text}`} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                    {item.count} total
                  </span>
                </div>
                <CardTitle className="mt-4">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.activeCount}</span> active
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={createPageUrl(item.href)}>
                      Manage
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Info */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Database className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Database and system status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Products</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{products.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Warehouses</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{warehouses.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Stores</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stores.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Database</p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Connected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20">
              <Settings className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link to={createPageUrl('Products')}>
                <Package className="w-4 h-4 mr-2" />
                Add Product
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to={createPageUrl('Warehouses')}>
                <Warehouse className="w-4 h-4 mr-2" />
                Add Warehouse
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to={createPageUrl('Warehouses')}>
                <Store className="w-4 h-4 mr-2" />
                Add Store
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to={createPageUrl('ProductCosts')}>
                <Settings className="w-4 h-4 mr-2" />
                Manage Costs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}