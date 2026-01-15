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

type OrderStatusHandler struct {
	service *service.OrderStatusService
}

func NewOrderStatusHandler(service *service.OrderStatusService) *OrderStatusHandler {
	return &OrderStatusHandler{service: service}
}

func (h *OrderStatusHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	statusID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid status id")
		return
	}

	status, err := h.service.GetByID(r.Context(), statusID)
	if err != nil {
		if err == repository.ErrOrderStatusNotFound {
			log.Warn().Int("statusId", statusID).Msg("Order status not found")
			writeError(w, http.StatusNotFound, "STATUS_NOT_FOUND", "order status not found")
			return
		}
		log.Error().Err(err).Int("statusId", statusID).Msg("Failed to load order status")
		writeError(w, http.StatusInternalServerError, "STATUS_LOAD_FAILED", "failed to load order status")
		return
	}

	response := dto.APIResponse[dto.OrderStatusResponse]{
		Data: *status,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *OrderStatusHandler) List(w http.ResponseWriter, r *http.Request) {
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
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load order statuses")
		writeError(w, http.StatusInternalServerError, "STATUSES_LOAD_FAILED", "failed to load order statuses")
		return
	}

	response := dto.APIResponse[[]dto.OrderStatusResponse]{
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

func (h *OrderStatusHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.OrderStatusCreateRequest
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
		if err == repository.ErrOrderStatusExists {
			log.Warn().Str("name", req.Name).Msg("Order status already exists")
			writeError(w, http.StatusConflict, "STATUS_EXISTS", "order status with this name already exists")
			return
		}
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create order status")
		writeError(w, http.StatusInternalServerError, "STATUS_CREATE_FAILED", "failed to create order status")
		return
	}

	response := dto.APIResponse[dto.OrderStatusResponse]{
		Data: *status,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *OrderStatusHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	statusID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid status id")
		return
	}

	var req dto.OrderStatusUpdateRequest
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
		if err == repository.ErrOrderStatusNotFound {
			log.Warn().Int("statusId", statusID).Msg("Order status not found for update")
			writeError(w, http.StatusNotFound, "STATUS_NOT_FOUND", "order status not found")
			return
		}
		if err == repository.ErrOrderStatusExists {
			log.Warn().Int("statusId", statusID).Str("name", req.Name).Msg("Order status with name already exists")
			writeError(w, http.StatusConflict, "STATUS_EXISTS", "order status with this name already exists")
			return
		}
		log.Error().Err(err).Int("statusId", statusID).Msg("Failed to update order status")
		writeError(w, http.StatusInternalServerError, "STATUS_UPDATE_FAILED", "failed to update order status")
		return
	}

	response := dto.APIResponse[dto.OrderStatusResponse]{
		Data: *status,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *OrderStatusHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	statusID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid status id")
		return
	}

	err = h.service.Delete(r.Context(), statusID)
	if err != nil {
		if err == repository.ErrOrderStatusNotFound {
			log.Warn().Int("statusId", statusID).Msg("Order status not found for deletion")
			writeError(w, http.StatusNotFound, "STATUS_NOT_FOUND", "order status not found")
			return
		}
		log.Error().Err(err).Int("statusId", statusID).Msg("Failed to delete order status")
		writeError(w, http.StatusInternalServerError, "STATUS_DELETE_FAILED", "failed to delete order status")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
