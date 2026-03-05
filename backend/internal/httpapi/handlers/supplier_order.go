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

type SupplierOrderHandler struct {
	service            *service.SupplierOrderService
	itemService        *service.SupplierOrderItemService
}

func NewSupplierOrderHandler(service *service.SupplierOrderService, itemService *service.SupplierOrderItemService) *SupplierOrderHandler {
	return &SupplierOrderHandler{
		service:     service,
		itemService: itemService,
	}
}

func (h *SupplierOrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	orderID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	order, err := h.service.GetByID(r.Context(), orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", orderID.String()).Msg("Supplier order not found")
			writeError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "supplier order not found")
			return
		}
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load supplier order")
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

	var statusID *uuid.UUID
	if v := r.URL.Query().Get("statusId"); v != "" {
		id, err := parseUUID(v)
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
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	var req dto.SupplierOrderCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
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
		log.Error().Err(err).Str("orderNumber", req.OrderNumber).Str("userId", userID.String()).Msg("Failed to create supplier order")
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
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	idStr := chi.URLParam(r, "id")
	orderID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	var req dto.SupplierOrderUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	// Get old order to check if logistics or weight changed
	oldOrder, err := h.service.GetByID(r.Context(), orderID)
	if err != nil && err != repository.ErrSupplierOrderNotFound {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to load old order for comparison")
		writeError(w, http.StatusInternalServerError, "ORDER_LOAD_FAILED", "failed to load order")
		return
	}

	order, err := h.service.Update(r.Context(), orderID, userID, req)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", orderID.String()).Msg("Supplier order not found for update")
			writeError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "supplier order not found")
			return
		}
		if err == repository.ErrSupplierOrderExists {
			log.Warn().Str("orderId", orderID.String()).Str("orderNumber", req.OrderNumber).Msg("Supplier order with orderNumber already exists")
			writeError(w, http.StatusConflict, "ORDER_EXISTS", "supplier order with this orderNumber already exists")
			return
		}
		if err == repository.ErrOrderStatusNotFound {
			log.Warn().Interface("statusId", req.StatusID).Msg("Order status not found")
			writeError(w, http.StatusBadRequest, "ORDER_STATUS_NOT_FOUND", "specified order status does not exist")
			return
		}
		if err == repository.ErrInvalidParentOrder {
			log.Warn().Str("orderId", orderID.String()).Interface("parentOrderId", req.ParentOrderID).Msg("Order cannot be parent of itself")
			writeError(w, http.StatusBadRequest, "INVALID_PARENT_ORDER", "order cannot be parent of itself")
			return
		}
		if err == repository.ErrInvalidDateRange {
			log.Warn().Msg("Invalid date range")
			writeError(w, http.StatusBadRequest, "INVALID_DATE_RANGE", "invalid date range: planned receipt date must be after purchase date, actual receipt date must be after planned receipt date")
			return
		}
		log.Error().Err(err).Str("orderId", orderID.String()).Str("userId", userID.String()).Msg("Failed to update supplier order")
		writeError(w, http.StatusInternalServerError, "ORDER_UPDATE_FAILED", "failed to update supplier order")
		return
	}

	// Recalculate logistics for all items if logistics_total or order_item_weight changed
	if oldOrder != nil {
		logisticsChanged := (req.LogisticsTotal != nil && oldOrder.LogisticsTotal != nil && *req.LogisticsTotal != *oldOrder.LogisticsTotal) ||
			(req.LogisticsTotal != nil && oldOrder.LogisticsTotal == nil) ||
			(req.LogisticsTotal == nil && oldOrder.LogisticsTotal != nil)
		weightChanged := (req.OrderItemWeight != nil && oldOrder.OrderItemWeight != nil && *req.OrderItemWeight != *oldOrder.OrderItemWeight) ||
			(req.OrderItemWeight != nil && oldOrder.OrderItemWeight == nil) ||
			(req.OrderItemWeight == nil && oldOrder.OrderItemWeight != nil)

		if logisticsChanged || weightChanged {
			if recalcErr := h.itemService.RecalculateLogisticsForAllItems(r.Context(), orderID); recalcErr != nil {
				log.Warn().Err(recalcErr).Str("orderId", orderID.String()).Msg("Failed to recalculate logistics for order items after order update")
				// Don't fail the request, just log the warning
			}
		}
	}

	response := dto.APIResponse[dto.SupplierOrderResponse]{
		Data: *order,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// CreateSubOrder creates a new sub-order for an existing parent order and,
// optionally, transfers a subset of items from the parent into the new sub-order.
func (h *SupplierOrderHandler) CreateSubOrder(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	parentIDStr := chi.URLParam(r, "orderId")
	parentOrderID, err := parseUUID(parentIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid parent order id")
		return
	}

	var req dto.SupplierSubOrderCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	// First create the sub-order shell (without items).
	subOrder, err := h.service.CreateSubOrder(r.Context(), userID, parentOrderID, req)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("parentOrderId", parentOrderID.String()).Msg("Parent supplier order not found for sub-order creation")
			writeError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "parent supplier order not found")
			return
		}
		if err == repository.ErrOrderStatusNotFound {
			log.Warn().Interface("statusId", req.StatusID).Msg("Order status not found for sub-order")
			writeError(w, http.StatusBadRequest, "ORDER_STATUS_NOT_FOUND", "specified order status does not exist")
			return
		}
		if err == repository.ErrInvalidDateRange {
			log.Warn().Msg("Invalid date range for sub-order")
			writeError(w, http.StatusBadRequest, "INVALID_DATE_RANGE", "invalid date range: planned receipt date must be after purchase date, actual receipt date must be after planned receipt date")
			return
		}
		log.Error().
			Err(err).
			Str("parentOrderId", parentOrderID.String()).
			Str("userId", userID.String()).
			Msg("Failed to create supplier sub-order")
		writeError(w, http.StatusInternalServerError, "ORDER_CREATE_FAILED", "failed to create supplier sub-order")
		return
	}

	// Then transfer items, if requested.
	if len(req.ItemsToMove) > 0 {
		subOrderID, parseErr := uuid.Parse(subOrder.OrderID)
		if parseErr != nil {
			log.Error().
				Err(parseErr).
				Str("subOrderId", subOrder.OrderID).
				Msg("Failed to parse sub-order ID for item transfer")
			writeError(w, http.StatusInternalServerError, "SUBORDER_TRANSFER_FAILED", "failed to transfer items to sub-order")
			return
		}

		if err := h.itemService.TransferItemsToSubOrder(r.Context(), parentOrderID, subOrderID, userID, req.ItemsToMove); err != nil {
			if err == repository.ErrSupplierOrderItemNotFound {
				log.Warn().
					Str("parentOrderId", parentOrderID.String()).
					Msg("One or more parent order items not found for transfer to sub-order")
				writeError(w, http.StatusBadRequest, "ORDER_ITEM_NOT_FOUND", "one or more order items to transfer were not found")
				return
			}
			if err == repository.ErrInvalidQuantity {
				log.Warn().
					Str("parentOrderId", parentOrderID.String()).
					Msg("Invalid quantity requested for transfer to sub-order")
				writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "invalid quantity requested for transfer to sub-order")
				return
			}

			log.Error().
				Err(err).
				Str("parentOrderId", parentOrderID.String()).
				Str("subOrderId", subOrderID.String()).
				Msg("Failed to transfer items to sub-order")
			writeError(w, http.StatusInternalServerError, "SUBORDER_TRANSFER_FAILED", "failed to transfer items to sub-order")
			return
		}
	}

	response := dto.APIResponse[dto.SupplierOrderResponse]{
		Data: *subOrder,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	orderID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	err = h.service.Delete(r.Context(), orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", orderID.String()).Msg("Supplier order not found for deletion")
			writeError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "supplier order not found")
			return
		}
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to delete supplier order")
		writeError(w, http.StatusInternalServerError, "ORDER_DELETE_FAILED", "failed to delete supplier order")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
