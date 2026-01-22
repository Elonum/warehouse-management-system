package auth

import (
	"context"

	"github.com/google/uuid"
)

type contextKey string

const (
	userIDKey contextKey = "userID"
	emailKey  contextKey = "email"
	roleIDKey contextKey = "roleID"
)

func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func GetUserID(ctx context.Context) uuid.UUID {
	if userID, ok := ctx.Value(userIDKey).(uuid.UUID); ok {
		return userID
	}
	return uuid.Nil
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

func WithRoleID(ctx context.Context, roleID uuid.UUID) context.Context {
	return context.WithValue(ctx, roleIDKey, roleID)
}

func GetRoleID(ctx context.Context) uuid.UUID {
	if roleID, ok := ctx.Value(roleIDKey).(uuid.UUID); ok {
		return roleID
	}
	return uuid.Nil
}
