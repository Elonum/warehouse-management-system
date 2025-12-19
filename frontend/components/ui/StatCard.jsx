import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend, 
  trendValue,
  className,
  variant = 'default'
}) {
  const variants = {
    default: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-transparent',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-transparent',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-transparent',
    rose: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-transparent',
  };

  const isColored = variant !== 'default';

  return (
    <div className={cn(
      "rounded-xl border p-6 transition-all duration-200 hover:shadow-lg",
      variants[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium",
            isColored ? "text-white/80" : "text-slate-500 dark:text-slate-400"
          )}>
            {title}
          </p>
          <p className={cn(
            "mt-2 text-3xl font-bold tracking-tight",
            isColored ? "text-white" : "text-slate-900 dark:text-slate-100"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "mt-1 text-sm",
              isColored ? "text-white/70" : "text-slate-500 dark:text-slate-400"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "mt-3 flex items-center gap-1 text-sm font-medium",
              trend === 'up' 
                ? isColored ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                : isColored ? "text-white" : "text-rose-600 dark:text-rose-400"
            )}>
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-lg p-3",
            isColored ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
          )}>
            <Icon className={cn(
              "h-6 w-6",
              isColored ? "text-white" : "text-slate-600 dark:text-slate-400"
            )} />
          </div>
        )}
      </div>
    </div>
  );
}