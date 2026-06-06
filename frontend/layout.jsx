import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { api } from '@/api';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Layers,
  Database,
  ArrowLeftRight,
  Truck,
  ShoppingCart,
  ClipboardList,
  DollarSign,
  Users,
  Settings,
  BookOpen,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useI18n } from '@/lib/i18n';
import { canAccessNavItem } from '@/lib/rbac';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'sidebarCollapsed';

/** Единый размер кликабельных зон в свёрнутом меню (квадрат) */
const COLLAPSED_SLOT =
  'mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-0';

const SIDEBAR_WIDTH_EXPANDED = 'w-80';
const SIDEBAR_MAIN_OFFSET_EXPANDED = 'pl-80';

const navItemsConfig = [
  { key: 'dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { key: 'products', icon: Package, page: 'Products' },
  { key: 'warehouses', icon: Warehouse, page: 'Warehouses' },
  { key: 'stock', icon: Layers, page: 'Stock' },
  { key: 'stockSnapshots', icon: Database, page: 'StockSnapshots' },
  { key: 'stockMovements', icon: ArrowLeftRight, page: 'StockMovements' },
  { key: 'supplierOrders', icon: Truck, page: 'SupplierOrders' },
  { key: 'shipments', icon: ShoppingCart, page: 'Shipments' },
  { key: 'inventoryAdjustments', icon: ClipboardList, page: 'InventoryAdjustments' },
  { key: 'productCosts', icon: DollarSign, page: 'ProductCosts' },
  { key: 'usersRoles', icon: Users, page: 'UsersRoles' },
  { key: 'referenceData', icon: BookOpen, page: 'ReferenceData' },
];

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function Layout({ children, currentPageName }) {
  const { t } = useI18n();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: authProfile } = useAuthProfile();

  const user = authProfile
    ? {
        id: authProfile.userId,
        email: authProfile.email,
        name: authProfile.name || '',
        surname: authProfile.surname || '',
        full_name:
          `${authProfile.name || ''} ${authProfile.surname || ''}`.trim() || authProfile.email,
        role: authProfile.roleName || '',
        permissions: authProfile.permissions || [],
      }
    : null;

  const navItems = navItemsConfig.map((item) => ({
    ...item,
    name: t(`nav.${item.key}`),
    allowed: canAccessNavItem(authProfile, item.key),
  }));

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const closeMobileNav = () => setMobileNavOpen(false);

  const handleLogout = () => {
    api.auth.logout();
  };

  const sidebarToggleLabel = sidebarCollapsed
    ? t('layout.sidebarExpand')
    : t('layout.sidebarCollapse');

  return (
    <div
      className={cn(
        'min-h-screen',
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
      )}
    >
      <style>{`
        :root {
          --color-primary: 99 102 241;
          --color-primary-hover: 79 70 229;
        }
        .dark {
          color-scheme: dark;
        }
      `}</style>

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          aria-label={t('layout.sidebarCollapse')}
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        aria-label={t('layout.appName')}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r transition-[transform,width] duration-300 ease-in-out',
          'w-[min(20rem,88vw)] max-lg:shadow-xl',
          mobileNavOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          'lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-[4.75rem]' : 'lg:w-80',
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
        )}
      >
        <div
          className={cn(
            'shrink-0 border-b border-slate-200 dark:border-slate-800',
            sidebarCollapsed
              ? 'flex flex-col items-center gap-2 px-2 py-3 max-lg:px-5 max-lg:py-5'
              : 'px-5 py-5',
          )}
        >
          <div
            className={cn(
              'flex w-full min-w-0',
              sidebarCollapsed
                ? 'max-lg:items-start max-lg:gap-3 flex-col items-center gap-2 lg:flex-col lg:items-center'
                : 'items-start gap-3',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-lg',
                sidebarCollapsed
                  ? cn(COLLAPSED_SLOT, 'max-lg:h-12 max-lg:w-12 max-lg:text-base')
                  : 'h-12 w-12 shrink-0 text-base',
              )}
              title={sidebarCollapsed ? t('layout.appName') : undefined}
            >
              W
            </div>
            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden transition-all duration-300',
                sidebarCollapsed
                  ? 'max-lg:max-h-20 max-lg:max-w-none max-lg:opacity-100 max-h-0 max-w-0 opacity-0'
                  : 'max-h-20 opacity-100',
              )}
            >
              <h1 className="truncate text-xl font-bold tracking-tight">{t('layout.appName')}</h1>
              <p
                className={cn(
                  'text-sm leading-snug',
                  darkMode ? 'text-slate-400' : 'text-slate-500',
                )}
              >
                {t('layout.appDescription')}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.matchMedia('(max-width: 1023px)').matches) {
                  closeMobileNav();
                } else {
                  toggleSidebar();
                }
              }}
              aria-label={sidebarToggleLabel}
              title={sidebarToggleLabel}
              className={cn(
                sidebarCollapsed ? COLLAPSED_SLOT : 'h-9 w-9 shrink-0',
                'max-lg:hidden',
                darkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeMobileNav}
              aria-label={t('layout.sidebarCollapse')}
              className={cn(
                'h-9 w-9 shrink-0 lg:hidden',
                darkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <nav
          className={cn(
            'min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
            sidebarCollapsed
              ? 'flex flex-col items-center gap-2 px-2 py-3 max-lg:space-y-3 max-lg:px-5 max-lg:py-5 max-lg:items-stretch'
              : 'space-y-3 px-5 py-5',
          )}
        >
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;
            const restricted = item.allowed === false;
            const linkTitle = restricted
              ? `${item.name} — ${t('rbac.navRestrictedHint')}`
              : item.name;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={closeMobileNav}
                title={sidebarCollapsed ? linkTitle : undefined}
                aria-label={linkTitle}
                className={cn(
                  'group flex items-center rounded-lg transition-all duration-200',
                  sidebarCollapsed
                    ? cn(COLLAPSED_SLOT, 'max-lg:w-auto max-lg:gap-4 max-lg:px-4 max-lg:py-3 max-lg:mx-0')
                    : 'gap-4 px-4 py-3',
                  isActive
                    ? darkMode
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-indigo-50 text-indigo-700'
                    : restricted
                      ? darkMode
                        ? 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      : darkMode
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon
                  className={cn(
                    'shrink-0',
                    sidebarCollapsed ? 'h-5 w-5 max-lg:h-6 max-lg:w-6' : 'h-6 w-6',
                    restricted && 'opacity-70',
                    !isActive && !sidebarCollapsed && !restricted && 'transition-transform group-hover:scale-110',
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    sidebarCollapsed
                      ? 'sr-only max-lg:not-sr-only max-lg:flex max-lg:min-w-0 max-lg:flex-1 max-lg:items-center max-lg:gap-2 max-lg:text-base'
                      : 'flex min-w-0 flex-1 items-center gap-2 text-base whitespace-nowrap',
                  )}
                >
                  <span className="truncate">{item.name}</span>
                  {restricted ? (
                    <Lock
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 opacity-60',
                        sidebarCollapsed ? 'hidden max-lg:inline-flex' : 'inline-flex',
                      )}
                      aria-hidden
                    />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-slate-200 dark:border-slate-800',
            sidebarCollapsed
              ? 'flex flex-col items-center gap-2 px-2 py-3 max-lg:p-4'
              : 'p-4',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              sidebarCollapsed
                ? 'w-full max-lg:flex-row max-lg:gap-3 flex-col items-center gap-2'
                : 'gap-3',
            )}
          >
            <Avatar
              className={cn(
                'shrink-0',
                sidebarCollapsed ? 'mx-auto h-11 w-11' : 'h-10 w-10',
              )}
            >
              <AvatarFallback
                className={cn(
                  'text-sm font-medium',
                  darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700',
                )}
              >
                {user?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden text-left transition-all duration-300',
                sidebarCollapsed
                  ? 'max-lg:max-h-none max-lg:max-w-none max-lg:opacity-100 max-h-0 max-w-0 opacity-0'
                  : 'opacity-100',
              )}
            >
              <p className="truncate text-sm font-medium">{user?.full_name || 'User'}</p>
              <p
                className={cn(
                  'truncate text-xs capitalize',
                  darkMode ? 'text-slate-400' : 'text-slate-500',
                )}
              >
                {user?.role || 'user'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className={cn(
                sidebarCollapsed ? COLLAPSED_SLOT : 'h-10 w-10 shrink-0',
                darkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
              title={t('layout.settings')}
              aria-label={t('layout.settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      <main
        className={cn(
          'min-h-screen w-full min-w-0 transition-[padding-left] duration-300 ease-in-out',
          'pl-0',
          sidebarCollapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-80',
        )}
      >
        <div
          className={cn(
            'sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 lg:hidden',
            darkMode
              ? 'border-slate-800 bg-slate-950/95 backdrop-blur'
              : 'border-slate-200 bg-slate-50/95 backdrop-blur',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label={t('layout.sidebarExpand')}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t('layout.appName')}</p>
            <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">
              {user?.role || t('settings.user.defaultRole')}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label={t('layout.settings')}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-w-0 p-4 sm:p-6">{children}</div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        profile={authProfile}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        onLogout={handleLogout}
      />
    </div>
  );
}
