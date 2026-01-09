package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"warehouse-backend/internal/service"
)

type StockHandler struct {
	service *service.StockService
}

func NewStockHandler(service *service.StockService) *StockHandler {
	return &StockHandler{service: service}
}

func (h *StockHandler) GetCurrentStock(w http.ResponseWriter, r *http.Request) {
	var warehouseID *int

	if v := r.URL.Query().Get("warehouseId"); v != "" {
		id, err := strconv.Atoi(v)
		if err != nil {
			http.Error(w, "invalid warehouseId", http.StatusBadRequest)
			return
		}
		warehouseID = &id
	}

	items, err := h.service.GetCurrentStock(r.Context(), warehouseID)
	if err != nil {
		log.Println("GetCurrentStock error:", err)
		http.Error(w, "failed to load stock", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}
