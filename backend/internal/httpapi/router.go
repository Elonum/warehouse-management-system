package httpapi

import (
	"net/http"
	"warehouse-backend/internal/db"
	"warehouse-backend/internal/httpapi/handlers"

	"github.com/go-chi/chi/v5"
)

func NewRouter(pg *db.Postgres) *chi.Mux {
	r := chi.NewRouter()

	healthHandler := handlers.NewHealthHandler(pg)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Get("/health/db", healthHandler.DBHealth)

	return r
}
