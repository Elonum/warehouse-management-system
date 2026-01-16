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

type SupplierOrderItemHandler struct {
	service *service.SupplierOrderItemService
}

func NewSupplierOrderItemHandler(service *service.SupplierOrderItemService) *SupplierOrderItemHandler {
	return &SupplierOrderItemHandler{service: service}
}

func (h *SupplierOrderItemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	item, err := h.service.GetByID(r.Context(), itemID)
	if err != nil {
		if err == repository.ErrSupplierOrderItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Supplier order item not found")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "supplier order item not found")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to load supplier order item")
		writeError(w, http.StatusInternalServerError, "ITEM_LOAD_FAILED", "failed to load supplier order item")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderItemHandler) GetByOrderID(w http.ResponseWriter, r *http.Request) {
	orderIDStr := chi.URLParam(r, "orderId")
	orderID, err := strconv.Atoi(orderIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	items, err := h.service.GetByOrderID(r.Context(), orderID)
	if err != nil {
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to load supplier order items")
		writeError(w, http.StatusInternalServerError, "ITEMS_LOAD_FAILED", "failed to load supplier order items")
		return
	}

	response := dto.APIResponse[[]dto.SupplierOrderItemResponse]{
		Data: items,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderItemHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	var req dto.SupplierOrderItemCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.OrderID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required and must be positive")
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
	if req.OrderedQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderedQty must be non-negative")
		return
	}
	if req.ReceivedQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "receivedQty must be non-negative")
		return
	}
	if req.TotalWeight < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "totalWeight must be non-negative")
		return
	}

	item, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		if err == repository.ErrSupplierOrderItemExists {
			log.Warn().Int("orderId", req.OrderID).Int("productId", req.ProductID).Msg("Supplier order item already exists")
			writeError(w, http.StatusConflict, "ITEM_EXISTS", "supplier order item already exists")
			return
		}
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Int("orderId", req.OrderID).Msg("Supplier order not found")
			writeError(w, http.StatusBadRequest, "ORDER_NOT_FOUND", "specified supplier order does not exist")
			return
		}
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
			return
		}
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			writeError(w, http.StatusBadRequest, "WAREHOUSE_NOT_FOUND", "specified warehouse does not exist")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Int("orderedQty", req.OrderedQty).Int("receivedQty", req.ReceivedQty).Msg("Invalid quantity")
			writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "received quantity cannot exceed ordered quantity")
			return
		}
		log.Error().Err(err).Int("orderId", req.OrderID).Int("productId", req.ProductID).Int("userId", userID).Msg("Failed to create supplier order item")
		writeError(w, http.StatusInternalServerError, "ITEM_CREATE_FAILED", "failed to create supplier order item")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderItemHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	var req dto.SupplierOrderItemUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.OrderID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required and must be positive")
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
	if req.OrderedQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderedQty must be non-negative")
		return
	}
	if req.ReceivedQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "receivedQty must be non-negative")
		return
	}
	if req.TotalWeight < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "totalWeight must be non-negative")
		return
	}

	item, err := h.service.Update(r.Context(), itemID, userID, req)
	if err != nil {
		if err == repository.ErrSupplierOrderItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Supplier order item not found for update")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "supplier order item not found")
			return
		}
		if err == repository.ErrSupplierOrderItemExists {
			log.Warn().Int("itemId", itemID).Int("orderId", req.OrderID).Int("productId", req.ProductID).Msg("Supplier order item already exists")
			writeError(w, http.StatusConflict, "ITEM_EXISTS", "supplier order item already exists")
			return
		}
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Int("orderId", req.OrderID).Msg("Supplier order not found")
			writeError(w, http.StatusBadRequest, "ORDER_NOT_FOUND", "specified supplier order does not exist")
			return
		}
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
			return
		}
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			writeError(w, http.StatusBadRequest, "WAREHOUSE_NOT_FOUND", "specified warehouse does not exist")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Int("orderedQty", req.OrderedQty).Int("receivedQty", req.ReceivedQty).Msg("Invalid quantity")
			writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "received quantity cannot exceed ordered quantity")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Int("userId", userID).Msg("Failed to update supplier order item")
		writeError(w, http.StatusInternalServerError, "ITEM_UPDATE_FAILED", "failed to update supplier order item")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderItemHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	err = h.service.Delete(r.Context(), itemID)
	if err != nil {
		if err == repository.ErrSupplierOrderItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Supplier order item not found for deletion")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "supplier order item not found")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to delete supplier order item")
		writeError(w, http.StatusInternalServerError, "ITEM_DELETE_FAILED", "failed to delete supplier order item")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
