package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/httpapi/middleware"
	"warehouse-backend/internal/integration/integrationlog"
	"warehouse-backend/internal/service"

	"github.com/rs/zerolog/log"
)

type WildberriesStocksListHandler struct {
	svc *service.WildberriesStockService
}

func NewWildberriesStocksListHandler(svc *service.WildberriesStockService) *WildberriesStocksListHandler {
	return &WildberriesStocksListHandler{svc: svc}
}

// List proxies WB Statistics GET /api/v1/supplier/stocks; данные не сохраняются в БД.
func (h *WildberriesStocksListHandler) List(w http.ResponseWriter, r *http.Request) {
	startedAt := time.Now()
	requestID := middleware.GetRequestID(r.Context())
	var req dto.WildberriesStockListRequest
	if err := decodeJSONBodyAllowEmpty(w, r, &req); err != nil {
		log.Warn().
			Str("integration", "wildberries").
			Str("request_id", requestID).
			Msg("wildberries stocks list: invalid request body")
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.List(r.Context(), req)
	if err != nil {
		log.Warn().
			Err(err).
			Str("integration", "wildberries").
			Str("request_id", requestID).
			Str("date_from", req.DateFrom).
			Str("error_detail", integrationlog.Truncate(err.Error(), 500)).
			Dur("duration", time.Since(startedAt)).
			Msg("wildberries stocks list failed")
		if errors.Is(err, service.ErrWbStatisticsTokenNotConfigured) {
			writeError(w, http.StatusBadRequest, "WB_STATISTICS_TOKEN_MISSING", "Set WB_STATISTICS_TOKEN (Statistics category) on the server")
			return
		}
		if errors.Is(err, service.ErrWbStockListInvalidDateFrom) {
			writeError(w, http.StatusBadRequest, "INVALID_WB_STOCKS_DATE_FROM", "dateFrom must be RFC3339 or YYYY-MM-DD")
			return
		}
		writeError(w, http.StatusBadGateway, "WB_STOCKS_LIST_FAILED", "failed to load stocks from Wildberries")
		return
	}

	log.Info().
		Str("integration", "wildberries").
		Str("request_id", requestID).
		Int("items", len(out.Items)).
		Dur("duration", time.Since(startedAt)).
		Msg("wildberries stocks list completed")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[*dto.WildberriesStockListResponse]{Data: out})
}
