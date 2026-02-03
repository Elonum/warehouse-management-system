package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

var (
	allowedImageExtensions = map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
		".bmp":  true,
	}

	maxImageSize    int64 = 10 * 1024 * 1024 // 10 MB
	productImageDir       = "./uploads/products"
)

type ProductImageUploadHandler struct {
	imageRepo interface{} // Will be set to ProductImageRepository
}

func NewProductImageUploadHandler() *ProductImageUploadHandler {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(productImageDir, 0755); err != nil {
		log.Error().Err(err).Msg("Failed to create product image upload directory")
	}

	return &ProductImageUploadHandler{}
}

// UploadProductImage handles image upload for products
func (h *ProductImageUploadHandler) UploadProductImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "only POST method is allowed")
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max memory
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse multipart form")
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "failed to parse form data")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Error().Err(err).Msg("Failed to get file from form")
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "file is required")
		return
	}
	defer file.Close()

	// Validate file size
	if header.Size > maxImageSize {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", fmt.Sprintf("file size exceeds maximum allowed size of %d MB", maxImageSize/(1024*1024)))
		return
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedImageExtensions[ext] {
		writeError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", fmt.Sprintf("file type %s is not allowed. Allowed types: jpg, jpeg, png, gif, webp, bmp", ext))
		return
	}

	// Generate unique filename using UUID
	uniqueID := uuid.New().String()
	filename := fmt.Sprintf("%s%s", uniqueID, ext)
	filePath := filepath.Join(productImageDir, filename)

	// Create file on disk
	dst, err := os.Create(filePath)
	if err != nil {
		log.Error().Err(err).Str("filePath", filePath).Msg("Failed to create file")
		writeError(w, http.StatusInternalServerError, "FILE_CREATE_FAILED", "failed to save file")
		return
	}
	defer dst.Close()

	// Copy file content
	_, err = io.Copy(dst, file)
	if err != nil {
		log.Error().Err(err).Str("filePath", filePath).Msg("Failed to save file content")
		os.Remove(filePath) // Clean up on error
		writeError(w, http.StatusInternalServerError, "FILE_SAVE_FAILED", "failed to save file")
		return
	}

	// Return file path (relative path for storage in DB)
	relativePath := strings.TrimPrefix(filePath, "./")
	response := map[string]interface{}{
		"data": map[string]interface{}{
			"fileName": header.Filename,
			"filePath": relativePath,
			"fileSize": header.Size,
			"fileType": ext,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error().Err(err).Msg("Failed to encode response")
	}
}
