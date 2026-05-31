package handlers

import (
	"errors"
	"net/http"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/service"
)

type WildberriesStocksListHandler struct {
	svc *service.WildberriesStockService
}

func NewWildberriesStocksListHandler(svc *service.WildberriesStockService) *WildberriesStocksListHandler {
	return &WildberriesStocksListHandler{svc: svc}
}

// List proxies WB Statistics GET /api/v1/supplier/stocks; данные не сохраняются в БД.
func (h *WildberriesStocksListHandler) List(w http.ResponseWriter, r *http.Request) {
	requestID, startedAt := integrationRequestContext(r)
	var req dto.WildberriesStockListRequest
	if err := decodeJSONBodyAllowEmpty(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.List(r.Context(), req)
	if err != nil {
		writeIntegrationStocksFailure(w, "wildberries", requestID, startedAt, err, mapWildberriesStocksError, integrationStocksError{
			Status:  http.StatusBadGateway,
			Code:    "WB_STOCKS_LIST_FAILED",
			Message: "failed to load stocks from Wildberries",
		})
		return
	}

	writeIntegrationStocksSuccess(w, "wildberries", requestID, startedAt, out, len(out.Items))
}

func mapWildberriesStocksError(err error) (integrationStocksError, bool) {
	switch {
	case errors.Is(err, service.ErrWbStatisticsTokenNotConfigured):
		return integrationStocksError{
			Status:  http.StatusBadRequest,
			Code:    "WB_STATISTICS_TOKEN_MISSING",
			Message: "Set WB_STATISTICS_TOKEN (Statistics category) on the server",
		}, true
	case errors.Is(err, service.ErrWbStockListInvalidDateFrom):
		return integrationStocksError{
			Status:  http.StatusBadRequest,
			Code:    "INVALID_WB_STOCKS_DATE_FROM",
			Message: "dateFrom must be RFC3339 or YYYY-MM-DD",
		}, true
	default:
		return integrationStocksError{}, false
	}
}
