package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type SupplierOrderDocumentService struct {
	repo *repository.SupplierOrderDocumentRepository
}

func NewSupplierOrderDocumentService(repo *repository.SupplierOrderDocumentRepository) *SupplierOrderDocumentService {
	return &SupplierOrderDocumentService{repo: repo}
}

func (s *SupplierOrderDocumentService) GetByID(ctx context.Context, documentID int) (*dto.SupplierOrderDocumentResponse, error) {
	doc, err := s.repo.GetByID(ctx, documentID)
	if err != nil {
		log.Error().Err(err).Int("documentId", documentID).Msg("Failed to get supplier order document by ID")
		return nil, err
	}

	return &dto.SupplierOrderDocumentResponse{
		DocumentID:  doc.DocumentID,
		OrderID:     doc.OrderID,
		Name:        doc.Name,
		Description: doc.Description,
		FilePath:    doc.FilePath,
	}, nil
}

func (s *SupplierOrderDocumentService) GetByOrderID(ctx context.Context, orderID int) ([]dto.SupplierOrderDocumentResponse, error) {
	docs, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Int("orderId", orderID).Msg("Failed to get supplier order documents by order ID")
		return nil, err
	}

	result := make([]dto.SupplierOrderDocumentResponse, 0, len(docs))
	for _, doc := range docs {
		result = append(result, dto.SupplierOrderDocumentResponse{
			DocumentID:  doc.DocumentID,
			OrderID:     doc.OrderID,
			Name:        doc.Name,
			Description: doc.Description,
			FilePath:    doc.FilePath,
		})
	}

	return result, nil
}

func (s *SupplierOrderDocumentService) Create(ctx context.Context, req dto.SupplierOrderDocumentCreateRequest) (*dto.SupplierOrderDocumentResponse, error) {
	doc, err := s.repo.Create(ctx, req.OrderID, req.Name, req.Description, req.FilePath)
	if err != nil {
		log.Error().Err(err).Int("orderId", req.OrderID).Str("name", req.Name).Msg("Failed to create supplier order document")
		return nil, err
	}

	log.Info().Int("documentId", doc.DocumentID).Int("orderId", req.OrderID).Str("name", doc.Name).Msg("Supplier order document created successfully")
	return &dto.SupplierOrderDocumentResponse{
		DocumentID:  doc.DocumentID,
		OrderID:     doc.OrderID,
		Name:        doc.Name,
		Description: doc.Description,
		FilePath:    doc.FilePath,
	}, nil
}

func (s *SupplierOrderDocumentService) Update(ctx context.Context, documentID int, req dto.SupplierOrderDocumentUpdateRequest) (*dto.SupplierOrderDocumentResponse, error) {
	doc, err := s.repo.Update(ctx, documentID, req.OrderID, req.Name, req.Description, req.FilePath)
	if err != nil {
		log.Error().Err(err).Int("documentId", documentID).Msg("Failed to update supplier order document")
		return nil, err
	}

	log.Info().Int("documentId", documentID).Msg("Supplier order document updated successfully")
	return &dto.SupplierOrderDocumentResponse{
		DocumentID:  doc.DocumentID,
		OrderID:     doc.OrderID,
		Name:        doc.Name,
		Description: doc.Description,
		FilePath:    doc.FilePath,
	}, nil
}

func (s *SupplierOrderDocumentService) Delete(ctx context.Context, documentID int) error {
	err := s.repo.Delete(ctx, documentID)
	if err != nil {
		log.Error().Err(err).Int("documentId", documentID).Msg("Failed to delete supplier order document")
		return err
	}

	log.Info().Int("documentId", documentID).Msg("Supplier order document deleted successfully")
	return nil
}
