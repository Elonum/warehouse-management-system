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

type StoreHandler struct {
	service *service.StoreService
}

func NewStoreHandler(service *service.StoreService) *StoreHandler {
	return &StoreHandler{service: service}
}

func (h *StoreHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	storeID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STORE_ID", "invalid store id")
		return
	}

	store, err := h.service.GetByID(r.Context(), storeID)
	if err != nil {
		if err == repository.ErrStoreNotFound {
			log.Warn().Str("storeId", storeID.String()).Msg("Store not found")
			writeError(w, http.StatusNotFound, "STORE_NOT_FOUND", "store not found")
			return
		}
		log.Error().Err(err).Str("storeId", storeID.String()).Msg("Failed to load store")
		writeError(w, http.StatusInternalServerError, "STORE_LOAD_FAILED", "failed to load store")
		return
	}

	response := dto.APIResponse[dto.StoreResponse]{
		Data: *store,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *StoreHandler) List(w http.ResponseWriter, r *http.Request) {
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

	stores, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load stores")
		writeError(w, http.StatusInternalServerError, "STORES_LOAD_FAILED", "failed to load stores")
		return
	}

	response := dto.APIResponse[[]dto.StoreResponse]{
		Data: stores,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *StoreHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.StoreCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	store, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrStoreExists {
			log.Warn().Str("name", req.Name).Msg("Store already exists")
			writeError(w, http.StatusConflict, "STORE_EXISTS", "store with this name already exists")
			return
		}
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create store")
		writeError(w, http.StatusInternalServerError, "STORE_CREATE_FAILED", "failed to create store")
		return
	}

	response := dto.APIResponse[dto.StoreResponse]{
		Data: *store,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *StoreHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	storeID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STORE_ID", "invalid store id")
		return
	}

	var req dto.StoreUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	store, err := h.service.Update(r.Context(), storeID, req)
	if err != nil {
		if err == repository.ErrStoreNotFound {
			log.Warn().Str("storeId", storeID.String()).Msg("Store not found for update")
			writeError(w, http.StatusNotFound, "STORE_NOT_FOUND", "store not found")
			return
		}
		if err == repository.ErrStoreExists {
			log.Warn().Str("storeId", storeID.String()).Str("name", req.Name).Msg("Store with name already exists")
			writeError(w, http.StatusConflict, "STORE_EXISTS", "store with this name already exists")
			return
		}
		log.Error().Err(err).Str("storeId", storeID.String()).Msg("Failed to update store")
		writeError(w, http.StatusInternalServerError, "STORE_UPDATE_FAILED", "failed to update store")
		return
	}

	response := dto.APIResponse[dto.StoreResponse]{
		Data: *store,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *StoreHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	storeID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STORE_ID", "invalid store id")
		return
	}

	err = h.service.Delete(r.Context(), storeID)
	if err != nil {
		if err == repository.ErrStoreNotFound {
			log.Warn().Str("storeId", storeID.String()).Msg("Store not found for deletion")
			writeError(w, http.StatusNotFound, "STORE_NOT_FOUND", "store not found")
			return
		}
		log.Error().Err(err).Str("storeId", storeID.String()).Msg("Failed to delete store")
		writeError(w, http.StatusInternalServerError, "STORE_DELETE_FAILED", "failed to delete store")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
