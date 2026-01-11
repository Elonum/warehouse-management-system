package middleware

import (
	"encoding/json"
	"net/http"

	"warehouse-backend/internal/dto"

	"github.com/rs/zerolog/log"
)

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Error().Interface("panic", err).Str("path", r.URL.Path).Msg("panic recovered")
				
				// Возвращаем JSON ошибку в едином формате API
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				
				json.NewEncoder(w).Encode(dto.APIResponse[any]{
					Error: &dto.Error{
						Code:    "INTERNAL_ERROR",
						Message: "internal server error",
					},
				})
			}
		}()

		next.ServeHTTP(w, r)
	})
}
