package httpapi

import (
	"net/http"
	"warehouse-backend/internal/db"
	"warehouse-backend/internal/httpapi/handlers"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
)

func NewRouter(pg *db.Postgres) *chi.Mux {
	r := chi.NewRouter()

	// repositories
	stockRepo := repository.NewStockRepository(pg.Pool)

	// services
	stockService := service.NewStockService(stockRepo)

	// handlers
	stockHandler := handlers.NewStockHandler(stockService)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`{"status":"ok"}`))
		})

		r.Get("/stock/current", stockHandler.GetCurrentStock)
	})

	return r
}
