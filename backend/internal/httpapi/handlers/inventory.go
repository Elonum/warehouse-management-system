package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

type InventoryHandler struct {
	service *service.InventoryService
}

func NewInventoryHandler(service *service.InventoryService) *InventoryHandler {
	return &InventoryHandler{service: service}
}

func (h *InventoryHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	inventoryID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INVENTORY_ID", "invalid inventory id")
		return
	}

	inventory, err := h.service.GetByID(r.Context(), inventoryID)
	if err != nil {
		if err == repository.ErrInventoryNotFound {
			log.Warn().Str("inventoryId", inventoryID.String()).Msg("Inventory not found")
			writeError(w, http.StatusNotFound, "INVENTORY_NOT_FOUND", "inventory not found")
			return
		}
		log.Error().Err(err).Str("inventoryId", inventoryID.String()).Msg("Failed to load inventory")
		writeError(w, http.StatusInternalServerError, "INVENTORY_LOAD_FAILED", "failed to load inventory")
		return
	}

	response := dto.APIResponse[dto.InventoryResponse]{
		Data: *inventory,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := parseInt(r.URL.Query().Get("limit"), 50)
	offset := parseInt(r.URL.Query().Get("offset"), 0)

	var statusID *uuid.UUID
	if v := r.URL.Query().Get("statusId"); v != "" {
		id, err := parseUUID(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid statusId")
			return
		}
		statusID = &id
	}

	if limit < 1 || limit > 1000 {
		writeError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be between 1 and 1000")
		return
	}
	if offset < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_OFFSET", "offset must be non-negative")
		return
	}

	inventories, err := h.service.List(r.Context(), limit, offset, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("statusId", statusID).Msg("Failed to load inventories")
		writeError(w, http.StatusInternalServerError, "INVENTORIES_LOAD_FAILED", "failed to load inventories")
		return
	}

	response := dto.APIResponse[[]dto.InventoryResponse]{
		Data: inventories,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	var req dto.InventoryCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.StatusID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "statusId is required")
		return
	}

	inventory, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		if err == repository.ErrInventoryExists {
			log.Warn().Str("statusId", req.StatusID).Msg("Inventory already exists")
			writeError(w, http.StatusConflict, "INVENTORY_EXISTS", "inventory already exists")
			return
		}
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Str("statusId", req.StatusID).Msg("Inventory status not found")
			writeError(w, http.StatusBadRequest, "INVENTORY_STATUS_NOT_FOUND", "specified inventory status does not exist")
			return
		}
		log.Error().Err(err).Str("statusId", req.StatusID).Str("userId", userID.String()).Msg("Failed to create inventory")
		writeError(w, http.StatusInternalServerError, "INVENTORY_CREATE_FAILED", "failed to create inventory")
		return
	}

	response := dto.APIResponse[dto.InventoryResponse]{
		Data: *inventory,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	idStr := chi.URLParam(r, "id")
	inventoryID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INVENTORY_ID", "invalid inventory id")
		return
	}

	var req dto.InventoryUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.StatusID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "statusId is required")
		return
	}

	inventory, err := h.service.Update(r.Context(), inventoryID, userID, req)
	if err != nil {
		if err == repository.ErrInventoryNotFound {
			log.Warn().Str("inventoryId", inventoryID.String()).Msg("Inventory not found for update")
			writeError(w, http.StatusNotFound, "INVENTORY_NOT_FOUND", "inventory not found")
			return
		}
		if err == repository.ErrInventoryExists {
			log.Warn().Str("inventoryId", inventoryID.String()).Str("statusId", req.StatusID).Msg("Inventory already exists")
			writeError(w, http.StatusConflict, "INVENTORY_EXISTS", "inventory already exists")
			return
		}
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Str("statusId", req.StatusID).Msg("Inventory status not found")
			writeError(w, http.StatusBadRequest, "INVENTORY_STATUS_NOT_FOUND", "specified inventory status does not exist")
			return
		}
		log.Error().Err(err).Str("inventoryId", inventoryID.String()).Str("userId", userID.String()).Msg("Failed to update inventory")
		writeError(w, http.StatusInternalServerError, "INVENTORY_UPDATE_FAILED", "failed to update inventory")
		return
	}

	response := dto.APIResponse[dto.InventoryResponse]{
		Data: *inventory,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	inventoryID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INVENTORY_ID", "invalid inventory id")
		return
	}

	err = h.service.Delete(r.Context(), inventoryID)
	if err != nil {
		if err == repository.ErrInventoryNotFound {
			log.Warn().Str("inventoryId", inventoryID.String()).Msg("Inventory not found for deletion")
			writeError(w, http.StatusNotFound, "INVENTORY_NOT_FOUND", "inventory not found")
			return
		}
		log.Error().Err(err).Str("inventoryId", inventoryID.String()).Msg("Failed to delete inventory")
		writeError(w, http.StatusInternalServerError, "INVENTORY_DELETE_FAILED", "failed to delete inventory")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
