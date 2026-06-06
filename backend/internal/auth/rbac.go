package auth

import (
	"strings"
)

// Permission identifies an application capability (module + action).
type Permission string

const (
	PermAdmin Permission = "admin"

	PermProductsRead  Permission = "products.read"
	PermProductsWrite Permission = "products.write"

	PermWarehousesRead  Permission = "warehouses.read"
	PermWarehousesWrite Permission = "warehouses.write"

	PermStockRead            Permission = "stock.read"
	PermStockSnapshotsWrite  Permission = "stock.snapshots.write"
	PermStockMovementsRead   Permission = "stock.movements.read"

	PermProcurementRead  Permission = "procurement.read"
	PermProcurementWrite Permission = "procurement.write"

	PermDeliveryWrite Permission = "delivery.write"

	PermInventoryRead  Permission = "inventory.read"
	PermInventoryWrite Permission = "inventory.write"

	PermFinanceRead  Permission = "finance.read"
	PermFinanceWrite Permission = "finance.write"

	PermMarketplaceRead  Permission = "marketplace.read"
	PermMarketplaceWrite Permission = "marketplace.write"

	PermIntegrationsRead Permission = "integrations.read"

	PermStoresRead  Permission = "stores.read"
	PermStoresWrite Permission = "stores.write"

	PermReferenceRead Permission = "reference.read"
)

// NormalizeRoleName lowercases and trims a role label for comparisons.
func NormalizeRoleName(roleName string) string {
	return strings.ToLower(strings.TrimSpace(roleName))
}

// PermissionsForRole returns effective permissions for a role name.
// Unknown roles receive no permissions (fail closed).
func PermissionsForRole(roleName string) []Permission {
	switch NormalizeRoleName(roleName) {
	case "администратор", "administrator", "admin", "superadmin", "owner":
		return allPermissions()
	case "менеджер по закупкам", "менеджер":
		return []Permission{
			PermProductsRead, PermProductsWrite,
			PermWarehousesRead,
			PermStockRead,
			PermProcurementRead, PermProcurementWrite,
			PermReferenceRead,
		}
	case "менеджер по поставкам":
		return []Permission{
			PermProductsRead,
			PermWarehousesRead,
			PermStockRead, PermStockMovementsRead,
			PermProcurementRead, PermDeliveryWrite,
			PermReferenceRead,
		}
	case "сотрудник склада", "кладовщик":
		return []Permission{
			PermProductsRead,
			PermWarehousesRead,
			PermStockRead, PermStockSnapshotsWrite, PermStockMovementsRead,
			PermInventoryRead, PermInventoryWrite,
			PermReferenceRead,
		}
	case "финансовый менеджер":
		return []Permission{
			PermProductsRead,
			PermStockRead,
			PermFinanceRead, PermFinanceWrite,
		}
	case "менеджер маркетплейса":
		return []Permission{
			PermProductsRead,
			PermWarehousesRead,
			PermStockRead,
			PermMarketplaceRead, PermMarketplaceWrite,
			PermIntegrationsRead,
			PermStoresRead, PermStoresWrite,
			PermReferenceRead,
		}
	default:
		return nil
	}
}

func allPermissions() []Permission {
	return []Permission{
		PermAdmin,
		PermProductsRead, PermProductsWrite,
		PermWarehousesRead, PermWarehousesWrite,
		PermStockRead, PermStockSnapshotsWrite, PermStockMovementsRead,
		PermProcurementRead, PermProcurementWrite, PermDeliveryWrite,
		PermInventoryRead, PermInventoryWrite,
		PermFinanceRead, PermFinanceWrite,
		PermMarketplaceRead, PermMarketplaceWrite,
		PermIntegrationsRead,
		PermStoresRead, PermStoresWrite,
		PermReferenceRead,
	}
}

// HasPermission reports whether roleName grants the permission.
func HasPermission(roleName string, perm Permission) bool {
	for _, p := range PermissionsForRole(roleName) {
		if p == perm {
			return true
		}
	}
	return false
}

// HasAnyPermission reports whether roleName grants at least one permission.
func HasAnyPermission(roleName string, perms ...Permission) bool {
	if len(perms) == 0 {
		return true
	}
	granted := PermissionsForRole(roleName)
	for _, required := range perms {
		for _, p := range granted {
			if p == required {
				return true
			}
		}
	}
	return false
}

// CanSelfRegister reports whether a role may be chosen on public registration.
func CanSelfRegister(roleName string) bool {
	switch NormalizeRoleName(roleName) {
	case "сотрудник склада", "кладовщик":
		return true
	default:
		return false
	}
}

// PermissionStrings converts permissions to API-friendly string slice.
func PermissionStrings(roleName string) []string {
	perms := PermissionsForRole(roleName)
	out := make([]string, 0, len(perms))
	for _, p := range perms {
		out = append(out, string(p))
	}
	return out
}
