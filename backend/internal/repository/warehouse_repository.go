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
	ErrWarehouseNotFound = errors.New("warehouse not found")
	ErrWarehouseExists   = errors.New("warehouse already exists")
)

type Warehouse struct {
	WarehouseID     int
	Name            string
	WarehouseTypeID *int
	Location        *string
}

type WarehouseRepository struct {
	pool *pgxpool.Pool
}

func NewWarehouseRepository(pool *pgxpool.Pool) *WarehouseRepository {
	return &WarehouseRepository{pool: pool}
}

func (r *WarehouseRepository) GetByID(ctx context.Context, warehouseID int) (*Warehouse, error) {
	query := `
		SELECT warehouse_id, name, warehouse_type_id, location
		FROM warehouses
		WHERE warehouse_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouse Warehouse
	err := r.pool.QueryRow(ctx, query, warehouseID).Scan(
		&warehouse.WarehouseID,
		&warehouse.Name,
		&warehouse.WarehouseTypeID,
		&warehouse.Location,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWarehouseNotFound
		}
		return nil, err
	}

	return &warehouse, nil
}

func (r *WarehouseRepository) List(ctx context.Context, limit, offset int) ([]Warehouse, error) {
	query := `
		SELECT warehouse_id, name, warehouse_type_id, location
		FROM warehouses
		ORDER BY warehouse_id
		LIMIT $1 OFFSET $2
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var warehouses []Warehouse
	for rows.Next() {
		var warehouse Warehouse
		if err := rows.Scan(
			&warehouse.WarehouseID,
			&warehouse.Name,
			&warehouse.WarehouseTypeID,
			&warehouse.Location,
		); err != nil {
			return nil, err
		}
		warehouses = append(warehouses, warehouse)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return warehouses, nil
}

func (r *WarehouseRepository) Create(ctx context.Context, name string, warehouseTypeID *int, location *string) (*Warehouse, error) {
	query := `
		INSERT INTO warehouses (name, warehouse_type_id, location)
		VALUES ($1, $2, $3)
		RETURNING warehouse_id, name, warehouse_type_id, location
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouse Warehouse
	err := r.pool.QueryRow(ctx, query, name, warehouseTypeID, location).Scan(
		&warehouse.WarehouseID,
		&warehouse.Name,
		&warehouse.WarehouseTypeID,
		&warehouse.Location,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "warehouses_name_key") {
			return nil, ErrWarehouseExists
		}
		return nil, err
	}

	return &warehouse, nil
}

func (r *WarehouseRepository) Update(ctx context.Context, warehouseID int, name string, warehouseTypeID *int, location *string) (*Warehouse, error) {
	query := `
		UPDATE warehouses
		SET name = $1, warehouse_type_id = $2, location = $3
		WHERE warehouse_id = $4
		RETURNING warehouse_id, name, warehouse_type_id, location
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouse Warehouse
	err := r.pool.QueryRow(ctx, query, name, warehouseTypeID, location, warehouseID).Scan(
		&warehouse.WarehouseID,
		&warehouse.Name,
		&warehouse.WarehouseTypeID,
		&warehouse.Location,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWarehouseNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrWarehouseExists
		}
		return nil, err
	}

	return &warehouse, nil
}

func (r *WarehouseRepository) Delete(ctx context.Context, warehouseID int) error {
	query := `
		DELETE FROM warehouses
		WHERE warehouse_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, warehouseID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrWarehouseNotFound
	}

	return nil
}
