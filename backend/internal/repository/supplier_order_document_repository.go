package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSupplierOrderDocumentNotFound = errors.New("supplier order document not found")
	ErrSupplierOrderDocumentExists   = errors.New("supplier order document already exists")
)

type SupplierOrderDocument struct {
	DocumentID  int
	OrderID     int
	Name        string
	Description *string
	FilePath    string
}

type SupplierOrderDocumentRepository struct {
	pool *pgxpool.Pool
}

func NewSupplierOrderDocumentRepository(pool *pgxpool.Pool) *SupplierOrderDocumentRepository {
	return &SupplierOrderDocumentRepository{pool: pool}
}

func (r *SupplierOrderDocumentRepository) GetByID(ctx context.Context, documentID int) (*SupplierOrderDocument, error) {
	query := `
		SELECT document_id, order_id, name, description, file_path
		FROM supplier_order_documents
		WHERE document_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var doc SupplierOrderDocument
	err := r.pool.QueryRow(ctx, query, documentID).Scan(
		&doc.DocumentID,
		&doc.OrderID,
		&doc.Name,
		&doc.Description,
		&doc.FilePath,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupplierOrderDocumentNotFound
		}
		return nil, err
	}

	return &doc, nil
}

func (r *SupplierOrderDocumentRepository) GetByOrderID(ctx context.Context, orderID int) ([]SupplierOrderDocument, error) {
	query := `
		SELECT document_id, order_id, name, description, file_path
		FROM supplier_order_documents
		WHERE order_id = $1
		ORDER BY document_id
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.pool.Query(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []SupplierOrderDocument
	for rows.Next() {
		var doc SupplierOrderDocument
		if err := rows.Scan(
			&doc.DocumentID,
			&doc.OrderID,
			&doc.Name,
			&doc.Description,
			&doc.FilePath,
		); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return docs, nil
}

func (r *SupplierOrderDocumentRepository) Create(ctx context.Context, orderID int, name string, description *string, filePath string) (*SupplierOrderDocument, error) {
	query := `
		INSERT INTO supplier_order_documents (order_id, name, description, file_path)
		VALUES ($1, $2, $3, $4)
		RETURNING document_id, order_id, name, description, file_path
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var doc SupplierOrderDocument
	err := r.pool.QueryRow(ctx, query, orderID, name, description, filePath).Scan(
		&doc.DocumentID,
		&doc.OrderID,
		&doc.Name,
		&doc.Description,
		&doc.FilePath,
	)

	if err != nil {
		return nil, err
	}

	return &doc, nil
}

func (r *SupplierOrderDocumentRepository) Update(ctx context.Context, documentID int, orderID int, name string, description *string, filePath string) (*SupplierOrderDocument, error) {
	query := `
		UPDATE supplier_order_documents
		SET order_id = $1, name = $2, description = $3, file_path = $4
		WHERE document_id = $5
		RETURNING document_id, order_id, name, description, file_path
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var doc SupplierOrderDocument
	err := r.pool.QueryRow(ctx, query, orderID, name, description, filePath, documentID).Scan(
		&doc.DocumentID,
		&doc.OrderID,
		&doc.Name,
		&doc.Description,
		&doc.FilePath,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSupplierOrderDocumentNotFound
		}
		return nil, err
	}

	return &doc, nil
}

func (r *SupplierOrderDocumentRepository) Delete(ctx context.Context, documentID int) error {
	query := `
		DELETE FROM supplier_order_documents
		WHERE document_id = $1
	`

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.pool.Exec(ctx, query, documentID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrSupplierOrderDocumentNotFound
	}

	return nil
}
