package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound = errors.New("user not found")
	ErrUserExists   = errors.New("user already exists")
)

type User struct {
	UserID       int
	Email        string
	Name         *string
	Surname      *string
	Patronymic   *string
	PasswordHash string
	RoleID       int
}

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT user_id, email, name, surname, patronymic, password_hash, role_id
		FROM users
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

func (r *UserRepository) GetByID(ctx context.Context, userID int) (*User, error) {
	query := `
		SELECT user_id, email, name, surname, patronymic, password_hash, role_id
		FROM users
		WHERE user_id = $1
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

func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]User, error) {
	query := `
		SELECT user_id, email, name, surname, patronymic, password_hash, role_id
		FROM users
		ORDER BY user_id
		LIMIT $1 OFFSET $2
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		if err := rows.Scan(
			&user.UserID,
			&user.Email,
			&user.Name,
			&user.Surname,
			&user.Patronymic,
			&user.PasswordHash,
			&user.RoleID,
		); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func (r *UserRepository) Create(ctx context.Context, email, passwordHash string, roleID int, name, surname, patronymic *string) (*User, error) {
	query := `
		INSERT INTO users (email, password_hash, role_id, name, surname, patronymic)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING user_id, email, name, surname, patronymic, password_hash, role_id
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
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "users_email_key") {
			return nil, ErrUserExists
		}

		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) Update(ctx context.Context, userID int, email string, roleID int, name, surname, patronymic *string) (*User, error) {
	query := `
		UPDATE users
		SET email = $1, role_id = $2, name = $3, surname = $4, patronymic = $5
		WHERE user_id = $6
		RETURNING user_id, email, name, surname, patronymic, password_hash, role_id
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var user User
	err := r.pool.QueryRow(ctx, query, email, roleID, name, surname, patronymic, userID).Scan(
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
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "users_email_key") {
			return nil, ErrUserExists
		}
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) Delete(ctx context.Context, userID int) error {
	query := `
		DELETE FROM users
		WHERE user_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}
