package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
)

// AuthMiddleware проверяет JWT токен в заголовке Authorization
// Если токен валиден, добавляет информацию о пользователе в контекст запроса
func AuthMiddleware(jwtManager *auth.JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Получаем токен из заголовка Authorization: "Bearer <token>"
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeAuthError(w, "missing authorization header")
				return
			}

			// Проверяем формат "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				writeAuthError(w, "invalid authorization header format")
				return
			}

			token := parts[1]

			// Валидируем токен
			claims, err := jwtManager.ValidateToken(token)
			if err != nil {
				writeAuthError(w, "invalid or expired token")
				return
			}

			// Добавляем информацию о пользователе в контекст
			// Это позволяет handlers получить данные пользователя без повторной проверки токена
			ctx := r.Context()
			ctx = auth.WithUserID(ctx, claims.UserID)
			ctx = auth.WithEmail(ctx, claims.Email)
			ctx = auth.WithRoleID(ctx, claims.RoleID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole проверяет, что у пользователя есть одна из требуемых ролей
// Используется для защиты endpoints, доступных только определенным ролям
func RequireRole(jwtManager *auth.JWTManager, allowedRoles ...int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		// Сначала проверяем авторизацию
		authMw := AuthMiddleware(jwtManager)
		handler := authMw(next)

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Получаем роль пользователя из контекста
			roleID := auth.GetRoleID(r.Context())
			if roleID == 0 {
				writeAuthError(w, "user role not found")
				return
			}

			// Проверяем, есть ли роль пользователя в списке разрешенных
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

