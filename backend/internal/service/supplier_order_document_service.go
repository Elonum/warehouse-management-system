package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type SupplierOrderDocumentService struct {
	repo      *repository.SupplierOrderDocumentRepository
	orderRepo *repository.SupplierOrderRepository
}

func NewSupplierOrderDocumentService(repo *repository.SupplierOrderDocumentRepository, orderRepo *repository.SupplierOrderRepository) *SupplierOrderDocumentService {
	return &SupplierOrderDocumentService{
		repo:      repo,
		orderRepo: orderRepo,
	}
}

func (s *SupplierOrderDocumentService) GetByID(ctx context.Context, documentID uuid.UUID) (*dto.SupplierOrderDocumentResponse, error) {
	doc, err := s.repo.GetByID(ctx, documentID)
	if err != nil {
		log.Error().Err(err).Str("documentId", documentID.String()).Msg("Failed to get supplier order document by ID")
		return nil, err
	}

	return &dto.SupplierOrderDocumentResponse{
		DocumentID:  doc.DocumentID.String(),
		OrderID:     doc.OrderID.String(),
		Name:        doc.Name,
		Description: doc.Description,
		FilePath:    doc.FilePath,
	}, nil
}

func (s *SupplierOrderDocumentService) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]dto.SupplierOrderDocumentResponse, error) {
	docs, err := s.repo.GetByOrderID(ctx, orderID)
	if err != nil {
		log.Error().Err(err).Str("orderId", orderID.String()).Msg("Failed to get supplier order documents by order ID")
		return nil, err
	}

	result := make([]dto.SupplierOrderDocumentResponse, 0, len(docs))
	for _, doc := range docs {
		result = append(result, dto.SupplierOrderDocumentResponse{
			DocumentID:  doc.DocumentID.String(),
			OrderID:     doc.OrderID.String(),
			Name:        doc.Name,
			Description: doc.Description,
			FilePath:    doc.FilePath,
		})
	}

	return result, nil
}

func (s *SupplierOrderDocumentService) Create(ctx context.Context, req dto.SupplierOrderDocumentCreateRequest) (*dto.SupplierOrderDocumentResponse, error) {
	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		log.Warn().Str("orderId", req.OrderID).Msg("Invalid order ID format")
		return nil, repository.ErrSupplierOrderNotFound
	}
	_, err = s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", req.OrderID).Msg("Supplier order not found")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Str("orderId", req.OrderID).Msg("Failed to validate supplier order")
		return nil, err
	}

	doc, err := s.repo.Create(ctx, orderID, req.Name, req.Description, req.FilePath)
	if err != nil {
		log.Error().Err(err).Str("orderId", req.OrderID).Str("name", req.Name).Msg("Failed to create supplier order document")
		return nil, err
	}

	log.Info().Str("documentId", doc.DocumentID.String()).Str("orderId", req.OrderID).Str("name", doc.Name).Msg("Supplier order document created successfully")
	return &dto.SupplierOrderDocumentResponse{
		DocumentID:  doc.DocumentID.String(),
		OrderID:     doc.OrderID.String(),
		Name:        doc.Name,
		Description: doc.Description,
		FilePath:    doc.FilePath,
	}, nil
}

func (s *SupplierOrderDocumentService) Update(ctx context.Context, documentID uuid.UUID, req dto.SupplierOrderDocumentUpdateRequest) (*dto.SupplierOrderDocumentResponse, error) {
	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		log.Warn().Str("orderId", req.OrderID).Msg("Invalid order ID format")
		return nil, repository.ErrSupplierOrderNotFound
	}
	_, err = s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if err == repository.ErrSupplierOrderNotFound {
			log.Warn().Str("orderId", req.OrderID).Msg("Supplier order not found")
			return nil, repository.ErrSupplierOrderNotFound
		}
		log.Error().Err(err).Str("orderId", req.OrderID).Msg("Failed to validate supplier order")
		return nil, err
	}

	doc, err := s.repo.Update(ctx, documentID, orderID, req.Name, req.Description, req.FilePath)
	if err != nil {
		log.Error().Err(err).Str("documentId", documentID.String()).Msg("Failed to update supplier order document")
		return nil, err
	}

	log.Info().Str("documentId", documentID.String()).Msg("Supplier order document updated successfully")
	return &dto.SupplierOrderDocumentResponse{
		DocumentID:  doc.DocumentID.String(),
		OrderID:     doc.OrderID.String(),
		Name:        doc.Name,
		Description: doc.Description,
		FilePath:    doc.FilePath,
	}, nil
}

func (s *SupplierOrderDocumentService) Delete(ctx context.Context, documentID uuid.UUID) error {
	err := s.repo.Delete(ctx, documentID)
	if err != nil {
		log.Error().Err(err).Str("documentId", documentID.String()).Msg("Failed to delete supplier order document")
		return err
	}

	log.Info().Str("documentId", documentID.String()).Msg("Supplier order document deleted successfully")
	return nil
}
