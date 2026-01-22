package handlers

import (
	"encoding/json"
	"net/http"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

type UserHandler struct {
	service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_USER_ID", "invalid user id")
		return
	}

	user, err := h.service.GetByID(r.Context(), userID)
	if err != nil {
		if err == repository.ErrUserNotFound {
			log.Warn().Str("userId", userID.String()).Msg("User not found")
			writeError(w, http.StatusNotFound, "USER_NOT_FOUND", "user not found")
			return
		}
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to load user")
		writeError(w, http.StatusInternalServerError, "USER_LOAD_FAILED", "failed to load user")
		return
	}

	response := dto.APIResponse[dto.UserResponse]{
		Data: *user,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
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

	users, err := h.service.List(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to load users")
		writeError(w, http.StatusInternalServerError, "USERS_LOAD_FAILED", "failed to load users")
		return
	}

	response := dto.APIResponse[[]dto.UserResponse]{
		Data: users,
		Meta: &dto.Meta{
			Limit:  limit,
			Offset: offset,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.UserCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "email is required")
		return
	}
	if req.Password == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "password is required")
		return
	}
	if len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "password must be at least 6 characters")
		return
	}
	if req.RoleID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "roleId is required")
		return
	}

	user, err := h.service.Create(r.Context(), req)
	if err != nil {
		if err == repository.ErrUserExists {
			log.Warn().Str("email", req.Email).Msg("User already exists")
			writeError(w, http.StatusConflict, "USER_EXISTS", "user with this email already exists")
			return
		}
		if err == repository.ErrRoleNotFound {
			log.Warn().Str("roleId", req.RoleID).Msg("Role not found")
			writeError(w, http.StatusBadRequest, "ROLE_NOT_FOUND", "specified role does not exist")
			return
		}
		log.Error().Err(err).Str("email", req.Email).Str("roleId", req.RoleID).Msg("Failed to create user")
		writeError(w, http.StatusInternalServerError, "USER_CREATE_FAILED", "failed to create user")
		return
	}

	response := dto.APIResponse[dto.UserResponse]{
		Data: *user,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_USER_ID", "invalid user id")
		return
	}

	var req dto.UserUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "email is required")
		return
	}
	if req.RoleID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "roleId is required")
		return
	}

	user, err := h.service.Update(r.Context(), userID, req)
	if err != nil {
		if err == repository.ErrUserNotFound {
			log.Warn().Str("userId", userID.String()).Msg("User not found for update")
			writeError(w, http.StatusNotFound, "USER_NOT_FOUND", "user not found")
			return
		}
		if err == repository.ErrUserExists {
			log.Warn().Str("userId", userID.String()).Str("email", req.Email).Msg("User with email already exists")
			writeError(w, http.StatusConflict, "USER_EXISTS", "user with this email already exists")
			return
		}
		if err == repository.ErrRoleNotFound {
			log.Warn().Str("roleId", req.RoleID).Msg("Role not found")
			writeError(w, http.StatusBadRequest, "ROLE_NOT_FOUND", "specified role does not exist")
			return
		}
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to update user")
		writeError(w, http.StatusInternalServerError, "USER_UPDATE_FAILED", "failed to update user")
		return
	}

	response := dto.APIResponse[dto.UserResponse]{
		Data: *user,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := parseUUID(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_USER_ID", "invalid user id")
		return
	}

	err = h.service.Delete(r.Context(), userID)
	if err != nil {
		if err == repository.ErrUserNotFound {
			log.Warn().Str("userId", userID.String()).Msg("User not found for deletion")
			writeError(w, http.StatusNotFound, "USER_NOT_FOUND", "user not found")
			return
		}
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to delete user")
		writeError(w, http.StatusInternalServerError, "USER_DELETE_FAILED", "failed to delete user")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
