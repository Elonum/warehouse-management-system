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

type InventoryItemHandler struct {
	service *service.InventoryItemService
}

func NewInventoryItemHandler(service *service.InventoryItemService) *InventoryItemHandler {
	return &InventoryItemHandler{service: service}
}

func (h *InventoryItemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	item, err := h.service.GetByID(r.Context(), itemID)
	if err != nil {
		if err == repository.ErrInventoryItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Inventory item not found")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "inventory item not found")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to load inventory item")
		writeError(w, http.StatusInternalServerError, "ITEM_LOAD_FAILED", "failed to load inventory item")
		return
	}

	response := dto.APIResponse[dto.InventoryItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryItemHandler) GetByInventoryID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "inventoryId")
	inventoryID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INVENTORY_ID", "invalid inventory id")
		return
	}

	items, err := h.service.GetByInventoryID(r.Context(), inventoryID)
	if err != nil {
		log.Error().Err(err).Int("inventoryId", inventoryID).Msg("Failed to load inventory items")
		writeError(w, http.StatusInternalServerError, "ITEMS_LOAD_FAILED", "failed to load inventory items")
		return
	}

	response := dto.APIResponse[[]dto.InventoryItemResponse]{
		Data: items,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryItemHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.InventoryItemCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.InventoryID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "inventoryId is required and must be positive")
		return
	}
	if req.WarehouseID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "warehouseId is required and must be positive")
		return
	}
	if req.ReceiptQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "receiptQty must be non-negative")
		return
	}
	if req.WriteOffQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "writeOffQty must be non-negative")
		return
	}

	item, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrInventoryItemExists {
			log.Warn().Int("inventoryId", req.InventoryID).Int("warehouseId", req.WarehouseID).Msg("Inventory item already exists")
			writeError(w, http.StatusConflict, "ITEM_EXISTS", "inventory item already exists")
			return
		}
		if err == repository.ErrInventoryNotFound {
			log.Warn().Int("inventoryId", req.InventoryID).Msg("Inventory not found")
			writeError(w, http.StatusBadRequest, "INVENTORY_NOT_FOUND", "specified inventory does not exist")
			return
		}
		if req.ProductID != nil {
			if err == repository.ErrProductNotFound {
				log.Warn().Int("productId", *req.ProductID).Msg("Product not found")
				writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
				return
			}
		}
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			writeError(w, http.StatusBadRequest, "WAREHOUSE_NOT_FOUND", "specified warehouse does not exist")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Int("receiptQty", req.ReceiptQty).Int("writeOffQty", req.WriteOffQty).Msg("Invalid quantity")
			writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "quantities must be non-negative")
			return
		}
		log.Error().Err(err).Int("inventoryId", req.InventoryID).Int("warehouseId", req.WarehouseID).Msg("Failed to create inventory item")
		writeError(w, http.StatusInternalServerError, "ITEM_CREATE_FAILED", "failed to create inventory item")
		return
	}

	response := dto.APIResponse[dto.InventoryItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryItemHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	var req dto.InventoryItemUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.InventoryID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "inventoryId is required and must be positive")
		return
	}
	if req.WarehouseID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "warehouseId is required and must be positive")
		return
	}
	if req.ReceiptQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "receiptQty must be non-negative")
		return
	}
	if req.WriteOffQty < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "writeOffQty must be non-negative")
		return
	}

	item, err := h.service.Update(r.Context(), itemID, req)
	if err != nil {
		if err == repository.ErrInventoryItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Inventory item not found for update")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "inventory item not found")
			return
		}
		if err == repository.ErrInventoryItemExists {
			log.Warn().Int("itemId", itemID).Int("inventoryId", req.InventoryID).Int("warehouseId", req.WarehouseID).Msg("Inventory item already exists")
			writeError(w, http.StatusConflict, "ITEM_EXISTS", "inventory item already exists")
			return
		}
		if err == repository.ErrInventoryNotFound {
			log.Warn().Int("inventoryId", req.InventoryID).Msg("Inventory not found")
			writeError(w, http.StatusBadRequest, "INVENTORY_NOT_FOUND", "specified inventory does not exist")
			return
		}
		if req.ProductID != nil {
			if err == repository.ErrProductNotFound {
				log.Warn().Int("productId", *req.ProductID).Msg("Product not found")
				writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
				return
			}
		}
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Int("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			writeError(w, http.StatusBadRequest, "WAREHOUSE_NOT_FOUND", "specified warehouse does not exist")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Int("receiptQty", req.ReceiptQty).Int("writeOffQty", req.WriteOffQty).Msg("Invalid quantity")
			writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "quantities must be non-negative")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to update inventory item")
		writeError(w, http.StatusInternalServerError, "ITEM_UPDATE_FAILED", "failed to update inventory item")
		return
	}

	response := dto.APIResponse[dto.InventoryItemResponse]{
		Data: *item,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InventoryItemHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	itemID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "invalid item id")
		return
	}

	err = h.service.Delete(r.Context(), itemID)
	if err != nil {
		if err == repository.ErrInventoryItemNotFound {
			log.Warn().Int("itemId", itemID).Msg("Inventory item not found for deletion")
			writeError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "inventory item not found")
			return
		}
		log.Error().Err(err).Int("itemId", itemID).Msg("Failed to delete inventory item")
		writeError(w, http.StatusInternalServerError, "ITEM_DELETE_FAILED", "failed to delete inventory item")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
