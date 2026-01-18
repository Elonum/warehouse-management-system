package service

import (
	"context"

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

func (s *ProductCostService) GetByID(ctx context.Context, costID int) (*dto.ProductCostResponse, error) {
	cost, err := s.repo.GetByID(ctx, costID)
	if err != nil {
		log.Error().Err(err).Int("costId", costID).Msg("Failed to get product cost by ID")
		return nil, err
	}

	return &dto.ProductCostResponse{
		CostID:              cost.CostID,
		ProductID:           cost.ProductID,
		PeriodStart:         cost.PeriodStart,
		PeriodEnd:           cost.PeriodEnd,
		UnitCostToWarehouse: cost.UnitCostToWarehouse,
		Notes:               cost.Notes,
		CreatedBy:           cost.CreatedBy,
		CreatedAt:           cost.CreatedAt,
		UpdatedBy:           cost.UpdatedBy,
		UpdatedAt:           cost.UpdatedAt,
	}, nil
}

func (s *ProductCostService) List(ctx context.Context, limit, offset int, productID *int) ([]dto.ProductCostResponse, error) {
	costs, err := s.repo.List(ctx, limit, offset, productID)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).
			Interface("productId", productID).Msg("Failed to list product costs")
		return nil, err
	}

	result := make([]dto.ProductCostResponse, 0, len(costs))
	for _, cost := range costs {
		result = append(result, dto.ProductCostResponse{
			CostID:              cost.CostID,
			ProductID:           cost.ProductID,
			PeriodStart:         cost.PeriodStart,
			PeriodEnd:           cost.PeriodEnd,
			UnitCostToWarehouse: cost.UnitCostToWarehouse,
			Notes:               cost.Notes,
			CreatedBy:           cost.CreatedBy,
			CreatedAt:           cost.CreatedAt,
			UpdatedBy:           cost.UpdatedBy,
			UpdatedAt:           cost.UpdatedAt,
		})
	}

	return result, nil
}

func (s *ProductCostService) Create(ctx context.Context, userID int, req dto.ProductCostCreateRequest) (*dto.ProductCostResponse, error) {
	_, err := s.productRepo.GetByID(ctx, req.ProductID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Int("productId", req.ProductID).Msg("Failed to validate product")
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

	cost, err := s.repo.Create(ctx, req.ProductID, req.PeriodStart, req.PeriodEnd, req.UnitCostToWarehouse, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Int("productId", req.ProductID).Int("userId", userID).Msg("Failed to create product cost")
		return nil, err
	}

	log.Info().Int("costId", cost.CostID).Int("productId", req.ProductID).Int("userId", userID).Msg("Product cost created successfully")
	return &dto.ProductCostResponse{
		CostID:              cost.CostID,
		ProductID:           cost.ProductID,
		PeriodStart:         cost.PeriodStart,
		PeriodEnd:           cost.PeriodEnd,
		UnitCostToWarehouse: cost.UnitCostToWarehouse,
		Notes:               cost.Notes,
		CreatedBy:           cost.CreatedBy,
		CreatedAt:           cost.CreatedAt,
		UpdatedBy:           cost.UpdatedBy,
		UpdatedAt:           cost.UpdatedAt,
	}, nil
}

func (s *ProductCostService) Update(ctx context.Context, costID, userID int, req dto.ProductCostUpdateRequest) (*dto.ProductCostResponse, error) {
	_, err := s.productRepo.GetByID(ctx, req.ProductID)
	if err != nil {
		if err == repository.ErrProductNotFound {
			log.Warn().Int("productId", req.ProductID).Msg("Product not found")
			return nil, repository.ErrProductNotFound
		}
		log.Error().Err(err).Int("productId", req.ProductID).Msg("Failed to validate product")
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

	cost, err := s.repo.Update(ctx, costID, req.ProductID, req.PeriodStart, req.PeriodEnd, req.UnitCostToWarehouse, req.Notes, &userID)
	if err != nil {
		log.Error().Err(err).Int("costId", costID).Int("userId", userID).Msg("Failed to update product cost")
		return nil, err
	}

	log.Info().Int("costId", costID).Int("userId", userID).Msg("Product cost updated successfully")
	return &dto.ProductCostResponse{
		CostID:              cost.CostID,
		ProductID:           cost.ProductID,
		PeriodStart:         cost.PeriodStart,
		PeriodEnd:           cost.PeriodEnd,
		UnitCostToWarehouse: cost.UnitCostToWarehouse,
		Notes:               cost.Notes,
		CreatedBy:           cost.CreatedBy,
		CreatedAt:           cost.CreatedAt,
		UpdatedBy:           cost.UpdatedBy,
		UpdatedAt:           cost.UpdatedAt,
	}, nil
}

func (s *ProductCostService) Delete(ctx context.Context, costID int) error {
	err := s.repo.Delete(ctx, costID)
	if err != nil {
		log.Error().Err(err).Int("costId", costID).Msg("Failed to delete product cost")
		return err
	}

	log.Info().Int("costId", costID).Msg("Product cost deleted successfully")
	return nil
}
