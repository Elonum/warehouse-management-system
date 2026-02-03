package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type ProductService struct {
	repo      *repository.ProductRepository
	imageRepo *repository.ProductImageRepository
	baseURL   string // Base URL for serving images (e.g., "http://localhost:8080")
}

func NewProductService(repo *repository.ProductRepository, imageRepo *repository.ProductImageRepository, baseURL string) *ProductService {
	return &ProductService{
		repo:      repo,
		imageRepo: imageRepo,
		baseURL:   baseURL,
	}
}

func (s *ProductService) GetByID(ctx context.Context, productID uuid.UUID) (*dto.ProductResponse, error) {
	product, err := s.repo.GetByID(ctx, productID)
	if err != nil {
		log.Error().Err(err).Str("productId", productID.String()).Msg("Failed to get product by ID")
		return nil, err
	}

	// Load images
	images, err := s.imageRepo.GetByProductID(ctx, productID)
	if err != nil {
		log.Warn().Err(err).Str("productId", productID.String()).Msg("Failed to load product images")
		images = []repository.ProductImage{} // Continue without images
	}

	imageResponses := s.mapImagesToDTO(images)

	return &dto.ProductResponse{
		ProductID:       product.ProductID.String(),
		Article:         product.Article,
		Barcode:         product.Barcode,
		UnitWeight:      product.UnitWeight,
		UnitCost:        product.UnitCost,
		PurchasePrice:   product.PurchasePrice,
		ProcessingPrice: product.ProcessingPrice,
		Images:          imageResponses,
	}, nil
}

func (s *ProductService) GetByArticle(ctx context.Context, article string) (*dto.ProductResponse, error) {
	product, err := s.repo.GetByArticle(ctx, article)
	if err != nil {
		return nil, err
	}

	// Load images
	images, err := s.imageRepo.GetByProductID(ctx, product.ProductID)
	if err != nil {
		log.Warn().Err(err).Str("productId", product.ProductID.String()).Msg("Failed to load product images")
		images = []repository.ProductImage{}
	}

	imageResponses := s.mapImagesToDTO(images)

	return &dto.ProductResponse{
		ProductID:       product.ProductID.String(),
		Article:         product.Article,
		Barcode:         product.Barcode,
		UnitWeight:      product.UnitWeight,
		UnitCost:        product.UnitCost,
		PurchasePrice:   product.PurchasePrice,
		ProcessingPrice: product.ProcessingPrice,
		Images:          imageResponses,
	}, nil
}

func (s *ProductService) GetByBarcode(ctx context.Context, barcode string) (*dto.ProductResponse, error) {
	product, err := s.repo.GetByBarcode(ctx, barcode)
	if err != nil {
		return nil, err
	}

	// Load images
	images, err := s.imageRepo.GetByProductID(ctx, product.ProductID)
	if err != nil {
		log.Warn().Err(err).Str("productId", product.ProductID.String()).Msg("Failed to load product images")
		images = []repository.ProductImage{}
	}

	imageResponses := s.mapImagesToDTO(images)

	return &dto.ProductResponse{
		ProductID:       product.ProductID.String(),
		Article:         product.Article,
		Barcode:         product.Barcode,
		UnitWeight:      product.UnitWeight,
		UnitCost:        product.UnitCost,
		PurchasePrice:   product.PurchasePrice,
		ProcessingPrice: product.ProcessingPrice,
		Images:          imageResponses,
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
		// For list view, only load main image (if exists) for performance
		images, _ := s.imageRepo.GetByProductID(ctx, product.ProductID)
		var mainImage *repository.ProductImage
		for i := range images {
			if images[i].IsMain {
				mainImage = &images[i]
				break
			}
		}
		// If no main image, use first image
		if mainImage == nil && len(images) > 0 {
			mainImage = &images[0]
		}

		productResponse := dto.ProductResponse{
			ProductID:       product.ProductID.String(),
			Article:         product.Article,
			Barcode:         product.Barcode,
			UnitWeight:      product.UnitWeight,
			UnitCost:        product.UnitCost,
			PurchasePrice:   product.PurchasePrice,
			ProcessingPrice: product.ProcessingPrice,
		}

		// Only include main image in list view
		if mainImage != nil {
			productResponse.Images = []dto.ProductImageResponse{
				{
					ImageID:      mainImage.ImageID.String(),
					FilePath:     mainImage.FilePath,
					DisplayOrder: mainImage.DisplayOrder,
					IsMain:       mainImage.IsMain,
					ImageURL:     s.buildImageURL(mainImage.FilePath),
				},
			}
		}

		result = append(result, productResponse)
	}

	return result, nil
}

func (s *ProductService) Create(ctx context.Context, req dto.ProductCreateRequest) (*dto.ProductResponse, error) {
	product, err := s.repo.Create(ctx, req.Article, req.Barcode, req.UnitWeight, req.UnitCost, req.PurchasePrice, req.ProcessingPrice)
	if err != nil {
		log.Error().Err(err).Str("article", req.Article).Str("barcode", req.Barcode).Msg("Failed to create product")
		return nil, err
	}
	log.Info().Str("productId", product.ProductID.String()).Str("article", product.Article).Msg("Product created successfully")

	// Create product images if provided
	if len(req.ImagePaths) > 0 {
		for i, imagePath := range req.ImagePaths {
			isMain := i == 0 // First image is main by default
			_, err := s.imageRepo.Create(ctx, product.ProductID, imagePath, i, isMain)
			if err != nil {
				log.Warn().Err(err).Str("productId", product.ProductID.String()).Str("imagePath", imagePath).Msg("Failed to create product image")
				// Continue with other images
			}
		}
	}

	// Load all images
	images, _ := s.imageRepo.GetByProductID(ctx, product.ProductID)
	imageResponses := s.mapImagesToDTO(images)

	return &dto.ProductResponse{
		ProductID:       product.ProductID.String(),
		Article:         product.Article,
		Barcode:         product.Barcode,
		UnitWeight:      product.UnitWeight,
		UnitCost:        product.UnitCost,
		PurchasePrice:   product.PurchasePrice,
		ProcessingPrice: product.ProcessingPrice,
		Images:          imageResponses,
	}, nil
}

func (s *ProductService) Update(ctx context.Context, productID uuid.UUID, req dto.ProductUpdateRequest) (*dto.ProductResponse, error) {
	product, err := s.repo.Update(ctx, productID, req.Article, req.Barcode, req.UnitWeight, req.UnitCost, req.PurchasePrice, req.ProcessingPrice)
	if err != nil {
		log.Error().Err(err).Str("productId", productID.String()).Msg("Failed to update product")
		return nil, err
	}
	log.Info().Str("productId", productID.String()).Msg("Product updated successfully")

	// Handle image updates if provided
	// Note: This is a simple implementation. In production, you might want to:
	// - Compare existing images with new ones
	// - Delete images that are no longer in the list
	// - Update display order
	if len(req.ImagePaths) > 0 {
		// Get existing images
		existingImages, _ := s.imageRepo.GetByProductID(ctx, productID)
		existingPaths := make(map[string]bool)
		for _, img := range existingImages {
			existingPaths[img.FilePath] = true
		}

		// Add new images
		for i, imagePath := range req.ImagePaths {
			if !existingPaths[imagePath] {
				isMain := i == 0 && len(existingImages) == 0 // First image is main if no images exist
				_, err := s.imageRepo.Create(ctx, productID, imagePath, i, isMain)
				if err != nil {
					log.Warn().Err(err).Str("productId", productID.String()).Str("imagePath", imagePath).Msg("Failed to create product image")
				}
			}
		}
	}

	// Load all images
	images, _ := s.imageRepo.GetByProductID(ctx, productID)
	imageResponses := s.mapImagesToDTO(images)

	return &dto.ProductResponse{
		ProductID:       product.ProductID.String(),
		Article:         product.Article,
		Barcode:         product.Barcode,
		UnitWeight:      product.UnitWeight,
		UnitCost:        product.UnitCost,
		PurchasePrice:   product.PurchasePrice,
		ProcessingPrice: product.ProcessingPrice,
		Images:          imageResponses,
	}, nil
}

func (s *ProductService) Delete(ctx context.Context, productID uuid.UUID) error {
	// Images will be deleted automatically due to CASCADE constraint
	err := s.repo.Delete(ctx, productID)
	if err != nil {
		log.Error().Err(err).Str("productId", productID.String()).Msg("Failed to delete product")
		return err
	}
	log.Info().Str("productId", productID.String()).Msg("Product deleted successfully")
	return nil
}

// Helper methods

func (s *ProductService) mapImagesToDTO(images []repository.ProductImage) []dto.ProductImageResponse {
	result := make([]dto.ProductImageResponse, 0, len(images))
	for _, img := range images {
		result = append(result, dto.ProductImageResponse{
			ImageID:      img.ImageID.String(),
			FilePath:     img.FilePath,
			DisplayOrder: img.DisplayOrder,
			IsMain:       img.IsMain,
			ImageURL:     s.buildImageURL(img.FilePath),
		})
	}
	return result
}

func (s *ProductService) buildImageURL(filePath string) string {
	if filePath == "" {
		return ""
	}
	// Remove leading ./ if present
	if len(filePath) > 2 && filePath[0:2] == "./" {
		filePath = filePath[2:]
	}
	return fmt.Sprintf("%s/api/v1/files?path=%s", s.baseURL, filePath)
}
