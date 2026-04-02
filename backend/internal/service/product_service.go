package service

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
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

var ErrInvalidProductImagePath = errors.New("invalid product image path")
var ErrTooManyProductImages = errors.New("too many product images")

const maxProductImagesPerProduct = 10

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
		ProductID:     product.ProductID.String(),
		Article:       product.Article,
		Barcode:       product.Barcode,
		UnitWeight:    product.UnitWeight,
		ReorderPoint:  product.ReorderPoint,
		UnitCost:      product.UnitCost,
		PurchasePrice: product.PurchasePrice,
		Images:        imageResponses,
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
		ProductID:     product.ProductID.String(),
		Article:       product.Article,
		Barcode:       product.Barcode,
		UnitWeight:    product.UnitWeight,
		ReorderPoint:  product.ReorderPoint,
		UnitCost:      product.UnitCost,
		PurchasePrice: product.PurchasePrice,
		Images:        imageResponses,
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
		ProductID:     product.ProductID.String(),
		Article:       product.Article,
		Barcode:       product.Barcode,
		UnitWeight:    product.UnitWeight,
		ReorderPoint:  product.ReorderPoint,
		UnitCost:      product.UnitCost,
		PurchasePrice: product.PurchasePrice,
		Images:        imageResponses,
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
			ProductID:     product.ProductID.String(),
			Article:       product.Article,
			Barcode:       product.Barcode,
			UnitWeight:    product.UnitWeight,
			ReorderPoint:  product.ReorderPoint,
			UnitCost:      product.UnitCost,
			PurchasePrice: product.PurchasePrice,
			Images:        s.mapImagesToDTO(images),
		}

		result = append(result, productResponse)
	}

	return result, nil
}

func (s *ProductService) Create(ctx context.Context, req dto.ProductCreateRequest) (*dto.ProductResponse, error) {
	sanitizedPaths, err := s.normalizeProductImagePaths(req.ImagePaths)
	if err != nil {
		return nil, err
	}

	product, err := s.repo.Create(ctx, req.Article, req.Barcode, req.UnitWeight, req.ReorderPoint, req.UnitCost, req.PurchasePrice)
	if err != nil {
		log.Error().Err(err).Str("article", req.Article).Str("barcode", req.Barcode).Msg("Failed to create product")
		return nil, err
	}
	log.Info().Str("productId", product.ProductID.String()).Str("article", product.Article).Msg("Product created successfully")

	// Create product images if provided
	if len(sanitizedPaths) > 0 {
		for i, imagePath := range sanitizedPaths {
			_, err := s.imageRepo.Create(ctx, product.ProductID, imagePath, i)
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
		ProductID:     product.ProductID.String(),
		Article:       product.Article,
		Barcode:       product.Barcode,
		UnitWeight:    product.UnitWeight,
		ReorderPoint:  product.ReorderPoint,
		UnitCost:      product.UnitCost,
		PurchasePrice: product.PurchasePrice,
		Images:        imageResponses,
	}, nil
}

func (s *ProductService) Update(ctx context.Context, productID uuid.UUID, req dto.ProductUpdateRequest) (*dto.ProductResponse, error) {
	sanitizedPaths, err := s.normalizeProductImagePaths(req.ImagePaths)
	if err != nil {
		return nil, err
	}

	product, err := s.repo.Update(ctx, productID, req.Article, req.Barcode, req.UnitWeight, req.ReorderPoint, req.UnitCost, req.PurchasePrice)
	if err != nil {
		log.Error().Err(err).Str("productId", productID.String()).Msg("Failed to update product")
		return nil, err
	}
	log.Info().Str("productId", productID.String()).Msg("Product updated successfully")

	if len(sanitizedPaths) == 0 {
		existingImages, _ := s.imageRepo.GetByProductID(ctx, productID)
		for _, img := range existingImages {
			if err := s.imageRepo.Delete(ctx, img.ImageID); err != nil {
				log.Warn().Err(err).Str("productId", productID.String()).Str("imageId", img.ImageID.String()).Msg("Failed to delete product image")
			} else {
				s.removeProductImageFile(img.FilePath)
			}
		}
	} else {
		s.syncProductImages(ctx, productID, sanitizedPaths)
	}

	images, _ := s.imageRepo.GetByProductID(ctx, productID)
	imageResponses := s.mapImagesToDTO(images)

	return &dto.ProductResponse{
		ProductID:     product.ProductID.String(),
		Article:       product.Article,
		Barcode:       product.Barcode,
		UnitWeight:    product.UnitWeight,
		ReorderPoint:  product.ReorderPoint,
		UnitCost:      product.UnitCost,
		PurchasePrice: product.PurchasePrice,
		Images:        imageResponses,
	}, nil
}

func (s *ProductService) Delete(ctx context.Context, productID uuid.UUID) error {
	images, _ := s.imageRepo.GetByProductID(ctx, productID)

	// Images metadata are deleted by CASCADE; files require explicit disk cleanup.
	err := s.repo.Delete(ctx, productID)
	if err != nil {
		log.Error().Err(err).Str("productId", productID.String()).Msg("Failed to delete product")
		return err
	}
	for _, img := range images {
		s.removeProductImageFile(img.FilePath)
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
			} else {
				s.removeProductImageFile(img.FilePath)
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
			if existingImg.DisplayOrder != i {
				if err := s.imageRepo.UpdateDisplayOrder(ctx, existingImg.ImageID, i); err != nil {
					log.Warn().Err(err).Str("productId", productID.String()).Str("imageId", existingImg.ImageID.String()).Msg("Failed to update image display order")
				}
			}
		} else {
			if _, err := s.imageRepo.Create(ctx, productID, normalizedPath, i); err != nil {
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

func (s *ProductService) removeProductImageFile(filePath string) {
	normalized := strings.ReplaceAll(strings.TrimSpace(filePath), "\\", "/")
	normalized = strings.TrimPrefix(normalized, "./")
	if !strings.HasPrefix(normalized, "uploads/products/") || strings.Contains(normalized, "..") {
		log.Warn().Str("filePath", filePath).Msg("Skip deleting suspicious product image path")
		return
	}
	fullPath := filepath.Join(".", filepath.FromSlash(normalized))
	absRoot, _ := filepath.Abs(filepath.Join(".", "uploads", "products"))
	absFile, _ := filepath.Abs(fullPath)
	if !strings.HasPrefix(absFile, absRoot) {
		log.Warn().Str("filePath", filePath).Msg("Skip deleting out-of-root product image path")
		return
	}
	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		log.Warn().Err(err).Str("filePath", fullPath).Msg("Failed to delete product image file")
	}
}

func (s *ProductService) normalizeProductImagePaths(imagePaths []string) ([]string, error) {
	if len(imagePaths) == 0 {
		return nil, nil
	}

	out := make([]string, 0, len(imagePaths))
	seen := make(map[string]struct{}, len(imagePaths))
	for _, raw := range imagePaths {
		normalized := strings.ReplaceAll(strings.TrimSpace(raw), "\\", "/")
		normalized = strings.TrimPrefix(normalized, "./")
		if normalized == "" {
			continue
		}
		if !strings.HasPrefix(normalized, "uploads/products/") || strings.Contains(normalized, "..") {
			return nil, ErrInvalidProductImagePath
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) > maxProductImagesPerProduct {
		return nil, ErrTooManyProductImages
	}
	return out, nil
}

func (s *ProductService) CleanupOrphanProductImageFiles(ctx context.Context) (int, error) {
	paths, err := s.imageRepo.ListAllFilePaths(ctx)
	if err != nil {
		return 0, err
	}

	referenced := make(map[string]struct{}, len(paths))
	for _, raw := range paths {
		normalized := strings.ReplaceAll(strings.TrimSpace(raw), "\\", "/")
		normalized = strings.TrimPrefix(normalized, "./")
		if !strings.HasPrefix(normalized, "uploads/products/") || strings.Contains(normalized, "..") {
			continue
		}
		referenced[filepath.Base(normalized)] = struct{}{}
	}

	imagesDir := filepath.Join(".", "uploads", "products")
	entries, err := os.ReadDir(imagesDir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}

	removed := 0
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if _, ok := referenced[name]; ok {
			continue
		}
		fullPath := filepath.Join(imagesDir, name)
		if rmErr := os.Remove(fullPath); rmErr != nil && !os.IsNotExist(rmErr) {
			log.Warn().Err(rmErr).Str("filePath", fullPath).Msg("Failed to delete orphan product image file")
			continue
		}
		removed++
	}

	return removed, nil
}
