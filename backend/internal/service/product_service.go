package service

import (
	"context"
	"fmt"
	"strings"

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
		images, _ := s.imageRepo.GetByProductID(ctx, product.ProductID)
		
		productResponse := dto.ProductResponse{
			ProductID:       product.ProductID.String(),
			Article:         product.Article,
			Barcode:         product.Barcode,
			UnitWeight:      product.UnitWeight,
			UnitCost:        product.UnitCost,
			PurchasePrice:   product.PurchasePrice,
			ProcessingPrice: product.ProcessingPrice,
			Images:          s.mapImagesToDTO(images),
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

	if len(req.ImagePaths) == 0 {
		existingImages, _ := s.imageRepo.GetByProductID(ctx, productID)
		for _, img := range existingImages {
			if err := s.imageRepo.Delete(ctx, img.ImageID); err != nil {
				log.Warn().Err(err).Str("productId", productID.String()).Str("imageId", img.ImageID.String()).Msg("Failed to delete product image")
			}
		}
	} else {
		s.syncProductImages(ctx, productID, req.ImagePaths)
	}

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

func (s *ProductService) syncProductImages(ctx context.Context, productID uuid.UUID, imagePaths []string) {
	existingImages, _ := s.imageRepo.GetByProductID(ctx, productID)
	existingPaths := make(map[string]*repository.ProductImage)
	for i := range existingImages {
		normalizedPath := strings.ReplaceAll(existingImages[i].FilePath, "\\", "/")
		existingPaths[normalizedPath] = &existingImages[i]
	}

	newPaths := make(map[string]bool)
	for _, path := range imagePaths {
		normalizedPath := strings.ReplaceAll(path, "\\", "/")
		newPaths[normalizedPath] = true
	}

	for normalizedPath, img := range existingPaths {
		if !newPaths[normalizedPath] {
			if err := s.imageRepo.Delete(ctx, img.ImageID); err != nil {
				log.Warn().Err(err).Str("productId", productID.String()).Str("imageId", img.ImageID.String()).Msg("Failed to delete product image")
			}
		}
	}

	remainingImages, _ := s.imageRepo.GetByProductID(ctx, productID)
	remainingPaths := make(map[string]*repository.ProductImage)
	for i := range remainingImages {
		normalizedPath := strings.ReplaceAll(remainingImages[i].FilePath, "\\", "/")
		remainingPaths[normalizedPath] = &remainingImages[i]
	}

	for i, imagePath := range imagePaths {
		normalizedPath := strings.ReplaceAll(imagePath, "\\", "/")
		
		if existingImg, exists := remainingPaths[normalizedPath]; exists {
			needsUpdate := existingImg.DisplayOrder != i || (i == 0 && !existingImg.IsMain)
			
			if needsUpdate {
				if existingImg.DisplayOrder != i {
					if err := s.imageRepo.UpdateDisplayOrder(ctx, existingImg.ImageID, i); err != nil {
						log.Warn().Err(err).Str("productId", productID.String()).Str("imageId", existingImg.ImageID.String()).Msg("Failed to update image display order")
					}
				}
				if i == 0 && !existingImg.IsMain {
					if err := s.imageRepo.SetAsMain(ctx, existingImg.ImageID, productID); err != nil {
						log.Warn().Err(err).Str("productId", productID.String()).Str("imageId", existingImg.ImageID.String()).Msg("Failed to set image as main")
					}
				}
			}
		} else {
			isMain := i == 0 && len(remainingImages) == 0
			if _, err := s.imageRepo.Create(ctx, productID, normalizedPath, i, isMain); err != nil {
				log.Warn().Err(err).Str("productId", productID.String()).Str("imagePath", normalizedPath).Msg("Failed to create product image")
			}
		}
	}
}

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
	filePath = strings.ReplaceAll(filePath, "\\", "/")
	if len(filePath) > 2 && filePath[0:2] == "./" {
		filePath = filePath[2:]
	}
	return fmt.Sprintf("%s/api/v1/files?path=%s", s.baseURL, filePath)
}
