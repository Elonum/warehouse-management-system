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
	ErrRoleNotFound = errors.New("role not found")
	ErrRoleExists   = errors.New("role already exists")
)

type Role struct {
	RoleID int
	Name   string
}

type RoleRepository struct {
	pool *pgxpool.Pool
}

func NewRoleRepository(pool *pgxpool.Pool) *RoleRepository {
	return &RoleRepository{pool: pool}
}

func (r *RoleRepository) GetByID(ctx context.Context, roleID int) (*Role, error) {
	query := `
		SELECT role_id, name
		FROM user_roles
		WHERE role_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var role Role
	err := r.pool.QueryRow(ctx, query, roleID).Scan(
		&role.RoleID,
		&role.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}

	return &role, nil
}

func (r *RoleRepository) List(ctx context.Context, limit, offset int) ([]Role, error) {
	query := `
		SELECT role_id, name
		FROM user_roles
		ORDER BY role_id
		LIMIT $1 OFFSET $2
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var role Role
		if err := rows.Scan(
			&role.RoleID,
			&role.Name,
		); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return roles, nil
}

func (r *RoleRepository) Create(ctx context.Context, name string) (*Role, error) {
	query := `
		INSERT INTO user_roles (name)
		VALUES ($1)
		RETURNING role_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var role Role
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&role.RoleID,
		&role.Name,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "user_roles_name_key") {
			return nil, ErrRoleExists
		}
		return nil, err
	}

	return &role, nil
}

func (r *RoleRepository) Update(ctx context.Context, roleID int, name string) (*Role, error) {
	query := `
		UPDATE user_roles
		SET name = $1
		WHERE role_id = $2
		RETURNING role_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var role Role
	err := r.pool.QueryRow(ctx, query, name, roleID).Scan(
		&role.RoleID,
		&role.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRoleNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "user_roles_name_key") {
			return nil, ErrRoleExists
		}
		return nil, err
	}

	return &role, nil
}

func (r *RoleRepository) Delete(ctx context.Context, roleID int) error {
	query := `
		DELETE FROM user_roles
		WHERE role_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, roleID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrRoleNotFound
	}

	return nil
}
