package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrWarehouseTypeNotFound = errors.New("warehouse type not found")
	ErrWarehouseTypeExists   = errors.New("warehouse type already exists")
)

type WarehouseType struct {
	WarehouseTypeID uuid.UUID
	Name            string
	IsMarketplace   bool
}

type WarehouseTypeRepository struct {
	pool *pgxpool.Pool
}

func NewWarehouseTypeRepository(pool *pgxpool.Pool) *WarehouseTypeRepository {
	return &WarehouseTypeRepository{pool: pool}
}

func (r *WarehouseTypeRepository) GetByID(ctx context.Context, warehouseTypeID uuid.UUID) (*WarehouseType, error) {
	query := `
		SELECT warehouse_type_id, name, is_marketplace
		FROM warehouse_types
		WHERE warehouse_type_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouseType WarehouseType
	err := r.pool.QueryRow(ctx, query, warehouseTypeID).Scan(
		&warehouseType.WarehouseTypeID,
		&warehouseType.Name,
		&warehouseType.IsMarketplace,
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
	query := `
		SELECT warehouse_type_id, name, is_marketplace
		FROM warehouse_types
		ORDER BY warehouse_type_id
		LIMIT $1 OFFSET $2
	`

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
			&warehouseType.IsMarketplace,
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

func (r *WarehouseTypeRepository) Create(ctx context.Context, name string, isMarketplace bool) (*WarehouseType, error) {
	query := `
		INSERT INTO warehouse_types (name, is_marketplace)
		VALUES ($1, $2)
		RETURNING warehouse_type_id, name, is_marketplace
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouseType WarehouseType
	err := r.pool.QueryRow(ctx, query, name, isMarketplace).Scan(
		&warehouseType.WarehouseTypeID,
		&warehouseType.Name,
		&warehouseType.IsMarketplace,
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

func (r *WarehouseTypeRepository) Update(ctx context.Context, warehouseTypeID uuid.UUID, name string, isMarketplace bool) (*WarehouseType, error) {
	query := `
		UPDATE warehouse_types
		SET name = $1, is_marketplace = $2
		WHERE warehouse_type_id = $3
		RETURNING warehouse_type_id, name, is_marketplace
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var warehouseType WarehouseType
	err := r.pool.QueryRow(ctx, query, name, isMarketplace, warehouseTypeID).Scan(
		&warehouseType.WarehouseTypeID,
		&warehouseType.Name,
		&warehouseType.IsMarketplace,
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

func (r *WarehouseTypeRepository) Delete(ctx context.Context, warehouseTypeID uuid.UUID) error {
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
