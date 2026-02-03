package handlers

import (
	"encoding/json"
	"net/http"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type ProductImageHandler struct {
	imageRepo *repository.ProductImageRepository
}

func NewProductImageHandler(imageRepo *repository.ProductImageRepository) *ProductImageHandler {
	return &ProductImageHandler{
		imageRepo: imageRepo,
	}
}

// GetByProductID returns all images for a product
func (h *ProductImageHandler) GetByProductID(w http.ResponseWriter, r *http.Request) {
	productIDStr := chi.URLParam(r, "productId")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid product id")
		return
	}

	images, err := h.imageRepo.GetByProductID(r.Context(), productID)
	if err != nil {
		log.Error().Err(err).Str("productId", productID.String()).Msg("Failed to load product images")
		writeError(w, http.StatusInternalServerError, "IMAGES_LOAD_FAILED", "failed to load product images")
		return
	}

	// Convert to DTO
	imageResponses := make([]dto.ProductImageResponse, 0, len(images))
	for _, img := range images {
		imageResponses = append(imageResponses, dto.ProductImageResponse{
			ImageID:      img.ImageID.String(),
			FilePath:     img.FilePath,
			DisplayOrder: img.DisplayOrder,
			IsMain:       img.IsMain,
			ImageURL:     buildImageURL(r, img.FilePath),
		})
	}

	response := dto.APIResponse[[]dto.ProductImageResponse]{
		Data: imageResponses,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Delete removes an image from a product
func (h *ProductImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	productIDStr := chi.URLParam(r, "productId")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid product id")
		return
	}

	imageIDStr := chi.URLParam(r, "imageId")
	imageID, err := uuid.Parse(imageIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_IMAGE_ID", "invalid image id")
		return
	}

	// Verify that the image belongs to the product
	image, err := h.imageRepo.GetByID(r.Context(), imageID)
	if err != nil {
		if err == repository.ErrProductImageNotFound {
			writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "image not found")
			return
		}
		log.Error().Err(err).Str("imageId", imageID.String()).Msg("Failed to get image")
		writeError(w, http.StatusInternalServerError, "IMAGE_LOAD_FAILED", "failed to load image")
		return
	}

	if image.ProductID != productID {
		writeError(w, http.StatusBadRequest, "IMAGE_MISMATCH", "image does not belong to this product")
		return
	}

	err = h.imageRepo.Delete(r.Context(), imageID)
	if err != nil {
		if err == repository.ErrProductImageNotFound {
			writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "image not found")
			return
		}
		log.Error().Err(err).Str("imageId", imageID.String()).Msg("Failed to delete image")
		writeError(w, http.StatusInternalServerError, "IMAGE_DELETE_FAILED", "failed to delete image")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UpdateDisplayOrder updates the display order of an image
func (h *ProductImageHandler) UpdateDisplayOrder(w http.ResponseWriter, r *http.Request) {
	productIDStr := chi.URLParam(r, "productId")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid product id")
		return
	}

	imageIDStr := chi.URLParam(r, "imageId")
	imageID, err := uuid.Parse(imageIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_IMAGE_ID", "invalid image id")
		return
	}

	var req struct {
		DisplayOrder int `json:"displayOrder"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	// Verify that the image belongs to the product
	image, err := h.imageRepo.GetByID(r.Context(), imageID)
	if err != nil {
		if err == repository.ErrProductImageNotFound {
			writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "image not found")
			return
		}
		log.Error().Err(err).Str("imageId", imageID.String()).Msg("Failed to get image")
		writeError(w, http.StatusInternalServerError, "IMAGE_LOAD_FAILED", "failed to load image")
		return
	}

	if image.ProductID != productID {
		writeError(w, http.StatusBadRequest, "IMAGE_MISMATCH", "image does not belong to this product")
		return
	}

	err = h.imageRepo.UpdateDisplayOrder(r.Context(), imageID, req.DisplayOrder)
	if err != nil {
		if err == repository.ErrProductImageNotFound {
			writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "image not found")
			return
		}
		log.Error().Err(err).Str("imageId", imageID.String()).Msg("Failed to update display order")
		writeError(w, http.StatusInternalServerError, "ORDER_UPDATE_FAILED", "failed to update display order")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SetAsMain sets an image as the main image for a product
func (h *ProductImageHandler) SetAsMain(w http.ResponseWriter, r *http.Request) {
	productIDStr := chi.URLParam(r, "productId")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PRODUCT_ID", "invalid product id")
		return
	}

	imageIDStr := chi.URLParam(r, "imageId")
	imageID, err := uuid.Parse(imageIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_IMAGE_ID", "invalid image id")
		return
	}

	// Verify that the image belongs to the product
	image, err := h.imageRepo.GetByID(r.Context(), imageID)
	if err != nil {
		if err == repository.ErrProductImageNotFound {
			writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "image not found")
			return
		}
		log.Error().Err(err).Str("imageId", imageID.String()).Msg("Failed to get image")
		writeError(w, http.StatusInternalServerError, "IMAGE_LOAD_FAILED", "failed to load image")
		return
	}

	if image.ProductID != productID {
		writeError(w, http.StatusBadRequest, "IMAGE_MISMATCH", "image does not belong to this product")
		return
	}

	err = h.imageRepo.SetAsMain(r.Context(), imageID, productID)
	if err != nil {
		if err == repository.ErrProductImageNotFound {
			writeError(w, http.StatusNotFound, "IMAGE_NOT_FOUND", "image not found")
			return
		}
		log.Error().Err(err).Str("imageId", imageID.String()).Msg("Failed to set image as main")
		writeError(w, http.StatusInternalServerError, "SET_MAIN_FAILED", "failed to set image as main")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Helper function to build image URL
func buildImageURL(r *http.Request, filePath string) string {
	if filePath == "" {
		return ""
	}
	// Remove leading ./ if present
	if len(filePath) > 2 && filePath[0:2] == "./" {
		filePath = filePath[2:]
	}
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	host := r.Host
	return scheme + "://" + host + "/api/v1/files?path=" + filePath
}
