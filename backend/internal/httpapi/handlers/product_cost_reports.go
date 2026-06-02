package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"warehouse-backend/internal/dto"

	"github.com/rs/zerolog/log"
)

func (h *ProductCostHandler) ListMissing(w http.ResponseWriter, r *http.Request) {
	var q *string
	if v := strings.TrimSpace(r.URL.Query().Get("q")); v != "" {
		if len(v) > 100 {
			writeError(w, http.StatusBadRequest, "INVALID_QUERY", "q must be at most 100 characters")
			return
		}
		q = &v
	}

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

	out, total, err := h.service.ListMissingCost(r.Context(), q, limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("product costs missing list failed")
		writeError(w, http.StatusInternalServerError, "MISSING_COSTS_LOAD_FAILED", "failed to load products without cost")
		return
	}

	resp := dto.APIResponse[*dto.ProductMissingCostListResponse]{
		Data: out,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
			Total:  total,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *ProductCostHandler) GetDataQuality(w http.ResponseWriter, r *http.Request) {
	out, err := h.service.GetDataQuality(r.Context())
	if err != nil {
		log.Error().Err(err).Msg("product costs data quality failed")
		writeError(w, http.StatusInternalServerError, "DATA_QUALITY_LOAD_FAILED", "failed to load data quality")
		return
	}

	resp := dto.APIResponse[*dto.ProductCostDataQualityResponse]{
		Data: out,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
