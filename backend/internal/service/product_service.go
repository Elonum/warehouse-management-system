package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type ProductService struct {
	repo *repository.ProductRepository
}

func NewProductService(repo *repository.ProductRepository) *ProductService {
	return &ProductService{repo: repo}
}

func (s *ProductService) GetByID(ctx context.Context, productID int) (*dto.ProductResponse, error) {
	product, err := s.repo.GetByID(ctx, productID)
	if err != nil {
		log.Error().Err(err).Int("productId", productID).Msg("Failed to get product by ID")
		return nil, err
	}

	return &dto.ProductResponse{
		ProductID:  product.ProductID,
		Article:    product.Article,
		Barcode:    product.Barcode,
		UnitWeight: product.UnitWeight,
		UnitCost:   product.UnitCost,
	}, nil
}

func (s *ProductService) GetByArticle(ctx context.Context, article string) (*dto.ProductResponse, error) {
	product, err := s.repo.GetByArticle(ctx, article)
	if err != nil {
		return nil, err
	}

	return &dto.ProductResponse{
		ProductID:  product.ProductID,
		Article:    product.Article,
		Barcode:    product.Barcode,
		UnitWeight: product.UnitWeight,
		UnitCost:   product.UnitCost,
	}, nil
}

func (s *ProductService) GetByBarcode(ctx context.Context, barcode string) (*dto.ProductResponse, error) {
	product, err := s.repo.GetByBarcode(ctx, barcode)
	if err != nil {
		return nil, err
	}

	return &dto.ProductResponse{
		ProductID:  product.ProductID,
		Article:    product.Article,
		Barcode:    product.Barcode,
		UnitWeight: product.UnitWeight,
		UnitCost:   product.UnitCost,
	}, nil
}

func (s *ProductService) List(ctx context.Context, limit, offset int) ([]dto.ProductResponse, error) {
	products, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list products")
		return nil, err
	}

	result := make([]dto.ProductResponse, 0, len(products))
	for _, product := range products {
		result = append(result, dto.ProductResponse{
			ProductID:  product.ProductID,
			Article:    product.Article,
			Barcode:    product.Barcode,
			UnitWeight: product.UnitWeight,
			UnitCost:   product.UnitCost,
		})
	}

	return result, nil
}

func (s *ProductService) Create(ctx context.Context, req dto.ProductCreateRequest) (*dto.ProductResponse, error) {
	product, err := s.repo.Create(ctx, req.Article, req.Barcode, req.UnitWeight, req.UnitCost)
	if err != nil {
		log.Error().Err(err).Str("article", req.Article).Str("barcode", req.Barcode).Msg("Failed to create product")
		return nil, err
	}
	log.Info().Int("productId", product.ProductID).Str("article", product.Article).Msg("Product created successfully")

	return &dto.ProductResponse{
		ProductID:  product.ProductID,
		Article:    product.Article,
		Barcode:    product.Barcode,
		UnitWeight: product.UnitWeight,
		UnitCost:   product.UnitCost,
	}, nil
}

func (s *ProductService) Update(ctx context.Context, productID int, req dto.ProductUpdateRequest) (*dto.ProductResponse, error) {
	product, err := s.repo.Update(ctx, productID, req.Article, req.Barcode, req.UnitWeight, req.UnitCost)
	if err != nil {
		log.Error().Err(err).Int("productId", productID).Msg("Failed to update product")
		return nil, err
	}
	log.Info().Int("productId", productID).Msg("Product updated successfully")

	return &dto.ProductResponse{
		ProductID:  product.ProductID,
		Article:    product.Article,
		Barcode:    product.Barcode,
		UnitWeight: product.UnitWeight,
		UnitCost:   product.UnitCost,
	}, nil
}

func (s *ProductService) Delete(ctx context.Context, productID int) error {
	err := s.repo.Delete(ctx, productID)
	if err != nil {
		log.Error().Err(err).Int("productId", productID).Msg("Failed to delete product")
		return err
	}
	log.Info().Int("productId", productID).Msg("Product deleted successfully")
	return nil
}
