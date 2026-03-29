package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/httpapi/middleware"
	"warehouse-backend/internal/service"

	"github.com/rs/zerolog/log"
)

type WildberriesSupplyListHandler struct {
	svc *service.WildberriesSupplyListService
}

func NewWildberriesSupplyListHandler(svc *service.WildberriesSupplyListService) *WildberriesSupplyListHandler {
	return &WildberriesSupplyListHandler{svc: svc}
}

// List proxies POST /api/v1/supplies on Wildberries; results are not stored in our database.
func (h *WildberriesSupplyListHandler) List(w http.ResponseWriter, r *http.Request) {
	startedAt := time.Now()
	requestID := middleware.GetRequestID(r.Context())
	var req dto.WildberriesSupplyListRequest
	if err := decodeJSONBodyAllowEmpty(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.List(r.Context(), req)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Int("limit", req.Limit).
			Int("offset", req.Offset).
			Int("statuses", len(req.StatusIDs)).
			Int("date_filters", len(req.Dates)).
			Dur("duration", time.Since(startedAt)).
			Msg("wildberries supplies list failed")
		if errors.Is(err, service.ErrWbSuppliesTokenNotConfigured) {
			writeError(w, http.StatusBadRequest, "WB_SUPPLIES_TOKEN_MISSING", "Set WB_SUPPLIES_TOKEN (Supplies category) on the server")
			return
		}
		if errors.Is(err, service.ErrWbSupplyListInvalidParams) {
			writeError(w, http.StatusBadRequest, "INVALID_SUPPLY_LIST_PARAMS", "limit must be 1–1000 or 0 for default; offset must be non-negative")
			return
		}
		writeError(w, http.StatusBadGateway, "WB_SUPPLIES_LIST_FAILED", "failed to load supplies from Wildberries")
		return
	}

	log.Info().
		Str("request_id", requestID).
		Int("limit", req.Limit).
		Int("offset", req.Offset).
		Int("statuses", len(req.StatusIDs)).
		Int("date_filters", len(req.Dates)).
		Int("items", len(out.Items)).
		Dur("duration", time.Since(startedAt)).
		Msg("wildberries supplies list completed")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[*dto.WildberriesSupplyListResponse]{Data: out})
}
