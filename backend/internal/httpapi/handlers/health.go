package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"warehouse-backend/internal/db"
	"warehouse-backend/internal/dto"
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
		writeError(w, http.StatusServiceUnavailable, "DB_UNAVAILABLE", "database unavailable")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[map[string]string]{
		Data: map[string]string{"db": "ok"},
	})
}
