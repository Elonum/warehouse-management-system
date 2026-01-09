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

	limit := 50
	offset := 0

	if v := r.URL.Query().Get("limit"); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	if v := r.URL.Query().Get("offset"); v != "" {
		if o, err := strconv.Atoi(v); err == nil && o >= 0 {
			offset = o
		}
	}

	items, err := h.service.GetCurrentStock(r.Context(), warehouseID, limit, offset)
	if err != nil {
		log.Println(err)
		http.Error(w, "failed to load stock", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}
