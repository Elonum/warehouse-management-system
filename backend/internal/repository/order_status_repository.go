package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrOrderStatusNotFound = errors.New("order status not found")
	ErrOrderStatusExists   = errors.New("order status already exists")
)

type OrderStatus struct {
	OrderStatusID int
	Name          string
}

type OrderStatusRepository struct {
	pool *pgxpool.Pool
}

func NewOrderStatusRepository(pool *pgxpool.Pool) *OrderStatusRepository {
	return &OrderStatusRepository{pool: pool}
}

func (r *OrderStatusRepository) GetByID(ctx context.Context, statusID int) (*OrderStatus, error) {
	query := `
		SELECT order_status_id, name
		FROM order_statuses
		WHERE order_status_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status OrderStatus
	err := r.pool.QueryRow(ctx, query, statusID).Scan(
		&status.OrderStatusID,
		&status.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderStatusNotFound
		}
		return nil, err
	}

	return &status, nil
}

func (r *OrderStatusRepository) List(ctx context.Context, limit, offset int) ([]OrderStatus, error) {
	query := fmt.Sprintf(`
		SELECT order_status_id, name
		FROM order_statuses
		ORDER BY order_status_id
		LIMIT $1 OFFSET $2
	`)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var statuses []OrderStatus
	for rows.Next() {
		var status OrderStatus
		if err := rows.Scan(
			&status.OrderStatusID,
			&status.Name,
		); err != nil {
			return nil, err
		}
		statuses = append(statuses, status)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return statuses, nil
}

func (r *OrderStatusRepository) Create(ctx context.Context, name string) (*OrderStatus, error) {
	query := `
		INSERT INTO order_statuses (name)
		VALUES ($1)
		RETURNING order_status_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status OrderStatus
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&status.OrderStatusID,
		&status.Name,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "order_statuses_name_key") {
			return nil, ErrOrderStatusExists
		}
		return nil, err
	}

	return &status, nil
}

func (r *OrderStatusRepository) Update(ctx context.Context, statusID int, name string) (*OrderStatus, error) {
	query := `
		UPDATE order_statuses
		SET name = $1
		WHERE order_status_id = $2
		RETURNING order_status_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var status OrderStatus
	err := r.pool.QueryRow(ctx, query, name, statusID).Scan(
		&status.OrderStatusID,
		&status.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderStatusNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrOrderStatusExists
		}
		return nil, err
	}

	return &status, nil
}

func (r *OrderStatusRepository) Delete(ctx context.Context, statusID int) error {
	query := `
		DELETE FROM order_statuses
		WHERE order_status_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, statusID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrOrderStatusNotFound
	}

	return nil
}
