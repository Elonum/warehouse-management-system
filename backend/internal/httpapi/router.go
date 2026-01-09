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

	healthHandler := handlers.NewHealthHandler(pg)

	stockRepo := repository.NewStockRepository(pg.Pool)
	stockService := service.NewStockService(stockRepo)
	stockHandler := handlers.NewStockHandler(stockService)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})
	r.Get("/health/db", healthHandler.DBHealth)

	r.Get("/api/v1/stock/current", stockHandler.GetCurrentStock)

	return r
}
