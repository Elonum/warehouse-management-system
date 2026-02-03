package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrProductImageNotFound = errors.New("product image not found")
)

type ProductImage struct {
	ImageID     uuid.UUID
	ProductID   uuid.UUID
	FilePath    string
	DisplayOrder int
	IsMain      bool
	CreatedAt   time.Time
}

type ProductImageRepository struct {
	pool *pgxpool.Pool
}

func NewProductImageRepository(pool *pgxpool.Pool) *ProductImageRepository {
	return &ProductImageRepository{pool: pool}
}

func (r *ProductImageRepository) GetByProductID(ctx context.Context, productID uuid.UUID) ([]ProductImage, error) {
	query := `
		SELECT image_id, product_id, file_path, display_order, is_main, created_at
		FROM product_images
		WHERE product_id = $1
		ORDER BY display_order ASC, created_at ASC
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []ProductImage
	for rows.Next() {
		var image ProductImage
		if err := rows.Scan(
			&image.ImageID,
			&image.ProductID,
			&image.FilePath,
			&image.DisplayOrder,
			&image.IsMain,
			&image.CreatedAt,
		); err != nil {
			return nil, err
		}
		images = append(images, image)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return images, nil
}

func (r *ProductImageRepository) GetByID(ctx context.Context, imageID uuid.UUID) (*ProductImage, error) {
	query := `
		SELECT image_id, product_id, file_path, display_order, is_main, created_at
		FROM product_images
		WHERE image_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var image ProductImage
	err := r.pool.QueryRow(ctx, query, imageID).Scan(
		&image.ImageID,
		&image.ProductID,
		&image.FilePath,
		&image.DisplayOrder,
		&image.IsMain,
		&image.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductImageNotFound
		}
		return nil, err
	}

	return &image, nil
}

func (r *ProductImageRepository) Create(ctx context.Context, productID uuid.UUID, filePath string, displayOrder int, isMain bool) (*ProductImage, error) {
	// If this image is marked as main, unset other main images for this product
	if isMain {
		_, err := r.pool.Exec(ctx, `
			UPDATE product_images
			SET is_main = FALSE
			WHERE product_id = $1 AND is_main = TRUE
		`, productID)
		if err != nil {
			return nil, err
		}
	}

	query := `
		INSERT INTO product_images (product_id, file_path, display_order, is_main)
		VALUES ($1, $2, $3, $4)
		RETURNING image_id, product_id, file_path, display_order, is_main, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var image ProductImage
	err := r.pool.QueryRow(ctx, query, productID, filePath, displayOrder, isMain).Scan(
		&image.ImageID,
		&image.ProductID,
		&image.FilePath,
		&image.DisplayOrder,
		&image.IsMain,
		&image.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &image, nil
}

func (r *ProductImageRepository) UpdateDisplayOrder(ctx context.Context, imageID uuid.UUID, displayOrder int) error {
	query := `
		UPDATE product_images
		SET display_order = $1
		WHERE image_id = $2
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, displayOrder, imageID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrProductImageNotFound
	}

	return nil
}

func (r *ProductImageRepository) SetAsMain(ctx context.Context, imageID uuid.UUID, productID uuid.UUID) error {
	// Start transaction to ensure atomicity
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Unset all main images for this product
	_, err = tx.Exec(ctx, `
		UPDATE product_images
		SET is_main = FALSE
		WHERE product_id = $1
	`, productID)
	if err != nil {
		return err
	}

	// Set this image as main
	result, err := tx.Exec(ctx, `
		UPDATE product_images
		SET is_main = TRUE
		WHERE image_id = $1 AND product_id = $2
	`, imageID, productID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrProductImageNotFound
	}

	return tx.Commit(ctx)
}

func (r *ProductImageRepository) Delete(ctx context.Context, imageID uuid.UUID) error {
	query := `
		DELETE FROM product_images
		WHERE image_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, imageID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrProductImageNotFound
	}

	return nil
}

func (r *ProductImageRepository) DeleteByProductID(ctx context.Context, productID uuid.UUID) error {
	query := `
		DELETE FROM product_images
		WHERE product_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.pool.Exec(ctx, query, productID)
	return err
}

