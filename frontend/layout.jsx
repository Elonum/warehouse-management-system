import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { api } from '@/api';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Layers,
  ArrowLeftRight,
  Truck,
  ShoppingCart,
  ClipboardList,
  DollarSign,
  Users,
  Settings,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useI18n } from '@/lib/i18n';
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [user, setUser] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = navItemsConfig.map((item) => ({
    ...item,
    name: t(`nav.${item.key}`),
  }));

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await api.auth.me();
        setUser({
          id: userData.userId,
          email: userData.email,
          name: userData.name || '',
          surname: userData.surname || '',
          full_name:
            `${userData.name || ''} ${userData.surname || ''}`.trim() || userData.email,
          role: 'user',
        });
      } catch {
        setUser(null);
      }
    };
    loadUser();
  }, []);

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

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
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

      <aside
        aria-label={t('layout.appName')}
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex h-screen flex-col border-r transition-[width] duration-300 ease-in-out',
          sidebarCollapsed ? 'w-[4.75rem]' : SIDEBAR_WIDTH_EXPANDED,
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
        )}
      >
        <div
          className={cn(
            'shrink-0 border-b border-slate-200 dark:border-slate-800',
            sidebarCollapsed ? 'flex flex-col items-center gap-2 px-2 py-3' : 'px-5 py-5',
          )}
        >
          <div
            className={cn(
              'flex w-full min-w-0',
              sidebarCollapsed ? 'flex-col items-center gap-2' : 'items-start gap-3',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-lg',
                sidebarCollapsed ? COLLAPSED_SLOT : 'h-12 w-12 shrink-0 text-base',
              )}
              title={sidebarCollapsed ? t('layout.appName') : undefined}
            >
              W
            </div>
            <div
              className={cn(
                'min-w-0 flex-1 overflow-hidden transition-all duration-300',
                sidebarCollapsed ? 'max-h-0 max-w-0 opacity-0' : 'max-h-20 opacity-100',
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
              onClick={toggleSidebar}
              aria-label={sidebarToggleLabel}
              title={sidebarToggleLabel}
              className={cn(
                sidebarCollapsed ? COLLAPSED_SLOT : 'h-9 w-9 shrink-0',
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
          </div>
        </div>

        <nav
          className={cn(
            'min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
            sidebarCollapsed
              ? 'flex flex-col items-center gap-2 px-2 py-3'
              : 'space-y-3 px-5 py-5',
          )}
        >
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                title={sidebarCollapsed ? item.name : undefined}
                aria-label={item.name}
                className={cn(
                  'group flex items-center rounded-lg transition-all duration-200',
                  sidebarCollapsed ? COLLAPSED_SLOT : 'gap-4 px-4 py-3',
                  isActive
                    ? darkMode
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-indigo-50 text-indigo-700'
                    : darkMode
                      ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon
                  className={cn(
                    'shrink-0',
                    sidebarCollapsed ? 'h-5 w-5' : 'h-6 w-6',
                    !isActive && !sidebarCollapsed && 'transition-transform group-hover:scale-110',
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    sidebarCollapsed
                      ? 'sr-only'
                      : 'max-w-[12rem] text-base whitespace-nowrap',
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-slate-200 dark:border-slate-800',
            sidebarCollapsed
              ? 'flex flex-col items-center gap-2 px-2 py-3'
              : 'p-4',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              sidebarCollapsed ? 'w-full flex-col items-center gap-2' : 'gap-3',
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
                sidebarCollapsed ? 'max-h-0 max-w-0 opacity-0' : 'opacity-100',
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
          'min-h-screen w-full transition-[padding-left] duration-300 ease-in-out',
          sidebarCollapsed ? 'pl-[4.75rem]' : SIDEBAR_MAIN_OFFSET_EXPANDED,
        )}
      >
        <div className="p-6">{children}</div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        onLogout={handleLogout}
      />
    </div>
  );
}
