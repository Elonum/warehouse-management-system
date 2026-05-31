package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/rs/zerolog/log"
)

type StockMovementHandler struct {
	svc *service.StockMovementService
}

func NewStockMovementHandler(svc *service.StockMovementService) *StockMovementHandler {
	return &StockMovementHandler{svc: svc}
}

func (h *StockMovementHandler) List(w http.ResponseWriter, r *http.Request) {
	warehouseID, err := parseOptionalUUIDQuery(r, "warehouseId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_ID", "invalid warehouseId")
		return
	}
	productID, err := parseOptionalUUIDQuery(r, "productId")
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid productId")
		return
	}

	var q *string
	if v := strings.TrimSpace(r.URL.Query().Get("q")); v != "" {
		if len(v) > 100 {
			writeError(w, http.StatusBadRequest, "INVALID_QUERY", "q must be at most 100 characters")
			return
		}
		q = &v
	}

	movementType := repository.StockMovementTypeAll
	if v := strings.TrimSpace(r.URL.Query().Get("movementType")); v != "" && v != "all" {
		switch repository.StockMovementType(v) {
		case repository.StockMovementTypeSupplierReceipt,
			repository.StockMovementTypeMPShipmentOut,
			repository.StockMovementTypeMPShipmentIn,
			repository.StockMovementTypeInventoryAdjustment:
			movementType = repository.StockMovementType(v)
		default:
			writeError(w, http.StatusBadRequest, "INVALID_MOVEMENT_TYPE", "invalid movementType")
			return
		}
	}

	dateFrom, err := parseOptionalDateQuery(r, "fromDate")
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_FROM_DATE", "fromDate must be YYYY-MM-DD")
		return
	}
	dateTo, err := parseOptionalDateQuery(r, "toDate")
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_TO_DATE", "toDate must be YYYY-MM-DD")
		return
	}
	if dateFrom != nil && dateTo != nil && dateFrom.After(*dateTo) {
		writeError(w, http.StatusBadRequest, "INVALID_DATE_RANGE", "fromDate must be before or equal to toDate")
		return
	}

	ownWarehousesOnly := r.URL.Query().Get("ownWarehousesOnly") == "true"

	limit := parseInt(r.URL.Query().Get("limit"), 50)
	offset := parseInt(r.URL.Query().Get("offset"), 0)
	if limit < 1 || limit > 500 {
		writeError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be between 1 and 500")
		return
	}
	if offset < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_OFFSET", "offset must be non-negative")
		return
	}

	out, err := h.svc.List(r.Context(), warehouseID, productID, movementType, q, dateFrom, dateTo, ownWarehousesOnly, limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("stock movements list failed")
		writeError(w, http.StatusInternalServerError, "STOCK_MOVEMENTS_LOAD_FAILED", "failed to load stock movements")
		return
	}

	resp := dto.APIResponse[*dto.StockMovementListResponse]{
		Data: out,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
			Total:  out.Summary.TotalRows,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func parseOptionalUUIDQuery(r *http.Request, key string) (*uuid.UUID, error) {
	v := strings.TrimSpace(r.URL.Query().Get(key))
	if v == "" {
		return nil, nil
	}
	id, err := uuid.Parse(v)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func parseOptionalDateQuery(r *http.Request, key string) (*time.Time, error) {
	v := strings.TrimSpace(r.URL.Query().Get(key))
	if v == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", v)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
