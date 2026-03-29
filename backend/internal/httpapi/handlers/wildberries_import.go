package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/httpapi/middleware"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

type WildberriesImportHandler struct {
	svc *service.WildberriesImportService
}

func NewWildberriesImportHandler(svc *service.WildberriesImportService) *WildberriesImportHandler {
	return &WildberriesImportHandler{svc: svc}
}

func (h *WildberriesImportHandler) Preview(w http.ResponseWriter, r *http.Request) {
	startedAt := time.Now()
	requestID := middleware.GetRequestID(r.Context())
	shipmentIDStr := chi.URLParam(r, "shipmentId")
	shipmentID, err := parseUUID(shipmentIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SHIPMENT_ID", "invalid shipment id")
		return
	}

	var req dto.WildberriesImportPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.Preview(r.Context(), shipmentID, req)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Str("shipment_id", shipmentID.String()).
			Int64("supply_id", req.SupplyID).
			Str("match_by", req.MatchBy).
			Bool("is_preorder_id", req.IsPreorderID).
			Dur("duration", time.Since(startedAt)).
			Msg("wildberries import preview failed")
		if errors.Is(err, service.ErrWbSuppliesTokenNotConfigured) {
			writeError(w, http.StatusBadRequest, "WB_SUPPLIES_TOKEN_MISSING", "Set WB_SUPPLIES_TOKEN (Supplies category) on the server")
			return
		}
		if err == repository.ErrMpShipmentNotFound {
			writeError(w, http.StatusNotFound, "SHIPMENT_NOT_FOUND", "mp shipment not found")
			return
		}
		writeError(w, http.StatusBadRequest, "WB_PREVIEW_FAILED", err.Error())
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("shipment_id", shipmentID.String()).
		Int64("supply_id", req.SupplyID).
		Str("match_by", req.MatchBy).
		Bool("is_preorder_id", req.IsPreorderID).
		Int("lines", len(out.Lines)).
		Int("unmatched_goods", len(out.UnmatchedGoods)).
		Int("warnings", len(out.Warnings)).
		Dur("duration", time.Since(startedAt)).
		Msg("wildberries import preview completed")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(dto.APIResponse[*dto.WildberriesImportPreviewResponse]{Data: out})
}

func (h *WildberriesImportHandler) Apply(w http.ResponseWriter, r *http.Request) {
	startedAt := time.Now()
	requestID := middleware.GetRequestID(r.Context())
	shipmentIDStr := chi.URLParam(r, "shipmentId")
	shipmentID, err := parseUUID(shipmentIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SHIPMENT_ID", "invalid shipment id")
		return
	}

	var req dto.WildberriesImportApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	out, err := h.svc.Apply(r.Context(), shipmentID, req)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Str("shipment_id", shipmentID.String()).
			Int64("supply_id", req.SupplyID).
			Str("match_by", req.MatchBy).
			Bool("is_preorder_id", req.IsPreorderID).
			Dur("duration", time.Since(startedAt)).
			Msg("wildberries import apply failed")
		if errors.Is(err, service.ErrWbSuppliesTokenNotConfigured) {
			writeError(w, http.StatusBadRequest, "WB_SUPPLIES_TOKEN_MISSING", "Set WB_SUPPLIES_TOKEN (Supplies category) on the server")
			return
		}
		if err == repository.ErrMpShipmentNotFound {
			writeError(w, http.StatusNotFound, "SHIPMENT_NOT_FOUND", "mp shipment not found")
			return
		}
		if err == service.ErrMpShipmentCompleted {
			writeError(w, http.StatusBadRequest, "SHIPMENT_COMPLETED", "Завершённую отгрузку нельзя изменять")
			return
		}
		if err == repository.ErrInvalidQuantity {
			writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "accepted quantity cannot exceed sent quantity")
			return
		}
		writeError(w, http.StatusBadGateway, "WB_APPLY_FAILED", err.Error())
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("shipment_id", shipmentID.String()).
		Int64("supply_id", req.SupplyID).
		Str("match_by", req.MatchBy).
		Bool("is_preorder_id", req.IsPreorderID).
		Int("updated_items", out.UpdatedItems).
		Dur("duration", time.Since(startedAt)).
		Msg("wildberries import apply completed")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(dto.APIResponse[*dto.WildberriesImportApplyResponse]{Data: out})
}
