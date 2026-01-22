package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/service"

	"github.com/rs/zerolog/log"
)

type StockHandler struct {
	service *service.StockService
}

func NewStockHandler(service *service.StockService) *StockHandler {
	return &StockHandler{service: service}
}

func (h *StockHandler) GetCurrentStock(w http.ResponseWriter, r *http.Request) {
	var warehouseID *uuid.UUID

	if v := r.URL.Query().Get("warehouseId"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_ID", "invalid warehouseId")
			return
		}
		warehouseID = &id
	}

	limit := parseInt(r.URL.Query().Get("limit"), 50)
	offset := parseInt(r.URL.Query().Get("offset"), 0)

	if limit < 1 || limit > 1000 {
		writeError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be between 1 and 1000")
		return
	}
	if offset < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_OFFSET", "offset must be non-negative")
		return
	}

	items, err := h.service.GetCurrentStock(r.Context(), warehouseID, limit, offset)
	if err != nil {
		log.Error().Err(err).
			Interface("warehouseId", warehouseID).
			Int("limit", limit).
			Int("offset", offset).
			Msg("Failed to load stock")
		writeError(w, http.StatusInternalServerError, "STOCK_LOAD_FAILED", "failed to load stock")
		return
	}

	resp := dto.APIResponse[[]dto.StockItemResponse]{
		Data: items,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func parseInt(v string, def int) int {
	if v == "" {
		return def
	}
	if i, err := strconv.Atoi(v); err == nil {
		return i
	}
	return def
}

func parseUUID(v string) (uuid.UUID, error) {
	return uuid.Parse(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	json.NewEncoder(w).Encode(dto.APIResponse[any]{
		Error: &dto.Error{
			Code:    code,
			Message: message,
		},
	})
}
