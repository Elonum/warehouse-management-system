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
	ErrWarehouseTypeNotFound = errors.New("warehouse type not found")
	ErrWarehouseTypeExists   = errors.New("warehouse type already exists")
)

type WarehouseType struct {
	WarehouseTypeID int
	Name            string
}

type WarehouseTypeRepository struct {
	pool *pgxpool.Pool
}

func NewWarehouseTypeRepository(pool *pgxpool.Pool) *WarehouseTypeRepository {
	return &WarehouseTypeRepository{pool: pool}
}

func (r *WarehouseTypeRepository) GetByID(ctx context.Context, warehouseTypeID int) (*WarehouseType, error) {
	query := `
		SELECT warehouse_type_id, name
		FROM warehouse_types
		WHERE warehouse_type_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouseType WarehouseType
	err := r.pool.QueryRow(ctx, query, warehouseTypeID).Scan(
		&warehouseType.WarehouseTypeID,
		&warehouseType.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWarehouseTypeNotFound
		}
		return nil, err
	}

	return &warehouseType, nil
}

func (r *WarehouseTypeRepository) List(ctx context.Context, limit, offset int) ([]WarehouseType, error) {
	query := fmt.Sprintf(`
		SELECT warehouse_type_id, name
		FROM warehouse_types
		ORDER BY warehouse_type_id
		LIMIT $1 OFFSET $2
	`)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var warehouseTypes []WarehouseType
	for rows.Next() {
		var warehouseType WarehouseType
		if err := rows.Scan(
			&warehouseType.WarehouseTypeID,
			&warehouseType.Name,
		); err != nil {
			return nil, err
		}
		warehouseTypes = append(warehouseTypes, warehouseType)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return warehouseTypes, nil
}

func (r *WarehouseTypeRepository) Create(ctx context.Context, name string) (*WarehouseType, error) {
	query := `
		INSERT INTO warehouse_types (name)
		VALUES ($1)
		RETURNING warehouse_type_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouseType WarehouseType
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&warehouseType.WarehouseTypeID,
		&warehouseType.Name,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "warehouse_types_name_key") {
			return nil, ErrWarehouseTypeExists
		}
		return nil, err
	}

	return &warehouseType, nil
}

func (r *WarehouseTypeRepository) Update(ctx context.Context, warehouseTypeID int, name string) (*WarehouseType, error) {
	query := `
		UPDATE warehouse_types
		SET name = $1
		WHERE warehouse_type_id = $2
		RETURNING warehouse_type_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouseType WarehouseType
	err := r.pool.QueryRow(ctx, query, name, warehouseTypeID).Scan(
		&warehouseType.WarehouseTypeID,
		&warehouseType.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWarehouseTypeNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrWarehouseTypeExists
		}
		return nil, err
	}

	return &warehouseType, nil
}

func (r *WarehouseTypeRepository) Delete(ctx context.Context, warehouseTypeID int) error {
	query := `
		DELETE FROM warehouse_types
		WHERE warehouse_type_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, warehouseTypeID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrWarehouseTypeNotFound
	}

	return nil
}
