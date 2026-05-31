package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/httpapi/middleware"
	"warehouse-backend/internal/integration/integrationlog"

	"github.com/rs/zerolog/log"
)

type integrationStocksError struct {
	Status  int
	Code    string
	Message string
}

func writeIntegrationStocksSuccess[T any](
	w http.ResponseWriter,
	integration string,
	requestID string,
	startedAt time.Time,
	out *T,
	itemCount int,
) {
	log.Info().
		Str("integration", integration).
		Str("request_id", requestID).
		Int("items", itemCount).
		Dur("duration", time.Since(startedAt)).
		Msg(integration + " stocks list completed")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[*T]{Data: out})
}

func writeIntegrationStocksFailure(
	w http.ResponseWriter,
	integration string,
	requestID string,
	startedAt time.Time,
	err error,
	mapErr func(error) (integrationStocksError, bool),
	fallback integrationStocksError,
) {
	log.Warn().
		Err(err).
		Str("integration", integration).
		Str("request_id", requestID).
		Str("error_detail", integrationlog.Truncate(err.Error(), 800)).
		Dur("duration", time.Since(startedAt)).
		Msg(integration + " stocks list failed")

	if mapped, ok := mapErr(err); ok {
		writeError(w, mapped.Status, mapped.Code, mapped.Message)
		return
	}
	writeError(w, fallback.Status, fallback.Code, fallback.Message)
}

func integrationRequestContext(r *http.Request) (requestID string, startedAt time.Time) {
	return middleware.GetRequestID(r.Context()), time.Now()
}
