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
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

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
  { key: 'referenceData', icon: Settings, page: 'ReferenceData' },
];

export default function Layout({ children, currentPageName }) {
  const { t } = useI18n();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [user, setUser] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = navItemsConfig.map(item => ({
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
          full_name: `${userData.name || ''} ${userData.surname || ''}`.trim() || userData.email,
          role: 'user',
        });
      } catch (e) {
        console.log('User not logged in');
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

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
  };

  return (
    <div className={cn(
      "min-h-screen flex",
      darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      <style>{`
        :root {
          --color-primary: 99 102 241;
          --color-primary-hover: 79 70 229;
        }
        .dark {
          color-scheme: dark;
        }
      `}</style>
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={cn(
          "w-64 h-screen flex-shrink-0 border-r flex flex-col transition-colors duration-200",
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}>
          {/* Логотип и название */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg",
                "bg-gradient-to-br from-indigo-500 to-purple-600"
              )}>
                W
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{t('layout.appName')}</h1>
                <p className={cn(
                  "text-sm",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>{t('layout.appDescription')}</p>
              </div>
            </div>
          </div>

          {/* Навигационное меню */}
          <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group",
                    isActive
                      ? darkMode 
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-indigo-50 text-indigo-700"
                      : darkMode
                        ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn(
                    "h-6 w-6 flex-shrink-0",
                    isActive ? "" : "group-hover:scale-110 transition-transform"
                  )} />
                  <span className="text-base font-medium whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Пользовательская панель */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className={cn(
                  "text-sm font-medium",
                  darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
                )}>
                  {user?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                <p className={cn(
                  "text-xs capitalize truncate",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}>{user?.role || 'user'}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className={cn(
                  "h-10 w-10 flex-shrink-0",
                  darkMode ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
                title={t('layout.settings')}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 min-h-screen w-full overflow-auto"
        )}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

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

