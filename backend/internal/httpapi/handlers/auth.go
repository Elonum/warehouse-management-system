package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"
	"warehouse-backend/internal/validation"

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
		// Always return the same error message to prevent information leakage
		// Don't reveal whether email exists or password is wrong
		if err == service.ErrInvalidCredentials {
			// Use generic error message - don't reveal which field is wrong
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
			return
		}
		// For other errors, log but don't expose details to client
		log.Error().Err(err).Msg("Login failed")
		writeError(w, http.StatusInternalServerError, "LOGIN_FAILED", "an error occurred during login")
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

	user, err := h.service.Register(r.Context(), req.Email, req.Password, req.RoleID, req.Name, req.Surname, req.Patronymic)
	if err != nil {
		// Handle different error types with appropriate responses
		// But don't leak sensitive information
		if err == repository.ErrUserExists {
			writeError(w, http.StatusConflict, "USER_EXISTS", "user with this email already exists")
			return
		}
		if err == service.ErrInvalidRole {
			writeError(w, http.StatusBadRequest, "INVALID_ROLE", "specified role does not exist")
			return
		}

		// Check for validation errors
		if err == validation.ErrInvalidEmail {
			writeError(w, http.StatusBadRequest, "INVALID_EMAIL", "invalid email format")
			return
		}
		if err == validation.ErrWeakPassword || err == validation.ErrPasswordTooShort || err == validation.ErrPasswordTooLong {
			writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", err.Error())
			return
		}
		if err == validation.ErrNameRequired || err == validation.ErrSurnameRequired {
			writeError(w, http.StatusBadRequest, "NAME_REQUIRED", err.Error())
			return
		}
		if err == validation.ErrInvalidName || err == validation.ErrNameTooShort || err == validation.ErrNameTooLong {
			writeError(w, http.StatusBadRequest, "INVALID_NAME", err.Error())
			return
		}

		// For database errors, don't expose internal details
		errMsg := err.Error()
		if strings.Contains(errMsg, "foreign key") || strings.Contains(errMsg, "roleId") {
			writeError(w, http.StatusBadRequest, "INVALID_ROLE", "specified role does not exist")
			return
		}

		// Log error but don't expose details to client
		log.Error().Err(err).Msg("Registration failed")
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

func (h *AuthHandler) RequestPasswordReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	var req dto.PasswordResetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "email is required")
		return
	}

	// Request password reset (always returns success to prevent email enumeration)
	err := h.service.RequestPasswordReset(r.Context(), req.Email)
	if err != nil {
		log.Error().Err(err).Str("email", req.Email).Msg("Failed to request password reset")
		// Still return success to prevent email enumeration
	}

	response := dto.APIResponse[map[string]interface{}]{
		Data: map[string]interface{}{
			"message": "Если указанный email существует в системе, на него отправлена инструкция по сбросу пароля",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	var req dto.PasswordResetConfirmRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "token and newPassword are required")
		return
	}

	err := h.service.ResetPassword(r.Context(), req.Token, req.NewPassword)
	if err != nil {
		if err == service.ErrPasswordResetTokenInvalid {
			writeError(w, http.StatusBadRequest, "INVALID_TOKEN", "недействительный или истекший токен сброса пароля")
			return
		}
		if err == service.ErrPasswordResetTokenExpired {
			writeError(w, http.StatusBadRequest, "TOKEN_EXPIRED", "токен сброса пароля истек")
			return
		}
		if err == service.ErrPasswordResetTokenUsed {
			writeError(w, http.StatusBadRequest, "TOKEN_USED", "токен сброса пароля уже был использован")
			return
		}
		// Password validation errors (do not leak detailed policy from backend; frontend can show richer hints)
		if errors.Is(err, validation.ErrWeakPassword) ||
			errors.Is(err, validation.ErrPasswordTooShort) ||
			errors.Is(err, validation.ErrPasswordTooLong) {
			writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", "пароль не соответствует требованиям безопасности")
			return
		}
		log.Error().Err(err).Msg("Failed to reset password")
		writeError(w, http.StatusInternalServerError, "RESET_FAILED", "не удалось сбросить пароль")
		return
	}

	response := dto.APIResponse[map[string]interface{}]{
		Data: map[string]interface{}{
			"message": "Пароль успешно изменен",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
