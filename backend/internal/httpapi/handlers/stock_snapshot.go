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

type StockSnapshotHandler struct {
	service *service.StockSnapshotService
}

func NewStockSnapshotHandler(service *service.StockSnapshotService) *StockSnapshotHandler {
	return &StockSnapshotHandler{service: service}
}

func (h *StockSnapshotHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	snapshotID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SNAPSHOT_ID", "invalid snapshot id")
		return
	}

	snapshot, err := h.service.GetByID(r.Context(), snapshotID)
	if err != nil {
		if err == repository.ErrStockSnapshotNotFound {
			log.Warn().Str("snapshotId", snapshotID.String()).Msg("Stock snapshot not found")
			writeError(w, http.StatusNotFound, "SNAPSHOT_NOT_FOUND", "stock snapshot not found")
			return
		}
		log.Error().Err(err).Str("snapshotId", snapshotID.String()).Msg("Failed to load stock snapshot")
		writeError(w, http.StatusInternalServerError, "SNAPSHOT_LOAD_FAILED", "failed to load stock snapshot")
		return
	}

	response := dto.APIResponse[dto.StockSnapshotResponse]{
		Data: *snapshot,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *StockSnapshotHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	var req dto.StockSnapshotCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.WarehouseID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "warehouseId is required")
		return
	}
	if req.ProductID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "productId is required")
		return
	}
	if req.Quantity < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "quantity must be non-negative")
		return
	}

	snapshot, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		if err == repository.ErrStockSnapshotExists {
			log.Warn().Str("warehouseId", req.WarehouseID).Str("productId", req.ProductID).Time("snapshotDate", req.SnapshotDate).Msg("Stock snapshot already exists")
			writeError(w, http.StatusConflict, "SNAPSHOT_EXISTS", "stock snapshot already exists")
			return
		}
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Str("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			writeError(w, http.StatusBadRequest, "WAREHOUSE_NOT_FOUND", "specified warehouse does not exist")
			return
		}
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Int("quantity", req.Quantity).Msg("Invalid quantity")
			writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "quantity must be non-negative")
			return
		}
		log.Error().Err(err).Str("warehouseId", req.WarehouseID).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Failed to create stock snapshot")
		writeError(w, http.StatusInternalServerError, "SNAPSHOT_CREATE_FAILED", "failed to create stock snapshot")
		return
	}

	response := dto.APIResponse[dto.StockSnapshotResponse]{
		Data: *snapshot,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *StockSnapshotHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	snapshotID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SNAPSHOT_ID", "invalid snapshot id")
		return
	}

	var req dto.StockSnapshotUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.WarehouseID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "warehouseId is required")
		return
	}
	if req.ProductID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "productId is required")
		return
	}
	if req.Quantity < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "quantity must be non-negative")
		return
	}

	snapshot, err := h.service.Update(r.Context(), snapshotID, req)
	if err != nil {
		if err == repository.ErrStockSnapshotNotFound {
			log.Warn().Str("snapshotId", snapshotID.String()).Msg("Stock snapshot not found for update")
			writeError(w, http.StatusNotFound, "SNAPSHOT_NOT_FOUND", "stock snapshot not found")
			return
		}
		if err == repository.ErrStockSnapshotExists {
			log.Warn().Str("snapshotId", snapshotID.String()).Str("warehouseId", req.WarehouseID).Str("productId", req.ProductID).Time("snapshotDate", req.SnapshotDate).Msg("Stock snapshot already exists")
			writeError(w, http.StatusConflict, "SNAPSHOT_EXISTS", "stock snapshot already exists")
			return
		}
		if err == repository.ErrWarehouseNotFound {
			log.Warn().Str("warehouseId", req.WarehouseID).Msg("Warehouse not found")
			writeError(w, http.StatusBadRequest, "WAREHOUSE_NOT_FOUND", "specified warehouse does not exist")
			return
		}
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Int("quantity", req.Quantity).Msg("Invalid quantity")
			writeError(w, http.StatusBadRequest, "INVALID_QUANTITY", "quantity must be non-negative")
			return
		}
		log.Error().Err(err).Str("snapshotId", snapshotID.String()).Msg("Failed to update stock snapshot")
		writeError(w, http.StatusInternalServerError, "SNAPSHOT_UPDATE_FAILED", "failed to update stock snapshot")
		return
	}

	response := dto.APIResponse[dto.StockSnapshotResponse]{
		Data: *snapshot,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *StockSnapshotHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	snapshotID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_SNAPSHOT_ID", "invalid snapshot id")
		return
	}

	err = h.service.Delete(r.Context(), snapshotID)
	if err != nil {
		if err == repository.ErrStockSnapshotNotFound {
			log.Warn().Str("snapshotId", snapshotID.String()).Msg("Stock snapshot not found for deletion")
			writeError(w, http.StatusNotFound, "SNAPSHOT_NOT_FOUND", "stock snapshot not found")
			return
		}
		log.Error().Err(err).Str("snapshotId", snapshotID.String()).Msg("Failed to delete stock snapshot")
		writeError(w, http.StatusInternalServerError, "SNAPSHOT_DELETE_FAILED", "failed to delete stock snapshot")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
