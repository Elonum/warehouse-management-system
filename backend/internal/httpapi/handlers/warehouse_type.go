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

type WarehouseTypeHandler struct {
	service *service.WarehouseTypeService
}

func NewWarehouseTypeHandler(service *service.WarehouseTypeService) *WarehouseTypeHandler {
	return &WarehouseTypeHandler{service: service}
}

func (h *WarehouseTypeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	warehouseTypeID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_TYPE_ID", "invalid warehouse type id")
		return
	}

	warehouseType, err := h.service.GetByID(r.Context(), warehouseTypeID)
	if err != nil {
		if err == repository.ErrWarehouseTypeNotFound {
			log.Warn().Int("warehouseTypeId", warehouseTypeID).Msg("Warehouse type not found")
			writeError(w, http.StatusNotFound, "WAREHOUSE_TYPE_NOT_FOUND", "warehouse type not found")
			return
		}
		log.Error().Err(err).Int("warehouseTypeId", warehouseTypeID).Msg("Failed to load warehouse type")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_TYPE_LOAD_FAILED", "failed to load warehouse type")
		return
	}

	response := dto.APIResponse[dto.WarehouseTypeResponse]{
		Data: *warehouseType,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseTypeHandler) List(w http.ResponseWriter, r *http.Request) {
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

	warehouseTypes, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load warehouse types")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_TYPES_LOAD_FAILED", "failed to load warehouse types")
		return
	}

	response := dto.APIResponse[[]dto.WarehouseTypeResponse]{
		Data: warehouseTypes,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseTypeHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.WarehouseTypeCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	warehouseType, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrWarehouseTypeExists {
			log.Warn().Str("name", req.Name).Msg("Warehouse type already exists")
			writeError(w, http.StatusConflict, "WAREHOUSE_TYPE_EXISTS", "warehouse type with this name already exists")
			return
		}
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create warehouse type")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_TYPE_CREATE_FAILED", "failed to create warehouse type")
		return
	}

	response := dto.APIResponse[dto.WarehouseTypeResponse]{
		Data: *warehouseType,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseTypeHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	warehouseTypeID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_TYPE_ID", "invalid warehouse type id")
		return
	}

	var req dto.WarehouseTypeUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	warehouseType, err := h.service.Update(r.Context(), warehouseTypeID, req)
	if err != nil {
		if err == repository.ErrWarehouseTypeNotFound {
			log.Warn().Int("warehouseTypeId", warehouseTypeID).Msg("Warehouse type not found for update")
			writeError(w, http.StatusNotFound, "WAREHOUSE_TYPE_NOT_FOUND", "warehouse type not found")
			return
		}
		if err == repository.ErrWarehouseTypeExists {
			log.Warn().Int("warehouseTypeId", warehouseTypeID).Str("name", req.Name).Msg("Warehouse type with name already exists")
			writeError(w, http.StatusConflict, "WAREHOUSE_TYPE_EXISTS", "warehouse type with this name already exists")
			return
		}
		log.Error().Err(err).Int("warehouseTypeId", warehouseTypeID).Msg("Failed to update warehouse type")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_TYPE_UPDATE_FAILED", "failed to update warehouse type")
		return
	}

	response := dto.APIResponse[dto.WarehouseTypeResponse]{
		Data: *warehouseType,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *WarehouseTypeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	warehouseTypeID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_WAREHOUSE_TYPE_ID", "invalid warehouse type id")
		return
	}

	err = h.service.Delete(r.Context(), warehouseTypeID)
	if err != nil {
		if err == repository.ErrWarehouseTypeNotFound {
			log.Warn().Int("warehouseTypeId", warehouseTypeID).Msg("Warehouse type not found for deletion")
			writeError(w, http.StatusNotFound, "WAREHOUSE_TYPE_NOT_FOUND", "warehouse type not found")
			return
		}
		log.Error().Err(err).Int("warehouseTypeId", warehouseTypeID).Msg("Failed to delete warehouse type")
		writeError(w, http.StatusInternalServerError, "WAREHOUSE_TYPE_DELETE_FAILED", "failed to delete warehouse type")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
