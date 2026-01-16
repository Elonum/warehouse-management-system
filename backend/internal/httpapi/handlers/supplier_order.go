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

type SupplierOrderHandler struct {
	service *service.SupplierOrderService
}

func NewSupplierOrderHandler(service *service.SupplierOrderService) *SupplierOrderHandler {
	return &SupplierOrderHandler{service: service}
}

func (h *SupplierOrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	orderID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	order, err := h.service.GetByID(r.Context(), orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Int("orderId", orderID).Msg("Supplier order not found")
			writeError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "supplier order not found")
			return
		}
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to load supplier order")
		writeError(w, http.StatusInternalServerError, "ORDER_LOAD_FAILED", "failed to load supplier order")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderResponse]{
		Data: *order,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderHandler) List(w http.ResponseWriter, r *http.Request) {
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

	var statusID *int
	if v := r.URL.Query().Get("statusId"); v != "" {
		id, err := strconv.Atoi(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_STATUS_ID", "invalid statusId")
			return
		}
		statusID = &id
	}

	orders, err := h.service.List(r.Context(), limit, offset, statusID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Interface("statusId", statusID).Msg("Failed to load supplier orders")
		writeError(w, http.StatusInternalServerError, "ORDERS_LOAD_FAILED", "failed to load supplier orders")
		return
	}

	response := dto.APIResponse[[]dto.SupplierOrderResponse]{
		Data: orders,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	var req dto.SupplierOrderCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.OrderNumber == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderNumber is required")
		return
	}

	order, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		if err == repository.ErrSupplierOrderExists {
			log.Warn().Str("orderNumber", req.OrderNumber).Msg("Supplier order already exists")
			writeError(w, http.StatusConflict, "ORDER_EXISTS", "supplier order with this orderNumber already exists")
			return
		}
		if err == repository.ErrOrderStatusNotFound {
			log.Warn().Interface("statusId", req.StatusID).Msg("Order status not found")
			writeError(w, http.StatusBadRequest, "ORDER_STATUS_NOT_FOUND", "specified order status does not exist")
			return
		}
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Interface("parentOrderId", req.ParentOrderID).Msg("Parent order not found")
			writeError(w, http.StatusBadRequest, "PARENT_ORDER_NOT_FOUND", "specified parent order does not exist")
			return
		}
		if err == repository.ErrInvalidDateRange {
			log.Warn().Msg("Invalid date range")
			writeError(w, http.StatusBadRequest, "INVALID_DATE_RANGE", "invalid date range: planned receipt date must be after purchase date, actual receipt date must be after planned receipt date")
			return
		}
		log.Error().Err(err).Str("orderNumber", req.OrderNumber).Int("userId", userID).Msg("Failed to create supplier order")
		writeError(w, http.StatusInternalServerError, "ORDER_CREATE_FAILED", "failed to create supplier order")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderResponse]{
		Data: *order,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	idStr := chi.URLParam(r, "id")
	orderID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	var req dto.SupplierOrderUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.OrderNumber == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderNumber is required")
		return
	}

	order, err := h.service.Update(r.Context(), orderID, userID, req)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Int("orderId", orderID).Msg("Supplier order not found for update")
			writeError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "supplier order not found")
			return
		}
		if err == repository.ErrSupplierOrderExists {
			log.Warn().Int("orderId", orderID).Str("orderNumber", req.OrderNumber).Msg("Supplier order with orderNumber already exists")
			writeError(w, http.StatusConflict, "ORDER_EXISTS", "supplier order with this orderNumber already exists")
			return
		}
		if err == repository.ErrOrderStatusNotFound {
			log.Warn().Interface("statusId", req.StatusID).Msg("Order status not found")
			writeError(w, http.StatusBadRequest, "ORDER_STATUS_NOT_FOUND", "specified order status does not exist")
			return
		}
		if err == repository.ErrInvalidParentOrder {
			log.Warn().Int("orderId", orderID).Interface("parentOrderId", req.ParentOrderID).Msg("Order cannot be parent of itself")
			writeError(w, http.StatusBadRequest, "INVALID_PARENT_ORDER", "order cannot be parent of itself")
			return
		}
		if err == repository.ErrInvalidDateRange {
			log.Warn().Msg("Invalid date range")
			writeError(w, http.StatusBadRequest, "INVALID_DATE_RANGE", "invalid date range: planned receipt date must be after purchase date, actual receipt date must be after planned receipt date")
			return
		}
		log.Error().Err(err).Int("orderId", orderID).Int("userId", userID).Msg("Failed to update supplier order")
		writeError(w, http.StatusInternalServerError, "ORDER_UPDATE_FAILED", "failed to update supplier order")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderResponse]{
		Data: *order,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	orderID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	err = h.service.Delete(r.Context(), orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Int("orderId", orderID).Msg("Supplier order not found for deletion")
			writeError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "supplier order not found")
			return
		}
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to delete supplier order")
		writeError(w, http.StatusInternalServerError, "ORDER_DELETE_FAILED", "failed to delete supplier order")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
