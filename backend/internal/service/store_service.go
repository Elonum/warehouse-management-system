package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type StoreService struct {
	repo *repository.StoreRepository
}

func NewStoreService(repo *repository.StoreRepository) *StoreService {
	return &StoreService{repo: repo}
}

func (s *StoreService) GetByID(ctx context.Context, storeID int) (*dto.StoreResponse, error) {
	store, err := s.repo.GetByID(ctx, storeID)
	if err != nil {
		log.Error().Err(err).Int("storeId", storeID).Msg("Failed to get store by ID")
		return nil, err
	}

	return &dto.StoreResponse{
		StoreID: store.StoreID,
		Name:    store.Name,
	}, nil
}

func (s *StoreService) List(ctx context.Context, limit, offset int) ([]dto.StoreResponse, error) {
	stores, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list stores")
		return nil, err
	}

	result := make([]dto.StoreResponse, 0, len(stores))
	for _, store := range stores {
		result = append(result, dto.StoreResponse{
			StoreID: store.StoreID,
			Name:    store.Name,
		})
	}

	return result, nil
}

func (s *StoreService) Create(ctx context.Context, req dto.StoreCreateRequest) (*dto.StoreResponse, error) {
	store, err := s.repo.Create(ctx, req.Name)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create store")
		return nil, err
	}

	log.Info().Int("storeId", store.StoreID).Str("name", store.Name).Msg("Store created successfully")
	return &dto.StoreResponse{
		StoreID: store.StoreID,
		Name:    store.Name,
	}, nil
}

func (s *StoreService) Update(ctx context.Context, storeID int, req dto.StoreUpdateRequest) (*dto.StoreResponse, error) {
	store, err := s.repo.Update(ctx, storeID, req.Name)
	if err != nil {
		log.Error().Err(err).Int("storeId", storeID).Msg("Failed to update store")
		return nil, err
	}

	log.Info().Int("storeId", storeID).Msg("Store updated successfully")
	return &dto.StoreResponse{
		StoreID: store.StoreID,
		Name:    store.Name,
	}, nil
}

func (s *StoreService) Delete(ctx context.Context, storeID int) error {
	err := s.repo.Delete(ctx, storeID)
	if err != nil {
		log.Error().Err(err).Int("storeId", storeID).Msg("Failed to delete store")
		return err
	}

	log.Info().Int("storeId", storeID).Msg("Store deleted successfully")
	return nil
}

