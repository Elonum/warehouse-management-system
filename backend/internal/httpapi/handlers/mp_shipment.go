package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

type MpShipmentHandler struct {
	service *service.MpShipmentService
}

func NewMpShipmentHandler(service *service.MpShipmentService) *MpShipmentHandler {
	return &MpShipmentHandler{service: service}
}

func (h *MpShipmentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	shipmentID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SHIPMENT_ID", "invalid shipment id")
		return
	}

	shipment, err := h.service.GetByID(r.Context(), shipmentID)
	if err != nil {
		if err == repository.ErrMpShipmentNotFound {
			log.Warn().Int("shipmentId", shipmentID).Msg("Mp shipment not found")
			writeError(w, http.StatusNotFound, "SHIPMENT_NOT_FOUND", "mp shipment not found")
			return
		}
		log.Error().Err(err).Int("shipmentId", shipmentID).Msg("Failed to load mp shipment")
		writeError(w, http.StatusInternalServerError, "SHIPMENT_LOAD_FAILED", "failed to load mp shipment")
		return
	}

	response := dto.APIResponse[dto.MpShipmentResponse]{
		Data: *shipment,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := parseInt(r.URL.Query().Get("limit"), 50)
	offset := parseInt(r.URL.Query().Get("offset"), 0)

	if limit < 1 || limit > 1000 {
		writeError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be between 1 and 1000")
		return
	}
	if offset < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_OFFSET", "offset must be non-negative")
		return
	}

	var storeID, warehouseID, statusID *int
	if v := r.URL.Query().Get("storeId"); v != "" {
		id, err := strconv.Atoi(v)
		if err == nil {
			storeID = &id
		}
	}
	if v := r.URL.Query().Get("warehouseId"); v != "" {
		id, err := strconv.Atoi(v)
		if err == nil {
			warehouseID = &id
		}
	}
	if v := r.URL.Query().Get("statusId"); v != "" {
		id, err := strconv.Atoi(v)
		if err == nil {
			statusID = &id
		}
	}

	shipments, err := h.service.List(r.Context(), limit, offset, storeID, warehouseID, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("storeId", storeID).Interface("warehouseId", warehouseID).
			Interface("statusId", statusID).Msg("Failed to load mp shipments")
		writeError(w, http.StatusInternalServerError, "SHIPMENTS_LOAD_FAILED", "failed to load mp shipments")
		return
	}

	response := dto.APIResponse[[]dto.MpShipmentResponse]{
		Data: shipments,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	var req dto.MpShipmentCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.ShipmentNumber == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "shipmentNumber is required")
		return
	}
	if req.PositionsQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "positionsQty must be non-negative")
		return
	}
	if req.SentQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "sentQty must be non-negative")
		return
	}
	if req.AcceptedQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "acceptedQty must be non-negative")
		return
	}

	shipment, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		if err == repository.ErrMpShipmentExists {
			log.Warn().Str("shipmentNumber", req.ShipmentNumber).Msg("Mp shipment already exists")
			writeError(w, http.StatusConflict, "SHIPMENT_EXISTS", "mp shipment with this shipmentNumber already exists")
			return
		}
		log.Error().Err(err).Str("shipmentNumber", req.ShipmentNumber).Int("userId", userID).Msg("Failed to create mp shipment")
		writeError(w, http.StatusInternalServerError, "SHIPMENT_CREATE_FAILED", "failed to create mp shipment")
		return
	}

	response := dto.APIResponse[dto.MpShipmentResponse]{
		Data: *shipment,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	idStr := chi.URLParam(r, "id")
	shipmentID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SHIPMENT_ID", "invalid shipment id")
		return
	}

	var req dto.MpShipmentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.ShipmentNumber == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "shipmentNumber is required")
		return
	}
	if req.PositionsQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "positionsQty must be non-negative")
		return
	}
	if req.SentQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "sentQty must be non-negative")
		return
	}
	if req.AcceptedQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "acceptedQty must be non-negative")
		return
	}

	shipment, err := h.service.Update(r.Context(), shipmentID, userID, req)
	if err != nil {
		if err == repository.ErrMpShipmentNotFound {
			log.Warn().Int("shipmentId", shipmentID).Msg("Mp shipment not found for update")
			writeError(w, http.StatusNotFound, "SHIPMENT_NOT_FOUND", "mp shipment not found")
			return
		}
		if err == repository.ErrMpShipmentExists {
			log.Warn().Int("shipmentId", shipmentID).Str("shipmentNumber", req.ShipmentNumber).Msg("Mp shipment with shipmentNumber already exists")
			writeError(w, http.StatusConflict, "SHIPMENT_EXISTS", "mp shipment with this shipmentNumber already exists")
			return
		}
		log.Error().Err(err).Int("shipmentId", shipmentID).Int("userId", userID).Msg("Failed to update mp shipment")
		writeError(w, http.StatusInternalServerError, "SHIPMENT_UPDATE_FAILED", "failed to update mp shipment")
		return
	}

	response := dto.APIResponse[dto.MpShipmentResponse]{
		Data: *shipment,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	shipmentID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SHIPMENT_ID", "invalid shipment id")
		return
	}

	err = h.service.Delete(r.Context(), shipmentID)
	if err != nil {
		if err == repository.ErrMpShipmentNotFound {
			log.Warn().Int("shipmentId", shipmentID).Msg("Mp shipment not found for deletion")
			writeError(w, http.StatusNotFound, "SHIPMENT_NOT_FOUND", "mp shipment not found")
			return
		}
		log.Error().Err(err).Int("shipmentId", shipmentID).Msg("Failed to delete mp shipment")
		writeError(w, http.StatusInternalServerError, "SHIPMENT_DELETE_FAILED", "failed to delete mp shipment")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
