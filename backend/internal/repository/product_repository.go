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
	ErrProductNotFound = errors.New("product not found")
	ErrProductExists   = errors.New("product already exists")
)

type Product struct {
	ProductID      uuid.UUID
	Article        string
	Barcode        string
	UnitWeight     int
	UnitCost       *float64
	PurchasePrice  *float64
	ProcessingPrice *float64
}

type ProductRepository struct {
	pool *pgxpool.Pool
}

func NewProductRepository(pool *pgxpool.Pool) *ProductRepository {
	return &ProductRepository{pool: pool}
}

func (r *ProductRepository) GetByID(ctx context.Context, productID uuid.UUID) (*Product, error) {
	query := `
		SELECT product_id, article, barcode, unit_weight, unit_cost, purchase_price, processing_price
		FROM products
		WHERE product_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var product Product
	err := r.pool.QueryRow(ctx, query, productID).Scan(
		&product.ProductID,
		&product.Article,
		&product.Barcode,
		&product.UnitWeight,
		&product.UnitCost,
		&product.PurchasePrice,
		&product.ProcessingPrice,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}

	return &product, nil
}

func (r *ProductRepository) GetByArticle(ctx context.Context, article string) (*Product, error) {
	query := `
		SELECT product_id, article, barcode, unit_weight, unit_cost, purchase_price, processing_price
		FROM products
		WHERE article = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var product Product
	err := r.pool.QueryRow(ctx, query, article).Scan(
		&product.ProductID,
		&product.Article,
		&product.Barcode,
		&product.UnitWeight,
		&product.UnitCost,
		&product.PurchasePrice,
		&product.ProcessingPrice,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}

	return &product, nil
}

func (r *ProductRepository) GetByBarcode(ctx context.Context, barcode string) (*Product, error) {
	query := `
		SELECT product_id, article, barcode, unit_weight, unit_cost, purchase_price, processing_price
		FROM products
		WHERE barcode = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var product Product
	err := r.pool.QueryRow(ctx, query, barcode).Scan(
		&product.ProductID,
		&product.Article,
		&product.Barcode,
		&product.UnitWeight,
		&product.UnitCost,
		&product.PurchasePrice,
		&product.ProcessingPrice,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}

	return &product, nil
}

func (r *ProductRepository) List(ctx context.Context, limit, offset int) ([]Product, error) {
	query := `
		SELECT product_id, article, barcode, unit_weight, unit_cost, purchase_price, processing_price
		FROM products
		ORDER BY product_id
		LIMIT $1 OFFSET $2
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var product Product
		if err := rows.Scan(
			&product.ProductID,
			&product.Article,
			&product.Barcode,
			&product.UnitWeight,
			&product.UnitCost,
			&product.PurchasePrice,
			&product.ProcessingPrice,
		); err != nil {
			return nil, err
		}
		products = append(products, product)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *ProductRepository) Create(ctx context.Context, article, barcode string, unitWeight int, unitCost, purchasePrice, processingPrice *float64) (*Product, error) {
	query := `
		INSERT INTO products (article, barcode, unit_weight, unit_cost, purchase_price, processing_price)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING product_id, article, barcode, unit_weight, unit_cost, purchase_price, processing_price
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var product Product
	err := r.pool.QueryRow(ctx, query, article, barcode, unitWeight, unitCost, purchasePrice, processingPrice).Scan(
		&product.ProductID,
		&product.Article,
		&product.Barcode,
		&product.UnitWeight,
		&product.UnitCost,
		&product.PurchasePrice,
		&product.ProcessingPrice,
	)

	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") ||
			strings.Contains(errMsg, "product_article_key") ||
			strings.Contains(errMsg, "product_barcode_key") {
			return nil, ErrProductExists
		}
		return nil, err
	}

	return &product, nil
}

func (r *ProductRepository) Update(ctx context.Context, productID uuid.UUID, article, barcode string, unitWeight int, unitCost, purchasePrice, processingPrice *float64) (*Product, error) {
	query := `
		UPDATE products
		SET article = $1, barcode = $2, unit_weight = $3, unit_cost = $4, purchase_price = $5, processing_price = $6
		WHERE product_id = $7
		RETURNING product_id, article, barcode, unit_weight, unit_cost, purchase_price, processing_price
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var product Product
	err := r.pool.QueryRow(ctx, query, article, barcode, unitWeight, unitCost, purchasePrice, processingPrice, productID).Scan(
		&product.ProductID,
		&product.Article,
		&product.Barcode,
		&product.UnitWeight,
		&product.UnitCost,
		&product.PurchasePrice,
		&product.ProcessingPrice,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductNotFound
		}
		errMsg := err.Error()
		if strings.Contains(errMsg, "duplicate key") ||
			strings.Contains(errMsg, "unique constraint") {
			return nil, ErrProductExists
		}
		return nil, err
	}

	return &product, nil
}

func (r *ProductRepository) Delete(ctx context.Context, productID uuid.UUID) error {
	query := `
		DELETE FROM products
		WHERE product_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, productID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrProductNotFound
	}

	return nil
}
