package service

import (
	"context"
	"errors"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
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

func (s *AuthService) Login(ctx context.Context, email, password string) (string, *repository.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			log.Warn().Str("email", email).Msg("Login failed: user not found")
			return "", nil, ErrInvalidCredentials
		}
		log.Error().Err(err).Str("email", email).Msg("Failed to get user by email")
		return "", nil, err
	}

	if !auth.CheckPassword(password, user.PasswordHash) {
		log.Warn().Str("email", email).Msg("Login failed: invalid password")
		return "", nil, ErrInvalidCredentials
	}

	token, err := s.jwtManager.GenerateToken(user.UserID, user.Email, user.RoleID)
	if err != nil {
		log.Error().Err(err).Int("userId", user.UserID).Msg("Failed to generate JWT token")
		return "", nil, err
	}

	log.Info().Int("userId", user.UserID).Str("email", email).Msg("User logged in successfully")
	return token, user, nil
}

func (s *AuthService) Register(ctx context.Context, email, password string, roleID int, name, surname, patronymic *string) (*repository.User, error) {
	if roleID > 0 {
		_, err := s.roleRepo.GetByID(ctx, roleID)
		if err != nil {
			if errors.Is(err, repository.ErrRoleNotFound) {
				return nil, ErrInvalidRole
			}
			return nil, err
		}
	}

	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.Create(ctx, email, passwordHash, roleID, name, surname, patronymic)
	if err != nil {
		log.Error().Err(err).Str("email", email).Int("roleId", roleID).Msg("Failed to create user")
		return nil, err
	}

	log.Info().Int("userId", user.UserID).Str("email", email).Msg("User registered successfully")
	return user, nil
}

func (s *AuthService) GetCurrentUser(ctx context.Context, userID int) (*repository.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		log.Error().Err(err).Int("userId", userID).Msg("Failed to get current user")
		return nil, err
	}
	return user, nil
}

