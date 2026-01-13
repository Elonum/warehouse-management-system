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

type ProductHandler struct {
	service *service.ProductService
}

func NewProductHandler(service *service.ProductService) *ProductHandler {
	return &ProductHandler{service: service}
}

func (h *ProductHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	productID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid product id")
		return
	}

	product, err := h.service.GetByID(r.Context(), productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", productID).Msg("Product not found")
			writeError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", "product not found")
			return
		}
		log.Error().Err(err).Int("productId", productID).Msg("Failed to load product")
		writeError(w, http.StatusInternalServerError, "PRODUCT_LOAD_FAILED", "failed to load product")
		return
	}

	response := dto.APIResponse[dto.ProductResponse]{
		Data: *product,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
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

	products, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load products")
		writeError(w, http.StatusInternalServerError, "PRODUCTS_LOAD_FAILED", "failed to load products")
		return
	}

	response := dto.APIResponse[[]dto.ProductResponse]{
		Data: products,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.ProductCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Article == "" || req.Barcode == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "article and barcode are required")
		return
	}

	product, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrProductExists {
			log.Warn().Str("article", req.Article).Str("barcode", req.Barcode).Msg("Product already exists")
			writeError(w, http.StatusConflict, "PRODUCT_EXISTS", "product with this article or barcode already exists")
			return
		}
		log.Error().Err(err).Str("article", req.Article).Str("barcode", req.Barcode).Msg("Failed to create product")
		writeError(w, http.StatusInternalServerError, "PRODUCT_CREATE_FAILED", "failed to create product")
		return
	}

	response := dto.APIResponse[dto.ProductResponse]{
		Data: *product,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	productID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid product id")
		return
	}

	var req dto.ProductUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Article == "" || req.Barcode == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "article and barcode are required")
		return
	}

	product, err := h.service.Update(r.Context(), productID, req)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", productID).Msg("Product not found for update")
			writeError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", "product not found")
			return
		}
		if err == repository.ErrProductExists {
			log.Warn().Int("productId", productID).Str("article", req.Article).Str("barcode", req.Barcode).Msg("Product with article/barcode already exists")
			writeError(w, http.StatusConflict, "PRODUCT_EXISTS", "product with this article or barcode already exists")
			return
		}
		log.Error().Err(err).Int("productId", productID).Msg("Failed to update product")
		writeError(w, http.StatusInternalServerError, "PRODUCT_UPDATE_FAILED", "failed to update product")
		return
	}

	response := dto.APIResponse[dto.ProductResponse]{
		Data: *product,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	productID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid product id")
		return
	}

	err = h.service.Delete(r.Context(), productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", productID).Msg("Product not found for deletion")
			writeError(w, http.StatusNotFound, "PRODUCT_NOT_FOUND", "product not found")
			return
		}
		log.Error().Err(err).Int("productId", productID).Msg("Failed to delete product")
		writeError(w, http.StatusInternalServerError, "PRODUCT_DELETE_FAILED", "failed to delete product")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
