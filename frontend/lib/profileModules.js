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
  BookOpen,
} from 'lucide-react';
import { hasAnyPermission, hasPermission, PERM } from '@/lib/rbac';

/** @typedef {'none' | 'read' | 'partial' | 'full'} ModuleAccessLevel */

const ROLE_KEYS = {
  администратор: 'administrator',
  administrator: 'administrator',
  admin: 'administrator',
  superadmin: 'administrator',
  owner: 'administrator',
  'менеджер по закупкам': 'procurement',
  менеджер: 'procurement',
  'менеджер по поставкам': 'delivery',
  'сотрудник склада': 'warehouse',
  кладовщик: 'warehouse',
  'финансовый менеджер': 'finance',
  'менеджер маркетплейса': 'marketplace',
};

const MODULE_ICONS = {
  dashboard: LayoutDashboard,
  products: Package,
  warehouses: Warehouse,
  stock: Layers,
  stockSnapshots: Database,
  stockMovements: ArrowLeftRight,
  supplierOrders: Truck,
  shipments: ShoppingCart,
  inventoryAdjustments: ClipboardList,
  productCosts: DollarSign,
  usersRoles: Users,
  referenceData: BookOpen,
};

const MODULE_GROUPS = [
  { id: 'overview', labelKey: 'settings.access.groups.overview' },
  { id: 'catalog', labelKey: 'settings.access.groups.catalog' },
  { id: 'stock', labelKey: 'settings.access.groups.stock' },
  { id: 'operations', labelKey: 'settings.access.groups.operations' },
  { id: 'finance', labelKey: 'settings.access.groups.finance' },
  { id: 'admin', labelKey: 'settings.access.groups.admin' },
];

const SYSTEM_MODULES = [
  {
    id: 'dashboard',
    group: 'overview',
    labelKey: 'nav.dashboard',
    readPerms: [],
    writePerms: [],
    alwaysOn: true,
  },
  {
    id: 'products',
    group: 'catalog',
    labelKey: 'nav.products',
    readPerms: [PERM.PRODUCTS_READ],
    writePerms: [PERM.PRODUCTS_WRITE],
  },
  {
    id: 'warehouses',
    group: 'catalog',
    labelKey: 'nav.warehouses',
    readPerms: [PERM.WAREHOUSES_READ],
    writePerms: [PERM.WAREHOUSES_WRITE, PERM.STORES_WRITE],
  },
  {
    id: 'stock',
    group: 'stock',
    labelKey: 'nav.stock',
    readPerms: [PERM.STOCK_READ],
    writePerms: [],
    capabilities: [
      { key: 'settings.access.capabilities.stockOur', perm: PERM.STOCK_READ },
      { key: 'settings.access.capabilities.stockMarketplace', perm: PERM.INTEGRATIONS_READ },
    ],
  },
  {
    id: 'stockSnapshots',
    group: 'stock',
    labelKey: 'nav.stockSnapshots',
    readPerms: [PERM.STOCK_READ],
    writePerms: [PERM.STOCK_SNAPSHOTS_WRITE],
  },
  {
    id: 'stockMovements',
    group: 'stock',
    labelKey: 'nav.stockMovements',
    readPerms: [PERM.STOCK_MOVEMENTS_READ],
    writePerms: [],
  },
  {
    id: 'supplierOrders',
    group: 'operations',
    labelKey: 'nav.supplierOrders',
    readPerms: [PERM.PROCUREMENT_READ],
    writePerms: [PERM.PROCUREMENT_WRITE],
    partialWritePerms: [PERM.DELIVERY_WRITE],
    capabilities: [
      { key: 'settings.access.capabilities.procurementManage', perm: PERM.PROCUREMENT_WRITE },
      { key: 'settings.access.capabilities.deliveryReceive', perm: PERM.DELIVERY_WRITE },
    ],
  },
  {
    id: 'shipments',
    group: 'operations',
    labelKey: 'nav.shipments',
    readPerms: [PERM.MARKETPLACE_READ],
    writePerms: [PERM.MARKETPLACE_WRITE],
  },
  {
    id: 'inventoryAdjustments',
    group: 'operations',
    labelKey: 'nav.inventoryAdjustments',
    readPerms: [PERM.INVENTORY_READ],
    writePerms: [PERM.INVENTORY_WRITE],
  },
  {
    id: 'productCosts',
    group: 'finance',
    labelKey: 'nav.productCosts',
    readPerms: [PERM.FINANCE_READ],
    writePerms: [PERM.FINANCE_WRITE],
  },
  {
    id: 'usersRoles',
    group: 'admin',
    labelKey: 'nav.usersRoles',
    readPerms: [PERM.ADMIN],
    writePerms: [PERM.ADMIN],
  },
  {
    id: 'referenceData',
    group: 'admin',
    labelKey: 'nav.referenceData',
    readPerms: [PERM.ADMIN],
    writePerms: [PERM.ADMIN],
  },
];

export function resolveRoleKey(roleName) {
  if (!roleName) return 'default';
  const normalized = roleName.trim().toLowerCase();
  return ROLE_KEYS[normalized] || 'default';
}

/** @returns {ModuleAccessLevel} */
function resolveModuleAccess(profile, module) {
  if (module.alwaysOn) return 'full';

  const canRead =
    module.readPerms.length === 0 || hasAnyPermission(profile, module.readPerms);
  const canWrite =
    module.writePerms.length > 0 && hasAnyPermission(profile, module.writePerms);
  const canPartialWrite =
    module.partialWritePerms?.length > 0 &&
    hasAnyPermission(profile, module.partialWritePerms);

  if (!canRead && !canWrite && !canPartialWrite) return 'none';
  if (canWrite) return 'full';
  if (canRead && canPartialWrite && !canWrite) return 'partial';
  if (canRead) return 'read';
  if (canPartialWrite) return 'partial';
  return 'none';
}

function resolveCapabilities(profile, module) {
  if (!module.capabilities?.length) return [];
  return module.capabilities.map((cap) => ({
    key: cap.key,
    granted: hasPermission(profile, cap.perm),
  }));
}

/**
 * @param {import('@/lib/rbac').AuthProfile | null | undefined} profile
 */
export function buildProfileModuleGroups(profile) {
  const modules = SYSTEM_MODULES.map((module) => {
    const accessLevel = resolveModuleAccess(profile, module);
    return {
      id: module.id,
      labelKey: module.labelKey,
      icon: MODULE_ICONS[module.id] || Package,
      accessLevel,
      capabilities: resolveCapabilities(profile, module),
      allowed: accessLevel !== 'none',
    };
  });

  const availableCount = modules.filter((m) => m.allowed).length;

  const groups = MODULE_GROUPS.map((group) => ({
    id: group.id,
    labelKey: group.labelKey,
    modules: modules.filter((m) => {
      const def = SYSTEM_MODULES.find((d) => d.id === m.id);
      return def?.group === group.id;
    }),
  })).filter((group) => group.modules.length > 0);

  return {
    roleKey: resolveRoleKey(profile?.roleName),
    stats: {
      available: availableCount,
      total: modules.length,
    },
    groups,
  };
}
