package service

import (
	"context"
	"errors"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
)

var (
	ErrInvalidRole = errors.New("invalid role")
)

type AuthService struct {
	userRepo   *repository.UserRepository
	roleRepo   *repository.RoleRepository
	jwtManager *auth.JWTManager
}

func NewAuthService(userRepo *repository.UserRepository, roleRepo *repository.RoleRepository, jwtManager *auth.JWTManager) *AuthService {
	return &AuthService{
		userRepo:   userRepo,
		roleRepo:   roleRepo,
		jwtManager: jwtManager,
	}
}

// Login проверяет учетные данные и возвращает JWT токен
func (s *AuthService) Login(ctx context.Context, email, password string) (string, *repository.User, error) {
	// Получаем пользователя по email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, err
	}

	// Проверяем пароль
	if !auth.CheckPassword(password, user.PasswordHash) {
		return "", nil, ErrInvalidCredentials
	}

	// Генерируем JWT токен
	token, err := s.jwtManager.GenerateToken(user.UserID, user.Email, user.RoleID)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

// Register создает нового пользователя
func (s *AuthService) Register(ctx context.Context, email, password string, roleID int, name, surname, patronymic *string) (*repository.User, error) {
	// Проверяем существование роли перед регистрацией
	if roleID > 0 {
		_, err := s.roleRepo.GetByID(ctx, roleID)
		if err != nil {
			if errors.Is(err, repository.ErrRoleNotFound) {
				return nil, ErrInvalidRole
			}
			return nil, err
		}
	}

	// Хешируем пароль
	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	// Создаем пользователя
	user, err := s.userRepo.Create(ctx, email, passwordHash, roleID, name, surname, patronymic)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// GetCurrentUser получает информацию о текущем пользователе по ID из контекста
func (s *AuthService) GetCurrentUser(ctx context.Context, userID int) (*repository.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return user, nil
}

