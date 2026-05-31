package handlers

import (
	"errors"
	"net/http"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/service"
)

type OzonStocksListHandler struct {
	svc *service.OzonStockService
}

func NewOzonStocksListHandler(svc *service.OzonStockService) *OzonStocksListHandler {
	return &OzonStocksListHandler{svc: svc}
}

// List proxies Ozon stocks; данные не сохраняются в БД.
func (h *OzonStocksListHandler) List(w http.ResponseWriter, r *http.Request) {
	requestID, startedAt := integrationRequestContext(r)
	var req dto.OzonStockListRequest
	if err := decodeJSONBodyAllowEmpty(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.List(r.Context(), req)
	if err != nil {
		writeIntegrationStocksFailure(w, "ozon", requestID, startedAt, err, mapOzonStocksError, integrationStocksError{
			Status:  http.StatusBadGateway,
			Code:    "OZON_STOCKS_LIST_FAILED",
			Message: "failed to load stocks from Ozon",
		})
		return
	}

	writeIntegrationStocksSuccess(w, "ozon", requestID, startedAt, out, len(out.Items))
}

func mapOzonStocksError(err error) (integrationStocksError, bool) {
	if errors.Is(err, service.ErrOzonCredentialsNotConfigured) {
		return integrationStocksError{
			Status:  http.StatusBadRequest,
			Code:    "OZON_CREDENTIALS_MISSING",
			Message: "Set OZON_CLIENT_ID and OZON_API_KEY on the server",
		}, true
	}
	return integrationStocksError{}, false
}
