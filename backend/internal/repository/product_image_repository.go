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
		SELECT image_id, product_id, file_path, display_order, created_at
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
		SELECT image_id, product_id, file_path, display_order, created_at
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

func (r *ProductImageRepository) Create(ctx context.Context, productID uuid.UUID, filePath string, displayOrder int) (*ProductImage, error) {
	query := `
		INSERT INTO product_images (product_id, file_path, display_order)
		VALUES ($1, $2, $3)
		RETURNING image_id, product_id, file_path, display_order, created_at
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var image ProductImage
	err := r.pool.QueryRow(ctx, query, productID, filePath, displayOrder).Scan(
		&image.ImageID,
		&image.ProductID,
		&image.FilePath,
		&image.DisplayOrder,
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

