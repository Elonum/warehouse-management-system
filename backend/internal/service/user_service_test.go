package service

import "testing"

func TestRoleHasAdminPermission(t *testing.T) {
	adminRoles := []string{
		"Администратор",
		"administrator",
		"Admin",
		"superadmin",
		"owner",
	}
	for _, role := range adminRoles {
		if !roleHasAdminPermission(role) {
			t.Fatalf("expected admin permission for role %q", role)
		}
	}

	nonAdminRoles := []string{
		"Кладовщик",
		"Менеджер",
		"Финансовый менеджер",
		"",
	}
	for _, role := range nonAdminRoles {
		if roleHasAdminPermission(role) {
			t.Fatalf("expected no admin permission for role %q", role)
		}
	}
}
