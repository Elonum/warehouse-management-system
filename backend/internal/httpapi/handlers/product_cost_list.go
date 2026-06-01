package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"warehouse-backend/internal/dto"

	"github.com/rs/zerolog/log"
)

func (h *ProductCostHandler) List(w http.ResponseWriter, r *http.Request) {
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

	view := strings.TrimSpace(r.URL.Query().Get("view"))
	activeOnly := view == "active"
	if view != "" && view != "journal" && view != "active" {
		writeError(w, http.StatusBadRequest, "INVALID_VIEW", "view must be journal or active")
		return
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

	out, err := h.service.ListPage(r.Context(), productID, q, dateFrom, dateTo, activeOnly, limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("product costs list failed")
		writeError(w, http.StatusInternalServerError, "COSTS_LOAD_FAILED", "failed to load product costs")
		return
	}

	resp := dto.APIResponse[*dto.ProductCostListResponse]{
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
