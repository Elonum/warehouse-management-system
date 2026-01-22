package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/rs/zerolog/log"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(service *service.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "email and password are required")
		return
	}

	token, user, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if err == service.ErrInvalidCredentials {
			log.Warn().Str("email", req.Email).Msg("Login failed: invalid credentials")
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
			return
		}
		log.Error().Err(err).Str("email", req.Email).Msg("Login failed")
		writeError(w, http.StatusInternalServerError, "LOGIN_FAILED", "failed to login")
		return
	}

	response := dto.APIResponse[dto.LoginResponse]{
		Data: dto.LoginResponse{
			Token: token,
			User: dto.UserResponse{
				UserID:     user.UserID.String(),
				Email:      user.Email,
				Name:       user.Name,
				Surname:    user.Surname,
				Patronymic: user.Patronymic,
				RoleID:     user.RoleID.String(),
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	var req dto.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "email and password are required")
		return
	}

	if len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "password must be at least 6 characters")
		return
	}

	user, err := h.service.Register(r.Context(), req.Email, req.Password, req.RoleID, req.Name, req.Surname, req.Patronymic)
	if err != nil {
		log.Error().Err(err).Str("email", req.Email).Str("roleId", req.RoleID).Msg("Failed to register user")

		if err == repository.ErrUserExists {
			writeError(w, http.StatusConflict, "USER_EXISTS", "user with this email already exists")
			return
		}
		if err == service.ErrInvalidRole {
			writeError(w, http.StatusBadRequest, "INVALID_ROLE", "specified role does not exist")
			return
		}

		errMsg := err.Error()
		if strings.Contains(errMsg, "foreign key") || strings.Contains(errMsg, "roleId") {
			writeError(w, http.StatusBadRequest, "INVALID_ROLE", "specified role does not exist")
			return
		}
		if strings.Contains(errMsg, "does not exist") {
			writeError(w, http.StatusInternalServerError, "DATABASE_ERROR", "database table not found. Please check database schema")
			return
		}

		writeError(w, http.StatusInternalServerError, "REGISTER_FAILED", "failed to register user")
		return
	}

	response := dto.APIResponse[dto.UserResponse]{
		Data: dto.UserResponse{
			UserID:     user.UserID.String(),
			Email:      user.Email,
			Name:       user.Name,
			Surname:    user.Surname,
			Patronymic: user.Patronymic,
			RoleID:     user.RoleID.String(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	if userID == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "user not found in context")
		return
	}

	user, err := h.service.GetCurrentUser(r.Context(), userID)
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
		Data: dto.UserResponse{
			UserID:     user.UserID.String(),
			Email:      user.Email,
			Name:       user.Name,
			Surname:    user.Surname,
			Patronymic: user.Patronymic,
			RoleID:     user.RoleID.String(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
