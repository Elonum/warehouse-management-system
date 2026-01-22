package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type ProductCostService struct {
	repo        *repository.ProductCostRepository
	productRepo *repository.ProductRepository
}

func NewProductCostService(repo *repository.ProductCostRepository, productRepo *repository.ProductRepository) *ProductCostService {
	return &ProductCostService{
		repo:        repo,
		productRepo: productRepo,
	}
}

func (s *ProductCostService) GetByID(ctx context.Context, costID uuid.UUID) (*dto.ProductCostResponse, error) {
	cost, err := s.repo.GetByID(ctx, costID)
	if err != nil {
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to get product cost by ID")
		return nil, err
	}

	var createdByStr *string
	if cost.CreatedBy != nil {
		str := cost.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if cost.UpdatedBy != nil {
		str := cost.UpdatedBy.String()
		updatedByStr = &str
	}

	return &dto.ProductCostResponse{
		CostID:              cost.CostID.String(),
		ProductID:           cost.ProductID.String(),
		PeriodStart:         cost.PeriodStart,
		PeriodEnd:           cost.PeriodEnd,
		UnitCostToWarehouse: cost.UnitCostToWarehouse,
		Notes:               cost.Notes,
		CreatedBy:           createdByStr,
		CreatedAt:           cost.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           cost.UpdatedAt,
	}, nil
}

func (s *ProductCostService) List(ctx context.Context, limit, offset int, productID *uuid.UUID) ([]dto.ProductCostResponse, error) {
	costs, err := s.repo.List(ctx, limit, offset, productID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("productId", productID).Msg("Failed to list product costs")
		return nil, err
	}

	result := make([]dto.ProductCostResponse, 0, len(costs))
	for _, cost := range costs {
		var createdByStr *string
		if cost.CreatedBy != nil {
			str := cost.CreatedBy.String()
			createdByStr = &str
		}
		var updatedByStr *string
		if cost.UpdatedBy != nil {
			str := cost.UpdatedBy.String()
			updatedByStr = &str
		}

		result = append(result, dto.ProductCostResponse{
			CostID:              cost.CostID.String(),
			ProductID:           cost.ProductID.String(),
			PeriodStart:         cost.PeriodStart,
			PeriodEnd:           cost.PeriodEnd,
			UnitCostToWarehouse: cost.UnitCostToWarehouse,
			Notes:               cost.Notes,
			CreatedBy:           createdByStr,
			CreatedAt:           cost.CreatedAt,
			UpdatedBy:           updatedByStr,
			UpdatedAt:           cost.UpdatedAt,
		})
	}

	return result, nil
}

func (s *ProductCostService) Create(ctx context.Context, userID uuid.UUID, req dto.ProductCostCreateRequest) (*dto.ProductCostResponse, error) {
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		log.Warn().Str("productId", req.ProductID).Msg("Invalid product ID format")
		return nil, repository.ErrProductNotFound
	}
	_, err = s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Str("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
	}

	if req.PeriodEnd.Before(req.PeriodStart) {
		log.Warn().Time("periodStart", req.PeriodStart).Time("periodEnd", req.PeriodEnd).Msg("Period end must be after period start")
		return nil, repository.ErrInvalidDateRange
	}

	if req.UnitCostToWarehouse < 0 {
		log.Warn().Float64("unitCostToWarehouse", req.UnitCostToWarehouse).Msg("Unit cost to warehouse must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	cost, err := s.repo.Create(ctx, productID, req.PeriodStart, req.PeriodEnd, req.UnitCostToWarehouse, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Failed to create product cost")
		return nil, err
	}

	var createdByStr *string
	if cost.CreatedBy != nil {
		str := cost.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if cost.UpdatedBy != nil {
		str := cost.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("costId", cost.CostID.String()).Str("productId", req.ProductID).Str("userId", userID.String()).Msg("Product cost created successfully")
	return &dto.ProductCostResponse{
		CostID:              cost.CostID.String(),
		ProductID:           cost.ProductID.String(),
		PeriodStart:         cost.PeriodStart,
		PeriodEnd:           cost.PeriodEnd,
		UnitCostToWarehouse: cost.UnitCostToWarehouse,
		Notes:               cost.Notes,
		CreatedBy:           createdByStr,
		CreatedAt:           cost.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           cost.UpdatedAt,
	}, nil
}

func (s *ProductCostService) Update(ctx context.Context, costID, userID uuid.UUID, req dto.ProductCostUpdateRequest) (*dto.ProductCostResponse, error) {
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		log.Warn().Str("productId", req.ProductID).Msg("Invalid product ID format")
		return nil, repository.ErrProductNotFound
	}
	_, err = s.productRepo.GetByID(ctx, productID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Str("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Str("productId", req.ProductID).Msg("Failed to validate product")
		return nil, err
	}

	if req.PeriodEnd.Before(req.PeriodStart) {
		log.Warn().Time("periodStart", req.PeriodStart).Time("periodEnd", req.PeriodEnd).Msg("Period end must be after period start")
		return nil, repository.ErrInvalidDateRange
	}

	if req.UnitCostToWarehouse < 0 {
		log.Warn().Float64("unitCostToWarehouse", req.UnitCostToWarehouse).Msg("Unit cost to warehouse must be non-negative")
		return nil, repository.ErrInvalidQuantity
	}

	cost, err := s.repo.Update(ctx, costID, productID, req.PeriodStart, req.PeriodEnd, req.UnitCostToWarehouse, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Str("costId", costID.String()).Str("userId", userID.String()).Msg("Failed to update product cost")
		return nil, err
	}

	var createdByStr *string
	if cost.CreatedBy != nil {
		str := cost.CreatedBy.String()
		createdByStr = &str
	}
	var updatedByStr *string
	if cost.UpdatedBy != nil {
		str := cost.UpdatedBy.String()
		updatedByStr = &str
	}

	log.Info().Str("costId", costID.String()).Str("userId", userID.String()).Msg("Product cost updated successfully")
	return &dto.ProductCostResponse{
		CostID:              cost.CostID.String(),
		ProductID:           cost.ProductID.String(),
		PeriodStart:         cost.PeriodStart,
		PeriodEnd:           cost.PeriodEnd,
		UnitCostToWarehouse: cost.UnitCostToWarehouse,
		Notes:               cost.Notes,
		CreatedBy:           createdByStr,
		CreatedAt:           cost.CreatedAt,
		UpdatedBy:           updatedByStr,
		UpdatedAt:           cost.UpdatedAt,
	}, nil
}

func (s *ProductCostService) Delete(ctx context.Context, costID uuid.UUID) error {
	err := s.repo.Delete(ctx, costID)
	if err != nil {
		log.Error().Err(err).Str("costId", costID.String()).Msg("Failed to delete product cost")
		return err
	}

	log.Info().Str("costId", costID.String()).Msg("Product cost deleted successfully")
	return nil
}
