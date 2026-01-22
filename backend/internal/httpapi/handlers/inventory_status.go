package handlers

import (
	"encoding/json"
	"net/http"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

type InventoryStatusHandler struct {
	service *service.InventoryStatusService
}

func NewInventoryStatusHandler(service *service.InventoryStatusService) *InventoryStatusHandler {
	return &InventoryStatusHandler{service: service}
}

func (h *InventoryStatusHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	statusID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid status id")
		return
	}

	status, err := h.service.GetByID(r.Context(), statusID)
	if err != nil {
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Str("statusId", statusID.String()).Msg("Inventory status not found")
			writeError(w, http.StatusNotFound, "STATUS_NOT_FOUND", "inventory status not found")
			return
		}
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to load inventory status")
		writeError(w, http.StatusInternalServerError, "STATUS_LOAD_FAILED", "failed to load inventory status")
		return
	}

	response := dto.APIResponse[dto.InventoryStatusResponse]{
		Data: *status,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryStatusHandler) List(w http.ResponseWriter, r *http.Request) {
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

	statuses, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load inventory statuses")
		writeError(w, http.StatusInternalServerError, "STATUSES_LOAD_FAILED", "failed to load inventory statuses")
		return
	}

	response := dto.APIResponse[[]dto.InventoryStatusResponse]{
		Data: statuses,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryStatusHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.InventoryStatusCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	status, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrInventoryStatusExists {
			log.Warn().Str("name", req.Name).Msg("Inventory status already exists")
			writeError(w, http.StatusConflict, "STATUS_EXISTS", "inventory status with this name already exists")
			return
		}
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create inventory status")
		writeError(w, http.StatusInternalServerError, "STATUS_CREATE_FAILED", "failed to create inventory status")
		return
	}

	response := dto.APIResponse[dto.InventoryStatusResponse]{
		Data: *status,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryStatusHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	statusID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid status id")
		return
	}

	var req dto.InventoryStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	status, err := h.service.Update(r.Context(), statusID, req)
	if err != nil {
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Str("statusId", statusID.String()).Msg("Inventory status not found for update")
			writeError(w, http.StatusNotFound, "STATUS_NOT_FOUND", "inventory status not found")
			return
		}
		if err == repository.ErrInventoryStatusExists {
			log.Warn().Str("statusId", statusID.String()).Str("name", req.Name).Msg("Inventory status with name already exists")
			writeError(w, http.StatusConflict, "STATUS_EXISTS", "inventory status with this name already exists")
			return
		}
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to update inventory status")
		writeError(w, http.StatusInternalServerError, "STATUS_UPDATE_FAILED", "failed to update inventory status")
		return
	}

	response := dto.APIResponse[dto.InventoryStatusResponse]{
		Data: *status,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryStatusHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	statusID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid status id")
		return
	}

	err = h.service.Delete(r.Context(), statusID)
	if err != nil {
		if err == repository.ErrInventoryStatusNotFound {
			log.Warn().Str("statusId", statusID.String()).Msg("Inventory status not found for deletion")
			writeError(w, http.StatusNotFound, "STATUS_NOT_FOUND", "inventory status not found")
			return
		}
		log.Error().Err(err).Str("statusId", statusID.String()).Msg("Failed to delete inventory status")
		writeError(w, http.StatusInternalServerError, "STATUS_DELETE_FAILED", "failed to delete inventory status")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
