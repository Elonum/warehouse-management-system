package handlers

import (
	"encoding/json"
	"net/http"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(service *service.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

// Login обрабатывает запрос на вход
// POST /api/v1/auth/login
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

	// Валидация
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "email and password are required")
		return
	}

	token, user, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if err == service.ErrInvalidCredentials {
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
			return
		}
		writeError(w, http.StatusInternalServerError, "LOGIN_FAILED", "failed to login")
		return
	}

	response := dto.APIResponse[dto.LoginResponse]{
		Data: dto.LoginResponse{
			Token: token,
			User: dto.UserResponse{
				UserID:     user.UserID,
				Email:      user.Email,
				Name:       user.Name,
				Surname:    user.Surname,
				Patronymic: user.Patronymic,
				RoleID:     user.RoleID,
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Register обрабатывает запрос на регистрацию
// POST /api/v1/auth/register
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

	// Валидация
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
		if err == repository.ErrUserExists {
			writeError(w, http.StatusConflict, "USER_EXISTS", "user with this email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "REGISTER_FAILED", "failed to register user")
		return
	}

	response := dto.APIResponse[dto.UserResponse]{
		Data: dto.UserResponse{
			UserID:     user.UserID,
			Email:      user.Email,
			Name:       user.Name,
			Surname:    user.Surname,
			Patronymic: user.Patronymic,
			RoleID:     user.RoleID,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

