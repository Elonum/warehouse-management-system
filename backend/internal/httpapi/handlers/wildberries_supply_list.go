package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"warehouse-backend/internal/dto"
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
	var req dto.WildberriesSupplyListRequest
	dec := json.NewDecoder(r.Body)
	if err := decodeWbSupplyListRequest(dec, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.List(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrWbSuppliesTokenNotConfigured) {
			writeError(w, http.StatusBadRequest, "WB_SUPPLIES_TOKEN_MISSING", "Set WB_SUPPLIES_TOKEN (Supplies category) on the server")
			return
		}
		if errors.Is(err, service.ErrWbSupplyListInvalidParams) {
			writeError(w, http.StatusBadRequest, "INVALID_SUPPLY_LIST_PARAMS", "limit must be 1–1000 or 0 for default; offset must be non-negative")
			return
		}
		log.Warn().Err(err).Msg("Wildberries supplies list failed")
		writeError(w, http.StatusBadGateway, "WB_SUPPLIES_LIST_FAILED", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(dto.APIResponse[*dto.WildberriesSupplyListResponse]{Data: out})
}

func decodeWbSupplyListRequest(dec *json.Decoder, req *dto.WildberriesSupplyListRequest) error {
	if err := dec.Decode(req); err != nil {
		if errors.Is(err, io.EOF) {
			*req = dto.WildberriesSupplyListRequest{}
			return nil
		}
		return err
	}
	return nil
}
