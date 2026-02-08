package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/validation"

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

// Login authenticates a user and returns a JWT token
// Implements timing attack protection by always performing password check
// even if user doesn't exist, to prevent user enumeration
func (s *AuthService) Login(ctx context.Context, email, password string) (string, *repository.User, error) {
	// Validate email format first
	if err := validation.ValidateEmail(email); err != nil {
		log.Warn().Str("email", email).Msg("Login failed: invalid email format")
		return "", nil, ErrInvalidCredentials
	}

	// Start timing to ensure consistent response time
	startTime := time.Now()

	// Always perform password check to prevent timing attacks
	// Use a dummy hash if user doesn't exist
	dummyHash := "$2a$10$dummy.hash.to.prevent.timing.attacks"
	
	user, err := s.userRepo.GetByEmail(ctx, email)
	userExists := err == nil && user != nil
	
	// Get the hash to check (real or dummy)
	hashToCheck := dummyHash
	if userExists {
		hashToCheck = user.PasswordHash
	}

	// Always perform password check, even if user doesn't exist
	// This prevents attackers from determining if an email exists by timing
	passwordValid := auth.CheckPassword(password, hashToCheck)

	// Ensure minimum processing time to prevent timing attacks
	// This adds a small delay to make timing attacks harder
	elapsed := time.Since(startTime)
	minProcessingTime := 200 * time.Millisecond
	if elapsed < minProcessingTime {
		time.Sleep(minProcessingTime - elapsed)
	}

	// Now check if credentials are valid
	if !userExists || !passwordValid {
		// Use constant-time comparison for error message
		// Always return the same error to prevent information leakage
		log.Warn().Str("email", email).Msg("Login failed: invalid credentials")
		return "", nil, ErrInvalidCredentials
	}

	token, err := s.jwtManager.GenerateToken(user.UserID, user.Email, user.RoleID)
	if err != nil {
		log.Error().Err(err).Str("userId", user.UserID.String()).Msg("Failed to generate JWT token")
		return "", nil, err
	}

	log.Info().Str("userId", user.UserID.String()).Str("email", email).Msg("User logged in successfully")
	return token, user, nil
}

func (s *AuthService) Register(ctx context.Context, email, password string, roleIDStr string, name, surname, patronymic *string) (*repository.User, error) {
	// Validate email format
	if err := validation.ValidateEmail(email); err != nil {
		log.Warn().Str("email", email).Err(err).Msg("Registration failed: invalid email format")
		return nil, err
	}

	// Validate password strength
	passwordReq := validation.DefaultPasswordRequirements()
	if err := validation.ValidatePassword(password, passwordReq); err != nil {
		log.Warn().Str("email", email).Err(err).Msg("Registration failed: weak password")
		return nil, err
	}

	// Validate role ID
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		log.Warn().Str("roleId", roleIDStr).Msg("Invalid role ID format")
		return nil, ErrInvalidRole
	}

	// Verify role exists
	_, err = s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, repository.ErrRoleNotFound) {
			return nil, ErrInvalidRole
		}
		return nil, err
	}

	// Hash password
	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password")
		return nil, err
	}

	// Create user
	user, err := s.userRepo.Create(ctx, email, passwordHash, roleID, name, surname, patronymic)
	if err != nil {
		log.Error().Err(err).Str("email", email).Str("roleId", roleIDStr).Msg("Failed to create user")
		return nil, err
	}

	log.Info().Str("userId", user.UserID.String()).Str("email", email).Msg("User registered successfully")
	return user, nil
}

func (s *AuthService) GetCurrentUser(ctx context.Context, userID uuid.UUID) (*repository.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to get current user")
		return nil, err
	}
	return user, nil
}
