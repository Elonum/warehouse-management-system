package handlers

import (
	"context"
	"net/http"
	"time"

	"warehouse-backend/internal/db"
)

func Health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

type HealthHandler struct {
	DB *db.Postgres
}

func NewHealthHandler(db *db.Postgres) *HealthHandler {
	return &HealthHandler{DB: db}
}

func (h *HealthHandler) DBHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	err := h.DB.Health(ctx)
	if err != nil {
		http.Error(w, "database unavailable", http.StatusServiceUnavailable)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"db":"ok"}`))
}
