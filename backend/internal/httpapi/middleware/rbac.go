package middleware

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
)

// LoadRoleName resolves role name from DB and stores it in request context.
// Use after AuthMiddleware.
func LoadRoleName(roleRepo *repository.RoleRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if auth.GetRoleName(r.Context()) != "" {
				next.ServeHTTP(w, r)
				return
			}
			roleID := auth.GetRoleID(r.Context())
			if roleID == uuid.Nil {
				writeForbidden(w)
				return
			}
			role, err := roleRepo.GetByID(r.Context(), roleID)
			if err != nil {
				if errors.Is(err, repository.ErrRoleNotFound) {
					writeForbidden(w)
					return
				}
				writeRoleResolveError(w)
				return
			}
			next.ServeHTTP(w, r.WithContext(auth.WithRoleName(r.Context(), role.Name)))
		})
	}
}

// RequirePermission denies the request unless the user role grants one of the permissions.
func RequirePermission(roleRepo *repository.RoleRepository, required ...auth.Permission) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roleName, ok := resolveRoleName(r, roleRepo)
			if !ok {
				writeForbidden(w)
				return
			}
			if !auth.HasAnyPermission(roleName, required...) {
				writeForbidden(w)
				return
			}
			next.ServeHTTP(w, r.WithContext(auth.WithRoleName(r.Context(), roleName)))
		})
	}
}

func resolveRoleName(r *http.Request, roleRepo *repository.RoleRepository) (string, bool) {
	if name := auth.GetRoleName(r.Context()); name != "" {
		return name, true
	}
	roleID := auth.GetRoleID(r.Context())
	if roleID == uuid.Nil {
		return "", false
	}
	role, err := roleRepo.GetByID(r.Context(), roleID)
	if err != nil {
		return "", false
	}
	return role.Name, true
}

func writeForbidden(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[any]{
		Error: &dto.Error{Code: "FORBIDDEN", Message: "insufficient permissions"},
	})
}

func writeRoleResolveError(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[any]{
		Error: &dto.Error{Code: "ROLE_RESOLVE_FAILED", Message: "failed to resolve user role"},
	})
}
