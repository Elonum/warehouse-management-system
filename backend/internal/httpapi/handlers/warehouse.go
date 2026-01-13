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

type WarehouseHandler struct {
	service *service.WarehouseService
}

func NewWarehouseHandler(service *service.WarehouseService) *WarehouseHandler {
	return &WarehouseHandler{service: service}
}

func (h *WarehouseHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	warehouseID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_ID", "invalid warehouse id")
		return
	}

	warehouse, err := h.service.GetByID(r.Context(), warehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", warehouseID).Msg("Warehouse not found")
			writeError(w, http.StatusNotFound, "WAREHOUSE_NOT_FOUND", "warehouse not found")
			return
		}
		log.Error().Err(err).Int("warehouseId", warehouseID).Msg("Failed to load warehouse")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_LOAD_FAILED", "failed to load warehouse")
		return
	}

	response := dto.APIResponse[dto.WarehouseResponse]{
		Data: *warehouse,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseHandler) List(w http.ResponseWriter, r *http.Request) {
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

	warehouses, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load warehouses")
		writeError(w, http.StatusInternalServerError, "WAREHOUSES_LOAD_FAILED", "failed to load warehouses")
		return
	}

	response := dto.APIResponse[[]dto.WarehouseResponse]{
		Data: warehouses,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.WarehouseCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	warehouse, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrWarehouseExists {
			log.Warn().Str("name", req.Name).Msg("Warehouse already exists")
			writeError(w, http.StatusConflict, "WAREHOUSE_EXISTS", "warehouse with this name already exists")
			return
		}
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create warehouse")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_CREATE_FAILED", "failed to create warehouse")
		return
	}

	response := dto.APIResponse[dto.WarehouseResponse]{
		Data: *warehouse,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	warehouseID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_ID", "invalid warehouse id")
		return
	}

	var req dto.WarehouseUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	warehouse, err := h.service.Update(r.Context(), warehouseID, req)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", warehouseID).Msg("Warehouse not found for update")
			writeError(w, http.StatusNotFound, "WAREHOUSE_NOT_FOUND", "warehouse not found")
			return
		}
		if err == repository.ErrWarehouseExists {
			log.Warn().Int("warehouseId", warehouseID).Str("name", req.Name).Msg("Warehouse with name already exists")
			writeError(w, http.StatusConflict, "WAREHOUSE_EXISTS", "warehouse with this name already exists")
			return
		}
		log.Error().Err(err).Int("warehouseId", warehouseID).Msg("Failed to update warehouse")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_UPDATE_FAILED", "failed to update warehouse")
		return
	}

	response := dto.APIResponse[dto.WarehouseResponse]{
		Data: *warehouse,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	warehouseID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_ID", "invalid warehouse id")
		return
	}

	err = h.service.Delete(r.Context(), warehouseID)
	if err != nil {
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", warehouseID).Msg("Warehouse not found for deletion")
			writeError(w, http.StatusNotFound, "WAREHOUSE_NOT_FOUND", "warehouse not found")
			return
		}
		log.Error().Err(err).Int("warehouseId", warehouseID).Msg("Failed to delete warehouse")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_DELETE_FAILED", "failed to delete warehouse")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
