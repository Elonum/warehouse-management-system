package auth

import (
	"context"
)

type contextKey string

const (
	userIDKey contextKey = "userID"
	emailKey  contextKey = "email"
	roleIDKey contextKey = "roleID"
)

// WithUserID добавляет ID пользователя в контекст
func WithUserID(ctx context.Context, userID int) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// GetUserID получает ID пользователя из контекста
func GetUserID(ctx context.Context) int {
	if userID, ok := ctx.Value(userIDKey).(int); ok {
		return userID
	}
	return 0
}

// WithEmail добавляет email пользователя в контекст
func WithEmail(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, emailKey, email)
}

// GetEmail получает email пользователя из контекста
func GetEmail(ctx context.Context) string {
	if email, ok := ctx.Value(emailKey).(string); ok {
		return email
	}
	return ""
}

// WithRoleID добавляет ID роли пользователя в контекст
func WithRoleID(ctx context.Context, roleID int) context.Context {
	return context.WithValue(ctx, roleIDKey, roleID)
}

// GetRoleID получает ID роли пользователя из контекста
func GetRoleID(ctx context.Context) int {
	if roleID, ok := ctx.Value(roleIDKey).(int); ok {
		return roleID
	}
	return 0
}

