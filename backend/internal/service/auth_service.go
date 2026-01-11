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

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtManager *auth.JWTManager
}

func NewAuthService(userRepo *repository.UserRepository, jwtManager *auth.JWTManager) *AuthService {
	return &AuthService{
		userRepo:   userRepo,
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

