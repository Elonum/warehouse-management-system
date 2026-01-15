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

type SupplierOrderDocumentHandler struct {
	service *service.SupplierOrderDocumentService
}

func NewSupplierOrderDocumentHandler(service *service.SupplierOrderDocumentService) *SupplierOrderDocumentHandler {
	return &SupplierOrderDocumentHandler{service: service}
}

func (h *SupplierOrderDocumentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	documentID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "invalid document id")
		return
	}

	doc, err := h.service.GetByID(r.Context(), documentID)
	if err != nil {
		if err == repository.ErrSupplierOrderDocumentNotFound {
			log.Warn().Int("documentId", documentID).Msg("Supplier order document not found")
			writeError(w, http.StatusNotFound, "DOCUMENT_NOT_FOUND", "supplier order document not found")
			return
		}
		log.Error().Err(err).Int("documentId", documentID).Msg("Failed to load supplier order document")
		writeError(w, http.StatusInternalServerError, "DOCUMENT_LOAD_FAILED", "failed to load supplier order document")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderDocumentResponse]{
		Data: *doc,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderDocumentHandler) GetByOrderID(w http.ResponseWriter, r *http.Request) {
	orderIDStr := chi.URLParam(r, "orderId")
	orderID, err := strconv.Atoi(orderIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ORDER_ID", "invalid order id")
		return
	}

	docs, err := h.service.GetByOrderID(r.Context(), orderID)
	if err != nil {
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to load supplier order documents")
		writeError(w, http.StatusInternalServerError, "DOCUMENTS_LOAD_FAILED", "failed to load supplier order documents")
		return
	}

	response := dto.APIResponse[[]dto.SupplierOrderDocumentResponse]{
		Data: docs,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderDocumentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.SupplierOrderDocumentCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.OrderID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required and must be positive")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}
	if req.FilePath == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "filePath is required")
		return
	}

	doc, err := h.service.Create(r.Context(), req)
	if err != nil {
		log.Error().Err(err).Int("orderId", req.OrderID).Str("name", req.Name).Msg("Failed to create supplier order document")
		writeError(w, http.StatusInternalServerError, "DOCUMENT_CREATE_FAILED", "failed to create supplier order document")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderDocumentResponse]{
		Data: *doc,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderDocumentHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	documentID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "invalid document id")
		return
	}

	var req dto.SupplierOrderDocumentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.OrderID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required and must be positive")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}
	if req.FilePath == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "filePath is required")
		return
	}

	doc, err := h.service.Update(r.Context(), documentID, req)
	if err != nil {
		if err == repository.ErrSupplierOrderDocumentNotFound {
			log.Warn().Int("documentId", documentID).Msg("Supplier order document not found for update")
			writeError(w, http.StatusNotFound, "DOCUMENT_NOT_FOUND", "supplier order document not found")
			return
		}
		log.Error().Err(err).Int("documentId", documentID).Msg("Failed to update supplier order document")
		writeError(w, http.StatusInternalServerError, "DOCUMENT_UPDATE_FAILED", "failed to update supplier order document")
		return
	}

	response := dto.APIResponse[dto.SupplierOrderDocumentResponse]{
		Data: *doc,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *SupplierOrderDocumentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	documentID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "invalid document id")
		return
	}

	err = h.service.Delete(r.Context(), documentID)
	if err != nil {
		if err == repository.ErrSupplierOrderDocumentNotFound {
			log.Warn().Int("documentId", documentID).Msg("Supplier order document not found for deletion")
			writeError(w, http.StatusNotFound, "DOCUMENT_NOT_FOUND", "supplier order document not found")
			return
		}
		log.Error().Err(err).Int("documentId", documentID).Msg("Failed to delete supplier order document")
		writeError(w, http.StatusInternalServerError, "DOCUMENT_DELETE_FAILED", "failed to delete supplier order document")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
