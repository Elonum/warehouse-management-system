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

type ProductCostHandler struct {
	service *service.ProductCostService
}

func NewProductCostHandler(service *service.ProductCostService) *ProductCostHandler {
	return &ProductCostHandler{service: service}
}

func (h *ProductCostHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	costID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_COST_ID", "invalid cost id")
		return
	}

	cost, err := h.service.GetByID(r.Context(), costID)
	if err != nil {
		if err == repository.ErrProductCostNotFound {
			log.Warn().Str("costId", costID.String()).Msg("Product cost not found")
			writeError(w, http.StatusNotFound, "COST_NOT_FOUND", "product cost not found")
			return
		}
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to load product cost")
		writeError(w, http.StatusInternalServerError, "COST_LOAD_FAILED", "failed to load product cost")
		return
	}

	response := dto.APIResponse[dto.ProductCostResponse]{
		Data: *cost,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductCostHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := parseInt(r.URL.Query().Get("limit"), 50)
	offset := parseInt(r.URL.Query().Get("offset"), 0)

	var productID *uuid.UUID
	if v := r.URL.Query().Get("productId"); v != "" {
		id, err := parseUUID(v)
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid productId")
			return
		}
		productID = &id
	}

	if limit < 1 || limit > 1000 {
		writeError(w, http.StatusBadRequest, "INVALID_LIMIT", "limit must be between 1 and 1000")
		return
	}
	if offset < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_OFFSET", "offset must be non-negative")
		return
	}

	costs, err := h.service.List(r.Context(), limit, offset, productID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("productId", productID).Msg("Failed to load product costs")
		writeError(w, http.StatusInternalServerError, "COSTS_LOAD_FAILED", "failed to load product costs")
		return
	}

	response := dto.APIResponse[[]dto.ProductCostResponse]{
		Data: costs,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductCostHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	var req dto.ProductCostCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.ProductID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "productId is required")
		return
	}
	if req.UnitCostToWarehouse < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "unitCostToWarehouse must be non-negative")
		return
	}

	cost, err := h.service.Create(r.Context(), userID, req)
	if err != nil {
		if err == repository.ErrProductCostExists {
			log.Warn().Str("productId", req.ProductID).Msg("Product cost already exists")
			writeError(w, http.StatusConflict, "COST_EXISTS", "product cost already exists")
			return
		}
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
			return
		}
		if err == repository.ErrInvalidDateRange {
			log.Warn().Time("periodStart", req.PeriodStart).Time("periodEnd", req.PeriodEnd).Msg("Invalid date range")
			writeError(w, http.StatusBadRequest, "INVALID_DATE_RANGE", "period end must be after period start")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Float64("unitCostToWarehouse", req.UnitCostToWarehouse).Msg("Invalid cost")
			writeError(w, http.StatusBadRequest, "INVALID_COST", "unitCostToWarehouse must be non-negative")
			return
		}
		log.Error().Err(err).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Failed to create product cost")
		writeError(w, http.StatusInternalServerError, "COST_CREATE_FAILED", "failed to create product cost")
		return
	}

	response := dto.APIResponse[dto.ProductCostResponse]{
		Data: *cost,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductCostHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	idStr := chi.URLParam(r, "id")
	costID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_COST_ID", "invalid cost id")
		return
	}

	var req dto.ProductCostUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.ProductID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "productId is required")
		return
	}
	if req.UnitCostToWarehouse < 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "unitCostToWarehouse must be non-negative")
		return
	}

	cost, err := h.service.Update(r.Context(), costID, userID, req)
	if err != nil {
		if err == repository.ErrProductCostNotFound {
			log.Warn().Str("costId", costID.String()).Msg("Product cost not found for update")
			writeError(w, http.StatusNotFound, "COST_NOT_FOUND", "product cost not found")
			return
		}
		if err == repository.ErrProductCostExists {
			log.Warn().Str("costId", costID.String()).Str("productId", req.ProductID).Msg("Product cost already exists")
			writeError(w, http.StatusConflict, "COST_EXISTS", "product cost already exists")
			return
		}
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			writeError(w, http.StatusBadRequest, "PRODUCT_NOT_FOUND", "specified product does not exist")
			return
		}
		if err == repository.ErrInvalidDateRange {
			log.Warn().Time("periodStart", req.PeriodStart).Time("periodEnd", req.PeriodEnd).Msg("Invalid date range")
			writeError(w, http.StatusBadRequest, "INVALID_DATE_RANGE", "period end must be after period start")
			return
		}
		if err == repository.ErrInvalidQuantity {
			log.Warn().Float64("unitCostToWarehouse", req.UnitCostToWarehouse).Msg("Invalid cost")
			writeError(w, http.StatusBadRequest, "INVALID_COST", "unitCostToWarehouse must be non-negative")
			return
		}
		log.Error().Err(err).Str("costId", costID.String()).Str("userId", userID.String()).Msg("Failed to update product cost")
		writeError(w, http.StatusInternalServerError, "COST_UPDATE_FAILED", "failed to update product cost")
		return
	}

	response := dto.APIResponse[dto.ProductCostResponse]{
		Data: *cost,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductCostHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	costID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_COST_ID", "invalid cost id")
		return
	}

	err = h.service.Delete(r.Context(), costID)
	if err != nil {
		if err == repository.ErrProductCostNotFound {
			log.Warn().Str("costId", costID.String()).Msg("Product cost not found for deletion")
			writeError(w, http.StatusNotFound, "COST_NOT_FOUND", "product cost not found")
			return
		}
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to delete product cost")
		writeError(w, http.StatusInternalServerError, "COST_DELETE_FAILED", "failed to delete product cost")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
