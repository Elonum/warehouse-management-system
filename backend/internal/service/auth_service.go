package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/validation"

	"github.com/rs/zerolog/log"
)

var (
	ErrInvalidCredentials      = errors.New("invalid email or password")
	ErrInvalidRole             = errors.New("invalid role")
	ErrPasswordResetTokenInvalid = errors.New("password reset token is invalid or expired")
	ErrPasswordResetTokenExpired  = errors.New("password reset token expired")
	ErrPasswordResetTokenUsed     = errors.New("password reset token has already been used")
)

type AuthService struct {
	userRepo              *repository.UserRepository
	roleRepo              *repository.RoleRepository
	passwordResetRepo     *repository.PasswordResetRepository
	emailService          *EmailService
	jwtManager            *auth.JWTManager
	passwordResetTokenTTL time.Duration // Time-to-live for password reset tokens
}

func NewAuthService(
	userRepo *repository.UserRepository,
	roleRepo *repository.RoleRepository,
	passwordResetRepo *repository.PasswordResetRepository,
	emailService *EmailService,
	jwtManager *auth.JWTManager,
) *AuthService {
	return &AuthService{
		userRepo:              userRepo,
		roleRepo:              roleRepo,
		passwordResetRepo:     passwordResetRepo,
		emailService:          emailService,
		jwtManager:            jwtManager,
		passwordResetTokenTTL: 1 * time.Hour, // Tokens expire after 1 hour
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

// RequestPasswordReset requests a password reset for the given email
// Returns the reset token (for dev mode) and error
// In production, token is sent via email and not returned
func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) (string, error) {
	// Validate email format
	if err := validation.ValidateEmail(email); err != nil {
		// Don't reveal if email exists - always return success
		log.Warn().Str("email", email).Msg("Password reset requested with invalid email format")
		return "", nil // Return success to prevent email enumeration
	}

	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Don't reveal if email exists - always return success
		// This prevents attackers from determining if an email exists
		log.Warn().Str("email", email).Msg("Password reset requested for non-existent email")
		return "", nil // Return success to prevent email enumeration
	}

	// Invalidate any existing active tokens for this user
	if err := s.passwordResetRepo.InvalidateUserTokens(ctx, user.UserID); err != nil {
		log.Warn().Err(err).Str("userId", user.UserID.String()).Msg("Failed to invalidate existing tokens")
		// Continue anyway - not critical
	}

	// Generate secure token (32 random bytes = 256 bits)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		log.Error().Err(err).Msg("Failed to generate password reset token")
		return "", fmt.Errorf("failed to generate reset token")
	}
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	// Hash token with SHA256 for database lookup (one-way hash for security)
	// We store the hash, not the token itself
	tokenHashBytes := sha256.Sum256([]byte(token))
	tokenHash := base64.URLEncoding.EncodeToString(tokenHashBytes[:])

	// Set expiration time
	expiresAt := time.Now().Add(s.passwordResetTokenTTL)

	// Store token in database
	_, err = s.passwordResetRepo.Create(ctx, user.UserID, tokenHash, expiresAt)
	if err != nil {
		log.Error().Err(err).Str("userId", user.UserID.String()).Msg("Failed to create password reset token")
		return "", fmt.Errorf("failed to create reset token")
	}

	// Send email with reset link
	if err := s.emailService.SendPasswordResetEmail(user.Email, token); err != nil {
		log.Error().Err(err).Str("email", user.Email).Msg("Failed to send password reset email")
		// In dev mode, return token even if email fails
		// In production, you might want to return error here
	}

	log.Info().Str("userId", user.UserID.String()).Str("email", email).Msg("Password reset requested")
	return token, nil // Return token for dev mode
}

// ResetPassword resets the user's password using a valid reset token
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	// Validate password strength
	passwordReq := validation.DefaultPasswordRequirements()
	if err := validation.ValidatePassword(newPassword, passwordReq); err != nil {
		log.Warn().Err(err).Msg("Password reset failed: weak password")
		return err
	}

	// Hash the provided token with SHA256 to look it up in database
	tokenHashBytes := sha256.Sum256([]byte(token))
	tokenHash := base64.URLEncoding.EncodeToString(tokenHashBytes[:])

	// Get token from database
	resetToken, err := s.passwordResetRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, repository.ErrPasswordResetTokenNotFound) {
			return ErrPasswordResetTokenInvalid
		}
		return err
	}

	// Check if token is expired
	if time.Now().After(resetToken.ExpiresAt) {
		return ErrPasswordResetTokenExpired
	}

	// Check if token has been used
	if resetToken.UsedAt != nil {
		return ErrPasswordResetTokenUsed
	}

	// Hash new password
	passwordHash, err := auth.HashPassword(newPassword)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash new password")
		return fmt.Errorf("failed to hash password")
	}

	// Update user password
	_, err = s.userRepo.Update(ctx, resetToken.UserID, "", uuid.Nil, nil, nil, nil, &passwordHash)
	if err != nil {
		log.Error().Err(err).Str("userId", resetToken.UserID.String()).Msg("Failed to update user password")
		return fmt.Errorf("failed to update password")
	}

	// Mark token as used
	if err := s.passwordResetRepo.MarkAsUsed(ctx, resetToken.TokenID); err != nil {
		log.Warn().Err(err).Str("tokenId", resetToken.TokenID.String()).Msg("Failed to mark token as used")
		// Don't fail the reset if this fails - password is already changed
	}

	log.Info().Str("userId", resetToken.UserID.String()).Msg("Password reset successfully")
	return nil
}
