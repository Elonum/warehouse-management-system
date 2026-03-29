package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"warehouse-backend/internal/dto"
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
		if errors.Is(err, service.ErrWbSuppliesTokenNotConfigured) {
			writeError(w, http.StatusBadRequest, "WB_SUPPLIES_TOKEN_MISSING", "Set WB_SUPPLIES_TOKEN (Supplies category) on the server")
			return
		}
		if err == repository.ErrMpShipmentNotFound {
			writeError(w, http.StatusNotFound, "SHIPMENT_NOT_FOUND", "mp shipment not found")
			return
		}
		log.Warn().Err(err).Msg("Wildberries import preview failed")
		writeError(w, http.StatusBadRequest, "WB_PREVIEW_FAILED", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(dto.APIResponse[*dto.WildberriesImportPreviewResponse]{Data: out})
}

func (h *WildberriesImportHandler) Apply(w http.ResponseWriter, r *http.Request) {
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
		log.Warn().Err(err).Msg("Wildberries import apply failed")
		writeError(w, http.StatusBadGateway, "WB_APPLY_FAILED", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(dto.APIResponse[*dto.WildberriesImportApplyResponse]{Data: out})
}
