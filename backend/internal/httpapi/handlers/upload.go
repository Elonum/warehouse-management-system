package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

var (
	allowedExtensions = map[string]bool{
		// Documents
		".pdf":  true,
		".doc":  true,
		".docx": true,
		".xls":  true,
		".xlsx": true,
		".txt":  true,
		".rtf":  true,
		".odt":  true,
		".ods":  true,
		// Images
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".bmp":  true,
		".webp": true,
		".svg":  true,
		// Archives
		".zip":  true,
		".rar":  true,
		".7z":   true,
		".tar":  true,
		".gz":   true,
		// Other
		".csv": true,
		".xml": true,
	}

	maxFileSize int64 = 50 * 1024 * 1024 // 50 MB
	uploadDir         = "./uploads/documents"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Error().Err(err).Msg("Failed to create upload directory")
	}
	return &UploadHandler{}
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
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
	if header.Size > maxFileSize {
		writeError(w, http.StatusBadRequest, "FILE_TOO_LARGE", fmt.Sprintf("file size exceeds maximum allowed size of %d MB", maxFileSize/(1024*1024)))
		return
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExtensions[ext] {
		writeError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", fmt.Sprintf("file type %s is not allowed", ext))
		return
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%s", timestamp, header.Filename)
	filePath := filepath.Join(uploadDir, filename)

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

func (h *UploadHandler) ServeFile(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	if filePath == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "path parameter is required")
		return
	}

	// Security: prevent directory traversal
	if strings.Contains(filePath, "..") {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid file path")
		return
	}

	// Decode URL-encoded path
	decodedPath, err := url.QueryUnescape(filePath)
	if err != nil {
		decodedPath = filePath // Fallback to original if decode fails
	}
	
	// Normalize path separators to forward slashes for cross-platform compatibility
	decodedPath = strings.ReplaceAll(decodedPath, "\\", "/")
	
	// Normalize path - remove leading ./ if present
	normalizedPath := strings.TrimPrefix(decodedPath, "./")
	
	// Determine which upload directory to use based on path
	var targetDir string
	var filename string
	
	if strings.HasPrefix(normalizedPath, "uploads/products/") {
		targetDir = "./uploads/products"
		// Extract filename from path - handle both / and \ separators
		parts := strings.Split(normalizedPath, "/")
		if len(parts) > 0 {
			filename = parts[len(parts)-1]
		} else {
			filename = filepath.Base(normalizedPath)
		}
	} else if strings.HasPrefix(normalizedPath, "uploads/") {
		// Handle other upload directories
		targetDir = uploadDir
		parts := strings.Split(normalizedPath, "/")
		if len(parts) > 0 {
			filename = parts[len(parts)-1]
		} else {
			filename = filepath.Base(normalizedPath)
		}
	} else {
		// If path doesn't start with "uploads/", treat as filename only
		targetDir = "./uploads/products"
		filename = filepath.Base(normalizedPath)
	}
	
	// Ensure file is within upload directory
	fullPath := filepath.Join(targetDir, filename)
	
	// Additional security check
	absTargetDir, _ := filepath.Abs(targetDir)
	absFullPath, _ := filepath.Abs(fullPath)
	if !strings.HasPrefix(absFullPath, absTargetDir) {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid file path")
		return
	}

	// Check if file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		log.Warn().
			Str("requestedPath", filePath).
			Str("decodedPath", decodedPath).
			Str("normalizedPath", normalizedPath).
			Str("filename", filename).
			Str("targetDir", targetDir).
			Str("fullPath", fullPath).
			Msg("File not found")
		writeError(w, http.StatusNotFound, "FILE_NOT_FOUND", "file not found")
		return
	}

	// Set appropriate headers
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", filepath.Base(fullPath)))
	w.Header().Set("Content-Type", getContentType(filepath.Ext(fullPath)))

	// Serve file
	http.ServeFile(w, r, fullPath)
}

func getContentType(ext string) string {
	contentTypes := map[string]string{
		".pdf":  "application/pdf",
		".doc":  "application/msword",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xls":  "application/vnd.ms-excel",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".txt":  "text/plain",
		".csv":  "text/csv",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".zip":  "application/zip",
	}

	if ct, ok := contentTypes[strings.ToLower(ext)]; ok {
		return ct
	}
	return "application/octet-stream"
}

