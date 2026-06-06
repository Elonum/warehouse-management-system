import React, { useMemo } from 'react';
import { Mail, Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useI18n } from '@/lib/i18n';
import { buildProfileModuleGroups, resolveRoleKey } from '@/lib/profileModules';
import { cn } from '@/lib/utils';

const ROLE_BADGE_STYLES = {
  administrator: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  procurement: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  delivery: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  warehouse: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  finance: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  marketplace: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function userInitial(user, fallback) {
  const name = user?.full_name || user?.name || '';
  return name.trim().charAt(0).toUpperCase() || fallback;
}

export function UserProfileCard({ user, profile }) {
  const { t } = useI18n();
  const roleKey = useMemo(() => resolveRoleKey(profile?.roleName || user?.role), [profile?.roleName, user?.role]);
  const { stats } = useMemo(() => buildProfileModuleGroups(profile), [profile]);
  const roleBadgeClass = ROLE_BADGE_STYLES[roleKey] || ROLE_BADGE_STYLES.default;
  const displayRole = profile?.roleName || user?.role || t('settings.user.defaultRole');

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white dark:ring-slate-800">
          <AvatarFallback className="bg-indigo-500 text-2xl font-semibold text-white">
            {userInitial(user, t('settings.user.fallbackInitial'))}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
              {user?.full_name || t('settings.user.fallbackName')}
            </h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{user?.email || '—'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                roleBadgeClass,
              )}
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              {displayRole}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              {t('settings.access.modulesAvailable', {
                count: String(stats.available),
                total: String(stats.total),
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4">
        <div className="bg-white/90 px-4 py-3 dark:bg-slate-900/90">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.user.name')}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{user?.name || '—'}</p>
        </div>
        <div className="bg-white/90 px-4 py-3 dark:bg-slate-900/90">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.user.surname')}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{user?.surname || '—'}</p>
        </div>
        <div className="bg-white/90 px-4 py-3 dark:bg-slate-900/90">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.user.patronymic')}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{profile?.patronymic || '—'}</p>
        </div>
        <div className="bg-white/90 px-4 py-3 dark:bg-slate-900/90">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.user.role')}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{displayRole}</p>
        </div>
      </div>
    </div>
  );
}
