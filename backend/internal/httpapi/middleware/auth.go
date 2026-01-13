package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
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

			ctx := r.Context()
			ctx = auth.WithUserID(ctx, claims.UserID)
			ctx = auth.WithEmail(ctx, claims.Email)
			ctx = auth.WithRoleID(ctx, claims.RoleID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(jwtManager *auth.JWTManager, allowedRoles ...int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		authMw := AuthMiddleware(jwtManager)
		handler := authMw(next)

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roleID := auth.GetRoleID(r.Context())
			if roleID == 0 {
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
