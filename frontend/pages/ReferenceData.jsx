import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useI18n } from '@/lib/i18n';
import { 
  Shield,
  Truck,
  ShoppingCart,
  ClipboardList,
  Warehouse,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ReferenceData() {
  const { t } = useI18n();

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: orderStatuses = [], isLoading: orderStatusesLoading } = useQuery({
    queryKey: ['orderStatuses'],
    queryFn: async () => {
      const response = await api.orderStatuses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: shipmentStatuses = [], isLoading: shipmentStatusesLoading } = useQuery({
    queryKey: ['shipmentStatuses'],
    queryFn: async () => {
      const response = await api.shipmentStatuses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: inventoryStatuses = [], isLoading: inventoryStatusesLoading } = useQuery({
    queryKey: ['inventoryStatuses'],
    queryFn: async () => {
      const response = await api.inventoryStatuses.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: warehouseTypes = [], isLoading: warehouseTypesLoading } = useQuery({
    queryKey: ['warehouseTypes'],
    queryFn: async () => {
      const response = await api.warehouseTypes.list({ limit: 1000, offset: 0 });
      return Array.isArray(response) ? response : [];
    },
  });

  const referenceSections = [
    {
      key: 'roles',
      title: t('referenceData.roles.title'),
      description: t('referenceData.roles.description'),
      icon: Shield,
      count: roles.length,
      isLoading: rolesLoading,
      color: 'indigo',
      items: roles,
    },
    {
      key: 'orderStatuses',
      title: t('referenceData.orderStatuses.title'),
      description: t('referenceData.orderStatuses.description'),
      icon: Truck,
      count: orderStatuses.length,
      isLoading: orderStatusesLoading,
      color: 'blue',
      items: orderStatuses,
    },
    {
      key: 'shipmentStatuses',
      title: t('referenceData.shipmentStatuses.title'),
      description: t('referenceData.shipmentStatuses.description'),
      icon: ShoppingCart,
      count: shipmentStatuses.length,
      isLoading: shipmentStatusesLoading,
      color: 'purple',
      items: shipmentStatuses,
    },
    {
      key: 'inventoryStatuses',
      title: t('referenceData.inventoryStatuses.title'),
      description: t('referenceData.inventoryStatuses.description'),
      icon: ClipboardList,
      count: inventoryStatuses.length,
      isLoading: inventoryStatusesLoading,
      color: 'amber',
      items: inventoryStatuses,
    },
    {
      key: 'warehouseTypes',
      title: t('referenceData.warehouseTypes.title'),
      description: t('referenceData.warehouseTypes.description'),
      icon: Warehouse,
      count: warehouseTypes.length,
      isLoading: warehouseTypesLoading,
      color: 'emerald',
      items: warehouseTypes,
    },
  ];

  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('referenceData.title')} 
        description={t('referenceData.description')}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {referenceSections.map((section) => {
          const Icon = section.icon;
          const colors = colorClasses[section.color];
          
          return (
            <Card 
              key={section.key} 
              className={cn(
                "transition-all duration-200 hover:shadow-lg dark:bg-slate-900 dark:border-slate-800",
                "border-2 hover:border-opacity-50",
                colors.border
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "h-14 w-14 rounded-xl flex items-center justify-center",
                    colors.bg
                  )}>
                    <Icon className={cn("h-7 w-7", colors.text)} />
                  </div>
                  {section.isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <div className={cn(
                      "px-3 py-1 rounded-full text-sm font-semibold",
                      colors.bg,
                      colors.text
                    )}>
                      {section.count}
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg mb-2">{section.title}</CardTitle>
                <CardDescription className="text-sm">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {section.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : section.items.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                      {t('referenceData.items')}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {section.items.slice(0, 5).map((item, index) => {
                        // Get ID based on section type
                        const itemId = item.roleId || item.orderStatusId || item.shipmentStatusId || 
                                      item.inventoryStatusId || item.warehouseTypeId || item.id || index;
                        return (
                          <div
                            key={itemId}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg text-sm",
                              "bg-slate-50 dark:bg-slate-800/50"
                            )}
                          >
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {item.name}
                            </span>
                          </div>
                        );
                      })}
                      {section.items.length > 5 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-1">
                          {t('referenceData.moreItems', { count: section.items.length - 5 })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    {t('referenceData.empty')}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className={cn(
                    "flex items-center text-sm font-medium cursor-pointer group",
                    colors.text
                  )}>
                    <span>{t('referenceData.manage')}</span>
                    <ChevronRight className={cn(
                      "w-4 h-4 ml-1 transition-transform group-hover:translate-x-1",
                      colors.text
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800">
              <BookOpen className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <CardTitle>{t('referenceData.summary.title')}</CardTitle>
              <CardDescription>{t('referenceData.summary.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            {referenceSections.map((section) => (
              <div key={section.key}>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {section.title}
                </p>
                {section.isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {section.count}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
