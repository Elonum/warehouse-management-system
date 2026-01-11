package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound = errors.New("user not found")
	ErrUserExists   = errors.New("user already exists")
)

type User struct {
	UserID      int
	Email       string
	Name        *string
	Surname     *string
	Patronymic  *string
	PasswordHash string
	RoleID      int
}

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// GetByEmail получает пользователя по email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT "userId", email, "name", surname, patronymic, "passwordHash", "roleId"
		FROM Users
		WHERE email = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var user User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.UserID,
		&user.Email,
		&user.Name,
		&user.Surname,
		&user.Patronymic,
		&user.PasswordHash,
		&user.RoleID,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

// GetByID получает пользователя по ID
func (r *UserRepository) GetByID(ctx context.Context, userID int) (*User, error) {
	query := `
		SELECT "userId", email, "name", surname, patronymic, "passwordHash", "roleId"
		FROM Users
		WHERE "userId" = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var user User
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&user.UserID,
		&user.Email,
		&user.Name,
		&user.Surname,
		&user.Patronymic,
		&user.PasswordHash,
		&user.RoleID,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

// Create создает нового пользователя
func (r *UserRepository) Create(ctx context.Context, email, passwordHash string, roleID int, name, surname, patronymic *string) (*User, error) {
	query := `
		INSERT INTO Users (email, "passwordHash", "roleId", "name", surname, patronymic)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING "userId", email, "name", surname, patronymic, "passwordHash", "roleId"
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var user User
	err := r.pool.QueryRow(ctx, query, email, passwordHash, roleID, name, surname, patronymic).Scan(
		&user.UserID,
		&user.Email,
		&user.Name,
		&user.Surname,
		&user.Patronymic,
		&user.PasswordHash,
		&user.RoleID,
	)

	if err != nil {
		// Проверяем на дубликат email (UNIQUE constraint)
		if err.Error() == "duplicate key value violates unique constraint \"users_email_key\"" {
			return nil, ErrUserExists
		}
		return nil, err
	}

	return &user, nil
}

