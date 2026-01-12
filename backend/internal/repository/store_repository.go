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
	ErrStoreNotFound = errors.New("store not found")
	ErrStoreExists   = errors.New("store already exists")
)

type Store struct {
	StoreID int
	Name    string
}

type StoreRepository struct {
	pool *pgxpool.Pool
}

func NewStoreRepository(pool *pgxpool.Pool) *StoreRepository {
	return &StoreRepository{pool: pool}
}

func (r *StoreRepository) GetByID(ctx context.Context, storeID int) (*Store, error) {
	query := `
		SELECT store_id, name
		FROM stores
		WHERE store_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var store Store
	err := r.pool.QueryRow(ctx, query, storeID).Scan(
		&store.StoreID,
		&store.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStoreNotFound
		}
		return nil, err
	}

	return &store, nil
}

func (r *StoreRepository) List(ctx context.Context, limit, offset int) ([]Store, error) {
	query := `
		SELECT store_id, name
		FROM stores
		ORDER BY store_id
		LIMIT $1 OFFSET $2
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stores []Store
	for rows.Next() {
		var store Store
		if err := rows.Scan(
			&store.StoreID,
			&store.Name,
		); err != nil {
			return nil, err
		}
		stores = append(stores, store)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return stores, nil
}

func (r *StoreRepository) Create(ctx context.Context, name string) (*Store, error) {
	query := `
		INSERT INTO stores (name)
		VALUES ($1)
		RETURNING store_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var store Store
	err := r.pool.QueryRow(ctx, query, name).Scan(
		&store.StoreID,
		&store.Name,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "stores_name_key") {
			return nil, ErrStoreExists
		}
		return nil, err
	}

	return &store, nil
}

func (r *StoreRepository) Update(ctx context.Context, storeID int, name string) (*Store, error) {
	query := `
		UPDATE stores
		SET name = $1
		WHERE store_id = $2
		RETURNING store_id, name
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var store Store
	err := r.pool.QueryRow(ctx, query, name, storeID).Scan(
		&store.StoreID,
		&store.Name,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStoreNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrStoreExists
		}
		return nil, err
	}

	return &store, nil
}

func (r *StoreRepository) Delete(ctx context.Context, storeID int) error {
	query := `
		DELETE FROM stores
		WHERE store_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, storeID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrStoreNotFound
	}

	return nil
}

