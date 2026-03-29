package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrPasswordResetTokenNotFound = errors.New("password reset token not found")
	ErrPasswordResetTokenExpired  = errors.New("password reset token expired")
	ErrPasswordResetTokenUsed     = errors.New("password reset token already used")
)

type PasswordResetToken struct {
	TokenID   uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}

type PasswordResetRepository struct {
	pool *pgxpool.Pool
}

func NewPasswordResetRepository(pool *pgxpool.Pool) *PasswordResetRepository {
	return &PasswordResetRepository{pool: pool}
}

// Create creates a new password reset token
func (r *PasswordResetRepository) Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*PasswordResetToken, error) {
	query := `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING token_id, user_id, token_hash, expires_at, used_at, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var token PasswordResetToken
	err := r.pool.QueryRow(ctx, query, userID, tokenHash, expiresAt).Scan(
		&token.TokenID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.UsedAt,
		&token.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &token, nil
}

// GetByTokenHash retrieves a password reset token by its hash
func (r *PasswordResetRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*PasswordResetToken, error) {
	query := `
		SELECT token_id, user_id, token_hash, expires_at, used_at, created_at
		FROM password_reset_tokens
		WHERE token_hash = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var token PasswordResetToken
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&token.TokenID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.UsedAt,
		&token.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPasswordResetTokenNotFound
		}
		return nil, err
	}

	return &token, nil
}

// MarkAsUsed marks a password reset token as used
func (r *PasswordResetRepository) MarkAsUsed(ctx context.Context, tokenID uuid.UUID) error {
	query := `
		UPDATE password_reset_tokens
		SET used_at = CURRENT_TIMESTAMP
		WHERE token_id = $1 AND used_at IS NULL
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, tokenID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrPasswordResetTokenUsed
	}

	return nil
}

// DeleteExpiredTokens deletes expired tokens (cleanup job)
func (r *PasswordResetRepository) DeleteExpiredTokens(ctx context.Context) error {
	query := `
		DELETE FROM password_reset_tokens
		WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL
	`

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query)
	return err
}

// InvalidateUserTokens invalidates all active tokens for a user (when requesting new reset)
func (r *PasswordResetRepository) InvalidateUserTokens(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE password_reset_tokens
		SET used_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, userID)
	return err
}
