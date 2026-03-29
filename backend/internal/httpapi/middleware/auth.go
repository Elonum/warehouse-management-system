package middleware

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
)

func AuthMiddleware(jwtManager *auth.JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeAuthError(w, "missing authorization header")
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				writeAuthError(w, "invalid authorization header format")
				return
			}

			token := parts[1]

			claims, err := jwtManager.ValidateToken(token)
			if err != nil {
				writeAuthError(w, "invalid or expired token")
				return
			}

			userID, err := uuid.Parse(claims.UserID)
			if err != nil {
				writeAuthError(w, "invalid user ID in token")
				return
			}

			roleID, err := uuid.Parse(claims.RoleID)
			if err != nil {
				writeAuthError(w, "invalid role ID in token")
				return
			}

			ctx := r.Context()
			ctx = auth.WithUserID(ctx, userID)
			ctx = auth.WithEmail(ctx, claims.Email)
			ctx = auth.WithRoleID(ctx, roleID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(jwtManager *auth.JWTManager, allowedRoles ...uuid.UUID) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		authMw := AuthMiddleware(jwtManager)
		handler := authMw(next)

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roleID := auth.GetRoleID(r.Context())
			if roleID == uuid.Nil {
				writeAuthError(w, "user role not found")
				return
			}

			allowed := false
			for _, allowedRole := range allowedRoles {
				if roleID == allowedRole {
					allowed = true
					break
				}
			}

			if !allowed {
				writeAuthError(w, "insufficient permissions")
				return
			}

			handler.ServeHTTP(w, r)
		})
	}
}

// RequireRoleNames checks role by name from DB using role ID from auth context.
// Use after AuthMiddleware in route groups.
func RequireRoleNames(roleRepo *repository.RoleRepository, allowedRoleNames ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedRoleNames))
	for _, roleName := range allowedRoleNames {
		normalized := normalizeRoleName(roleName)
		if normalized != "" {
			allowed[normalized] = struct{}{}
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roleID := auth.GetRoleID(r.Context())
			if roleID == uuid.Nil {
				writeAuthError(w, "user role not found")
				return
			}

			roleName := auth.GetRoleName(r.Context())
			if roleName == "" {
				role, err := roleRepo.GetByID(r.Context(), roleID)
				if err != nil {
					if errors.Is(err, repository.ErrRoleNotFound) {
						writeAuthError(w, "insufficient permissions")
						return
					}
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_ = json.NewEncoder(w).Encode(dto.APIResponse[any]{
						Error: &dto.Error{Code: "ROLE_RESOLVE_FAILED", Message: "failed to resolve user role"},
					})
					return
				}
				roleName = role.Name
				r = r.WithContext(auth.WithRoleName(r.Context(), roleName))
			}

			if _, ok := allowed[normalizeRoleName(roleName)]; !ok {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(dto.APIResponse[any]{
					Error: &dto.Error{Code: "FORBIDDEN", Message: "insufficient permissions"},
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func normalizeRoleName(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func writeAuthError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)

	response := dto.APIResponse[any]{
		Error: &dto.Error{
			Code:    "UNAUTHORIZED",
			Message: message,
		},
	}

	json.NewEncoder(w).Encode(response)
}
