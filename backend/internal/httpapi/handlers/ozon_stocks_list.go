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

type OzonStocksListHandler struct {
	svc *service.OzonStockService
}

func NewOzonStocksListHandler(svc *service.OzonStockService) *OzonStocksListHandler {
	return &OzonStocksListHandler{svc: svc}
}

// List proxies Ozon stocks; данные не сохраняются в БД.
func (h *OzonStocksListHandler) List(w http.ResponseWriter, r *http.Request) {
	startedAt := time.Now()
	requestID := middleware.GetRequestID(r.Context())
	var req dto.OzonStockListRequest
	if err := decodeJSONBodyAllowEmpty(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.List(r.Context(), req)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Dur("duration", time.Since(startedAt)).
			Msg("ozon stocks list failed")
		if errors.Is(err, service.ErrOzonCredentialsNotConfigured) {
			writeError(w, http.StatusBadRequest, "OZON_CREDENTIALS_MISSING", "Set OZON_CLIENT_ID and OZON_API_KEY on the server")
			return
		}
		writeError(w, http.StatusBadGateway, "OZON_STOCKS_LIST_FAILED", "failed to load stocks from Ozon")
		return
	}

	log.Info().
		Str("request_id", requestID).
		Int("items", len(out.Items)).
		Dur("duration", time.Since(startedAt)).
		Msg("ozon stocks list completed")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[*dto.OzonStockListResponse]{Data: out})
}
