package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

type requestIDContextKey struct{}

const requestIDHeader = "X-Request-ID"

// RequestID injects a stable request ID into context and response headers.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimSpace(r.Header.Get(requestIDHeader))
		if id == "" {
			id = uuid.NewString()
		}

		ctx := context.WithValue(r.Context(), requestIDContextKey{}, id)
		w.Header().Set(requestIDHeader, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetRequestID returns request correlation ID from context.
func GetRequestID(ctx context.Context) string {
	v, _ := ctx.Value(requestIDContextKey{}).(string)
	return v
}
