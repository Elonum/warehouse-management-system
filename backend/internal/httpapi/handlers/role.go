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

type RoleHandler struct {
	service *service.RoleService
}

func NewRoleHandler(service *service.RoleService) *RoleHandler {
	return &RoleHandler{service: service}
}

func (h *RoleHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	roleID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ROLE_ID", "invalid role id")
		return
	}

	role, err := h.service.GetByID(r.Context(), roleID)
	if err != nil {
		if err == repository.ErrRoleNotFound {
			log.Warn().Int("roleId", roleID).Msg("Role not found")
			writeError(w, http.StatusNotFound, "ROLE_NOT_FOUND", "role not found")
			return
		}
		log.Error().Err(err).Int("roleId", roleID).Msg("Failed to load role")
		writeError(w, http.StatusInternalServerError, "ROLE_LOAD_FAILED", "failed to load role")
		return
	}

	response := dto.APIResponse[dto.RoleResponse]{
		Data: *role,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *RoleHandler) List(w http.ResponseWriter, r *http.Request) {
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

	roles, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load roles")
		writeError(w, http.StatusInternalServerError, "ROLES_LOAD_FAILED", "failed to load roles")
		return
	}

	response := dto.APIResponse[[]dto.RoleResponse]{
		Data: roles,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *RoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.RoleCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	role, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrRoleExists {
			log.Warn().Str("name", req.Name).Msg("Role already exists")
			writeError(w, http.StatusConflict, "ROLE_EXISTS", "role with this name already exists")
			return
		}
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create role")
		writeError(w, http.StatusInternalServerError, "ROLE_CREATE_FAILED", "failed to create role")
		return
	}

	response := dto.APIResponse[dto.RoleResponse]{
		Data: *role,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *RoleHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	roleID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ROLE_ID", "invalid role id")
		return
	}

	var req dto.RoleUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "name is required")
		return
	}

	role, err := h.service.Update(r.Context(), roleID, req)
	if err != nil {
		if err == repository.ErrRoleNotFound {
			log.Warn().Int("roleId", roleID).Msg("Role not found for update")
			writeError(w, http.StatusNotFound, "ROLE_NOT_FOUND", "role not found")
			return
		}
		if err == repository.ErrRoleExists {
			log.Warn().Int("roleId", roleID).Str("name", req.Name).Msg("Role with name already exists")
			writeError(w, http.StatusConflict, "ROLE_EXISTS", "role with this name already exists")
			return
		}
		log.Error().Err(err).Int("roleId", roleID).Msg("Failed to update role")
		writeError(w, http.StatusInternalServerError, "ROLE_UPDATE_FAILED", "failed to update role")
		return
	}

	response := dto.APIResponse[dto.RoleResponse]{
		Data: *role,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *RoleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	roleID, err := strconv.Atoi(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_ROLE_ID", "invalid role id")
		return
	}

	err = h.service.Delete(r.Context(), roleID)
	if err != nil {
		if err == repository.ErrRoleNotFound {
			log.Warn().Int("roleId", roleID).Msg("Role not found for deletion")
			writeError(w, http.StatusNotFound, "ROLE_NOT_FOUND", "role not found")
			return
		}
		log.Error().Err(err).Int("roleId", roleID).Msg("Failed to delete role")
		writeError(w, http.StatusInternalServerError, "ROLE_DELETE_FAILED", "failed to delete role")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
