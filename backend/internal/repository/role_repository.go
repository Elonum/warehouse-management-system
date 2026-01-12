package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrRoleNotFound = errors.New("role not found")
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
