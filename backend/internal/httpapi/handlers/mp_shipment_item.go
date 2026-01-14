package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

type MpShipmentItemHandler struct {
	service *service.MpShipmentItemService
}

func NewMpShipmentItemHandler(service *service.MpShipmentItemService) *MpShipmentItemHandler {
	return &MpShipmentItemHandler{service: service}
}

func (h *MpShipmentItemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	item, err := h.service.GetByID(r.Context(), itemID)
	if err != nil {
		if err == repository.ErrMpShipmentItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Mp shipment item not found")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "mp shipment item not found")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to load mp shipment item")
		writeError(w, http.StatusInternalServerError, "ITEM_LOAD_FAILED", "failed to load mp shipment item")
		return
	}

	response := dto.APIResponse[dto.MpShipmentItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentItemHandler) GetByShipmentID(w http.ResponseWriter, r *http.Request) {
	shipmentIDStr := chi.URLParam(r, "shipmentId")
	shipmentID, err := strconv.Atoi(shipmentIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SHIPMENT_ID", "invalid shipment id")
		return
	}

	items, err := h.service.GetByShipmentID(r.Context(), shipmentID)
	if err != nil {
		log.Error().Err(err).Int("shipmentId", shipmentID).Msg("Failed to load mp shipment items")
		writeError(w, http.StatusInternalServerError, "ITEMS_LOAD_FAILED", "failed to load mp shipment items")
		return
	}

	response := dto.APIResponse[[]dto.MpShipmentItemResponse]{
		Data: items,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentItemHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.MpShipmentItemCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.ShipmentID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "shipmentId is required and must be positive")
		return
	}
	if req.ProductID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "productId is required and must be positive")
		return
	}
	if req.WarehouseID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "warehouseId is required and must be positive")
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

	item, err := h.service.Create(r.Context(), req)
	if err != nil {
		log.Error().Err(err).Int("shipmentId", req.ShipmentID).Int("productId", req.ProductID).Msg("Failed to create mp shipment item")
		writeError(w, http.StatusInternalServerError, "ITEM_CREATE_FAILED", "failed to create mp shipment item")
		return
	}

	response := dto.APIResponse[dto.MpShipmentItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentItemHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	var req dto.MpShipmentItemUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.ShipmentID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "shipmentId is required and must be positive")
		return
	}
	if req.ProductID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "productId is required and must be positive")
		return
	}
	if req.WarehouseID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "warehouseId is required and must be positive")
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

	item, err := h.service.Update(r.Context(), itemID, req)
	if err != nil {
		if err == repository.ErrMpShipmentItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Mp shipment item not found for update")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "mp shipment item not found")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to update mp shipment item")
		writeError(w, http.StatusInternalServerError, "ITEM_UPDATE_FAILED", "failed to update mp shipment item")
		return
	}

	response := dto.APIResponse[dto.MpShipmentItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *MpShipmentItemHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	err = h.service.Delete(r.Context(), itemID)
	if err != nil {
		if err == repository.ErrMpShipmentItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Mp shipment item not found for deletion")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "mp shipment item not found")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to delete mp shipment item")
		writeError(w, http.StatusInternalServerError, "ITEM_DELETE_FAILED", "failed to delete mp shipment item")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
