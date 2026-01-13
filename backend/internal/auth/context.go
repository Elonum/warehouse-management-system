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

func WithUserID(ctx context.Context, userID int) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func GetUserID(ctx context.Context) int {
	if userID, ok := ctx.Value(userIDKey).(int); ok {
		return userID
	}
	return 0
}

func WithEmail(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, emailKey, email)
}

func GetEmail(ctx context.Context) string {
	if email, ok := ctx.Value(emailKey).(string); ok {
		return email
	}
	return ""
}

func WithRoleID(ctx context.Context, roleID int) context.Context {
	return context.WithValue(ctx, roleIDKey, roleID)
}

func GetRoleID(ctx context.Context) int {
	if roleID, ok := ctx.Value(roleIDKey).(int); ok {
		return roleID
	}
	return 0
}
