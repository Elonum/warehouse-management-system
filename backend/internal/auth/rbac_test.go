package auth

import "testing"

func TestPermissionsForRole_ProcurementManager(t *testing.T) {
	perms := PermissionsForRole("Менеджер по закупкам")
	if !HasPermission("Менеджер по закупкам", PermProcurementWrite) {
		t.Fatal("expected procurement write")
	}
	if HasPermission("Менеджер по закупкам", PermFinanceWrite) {
		t.Fatal("procurement must not manage finance")
	}
	if !HasPermission("Менеджер по закупкам", PermStockRead) {
		t.Fatal("procurement should view stock for planning")
	}
	if len(perms) == 0 {
		t.Fatal("expected permissions")
	}
}

func TestPermissionsForRole_WarehouseEmployee(t *testing.T) {
	if !HasPermission("Сотрудник склада", PermInventoryWrite) {
		t.Fatal("expected inventory write")
	}
	if HasPermission("Сотрудник склада", PermFinanceRead) {
		t.Fatal("warehouse must not read finance")
	}
}

func TestPermissionsForRole_DeliveryManager(t *testing.T) {
	if !HasPermission("Менеджер по поставкам", PermDeliveryWrite) {
		t.Fatal("expected delivery write")
	}
	if HasPermission("Менеджер по поставкам", PermProcurementWrite) {
		t.Fatal("delivery must not create procurement docs")
	}
}

func TestCanSelfRegister(t *testing.T) {
	if !CanSelfRegister("Сотрудник склада") {
		t.Fatal("warehouse employee should self-register")
	}
	if CanSelfRegister("Администратор") {
		t.Fatal("admin must not self-register")
	}
}

func TestLegacyRoleAliases(t *testing.T) {
	if !HasPermission("Кладовщик", PermInventoryWrite) {
		t.Fatal("legacy кладовщик alias expected")
	}
	if !HasPermission("Менеджер", PermProcurementWrite) {
		t.Fatal("legacy менеджер alias expected")
	}
}
