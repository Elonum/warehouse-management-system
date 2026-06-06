import React, { useMemo } from 'react';
import { Check, Lock, Eye, PenLine, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { buildProfileModuleGroups } from '@/lib/profileModules';
import { cn } from '@/lib/utils';

const ACCESS_STYLES = {
  full: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    labelKey: 'settings.access.levels.full',
    Icon: Shield,
  },
  read: {
    badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
    icon: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
    labelKey: 'settings.access.levels.read',
    Icon: Eye,
  },
  partial: {
    badge: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    labelKey: 'settings.access.levels.partial',
    Icon: PenLine,
  },
  none: {
    badge: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400',
    icon: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
    labelKey: 'settings.access.levels.none',
    Icon: Lock,
  },
};

function ModuleCard({ module, t }) {
  const style = ACCESS_STYLES[module.accessLevel] || ACCESS_STYLES.none;
  const ModuleIcon = module.icon;
  const LevelIcon = style.Icon;
  const visibleCapabilities = module.capabilities?.length
    ? module.capabilities
    : [];

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border p-4 transition-colors',
        module.allowed
          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40'
          : 'border-slate-100 bg-slate-50/80 opacity-75 dark:border-slate-800/60 dark:bg-slate-900/20',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          style.icon,
        )}
      >
        <ModuleIcon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {t(module.labelKey)}
          </p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
              style.badge,
            )}
          >
            <LevelIcon className="h-3 w-3 shrink-0" aria-hidden />
            {t(style.labelKey)}
          </span>
        </div>
        {visibleCapabilities.length > 0 ? (
          <ul className="space-y-1">
            {visibleCapabilities.map((cap) => (
              <li
                key={cap.key}
                className={cn(
                  'flex items-center gap-2 text-xs',
                  cap.granted
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500',
                )}
              >
                {cap.granted ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                ) : (
                  <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" />
                )}
                <span>{t(cap.key)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function UserProfileAccess({ profile }) {
  const { t } = useI18n();
  const { roleKey, stats, groups } = useMemo(
    () => buildProfileModuleGroups(profile),
    [profile],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('settings.access.title')}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('settings.access.description')}
          </p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
            {stats.available}
          </span>
          <span className="text-indigo-600/80 dark:text-indigo-300/80">
            {' '}
            / {stats.total} {t('settings.access.modulesCount')}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 dark:border-indigo-500/20 dark:from-indigo-950/40 dark:to-slate-900/40">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600/80 dark:text-indigo-300/80">
          {t('settings.access.roleSummary')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {t(`settings.access.roles.${roleKey}`)}
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.id} className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t(group.labelKey)}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.modules.map((module) => (
                <ModuleCard key={module.id} module={module} t={t} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
