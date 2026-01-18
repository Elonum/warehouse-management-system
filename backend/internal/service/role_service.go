package service

import (
	"context"

	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type RoleService struct {
	repo *repository.RoleRepository
}

func NewRoleService(repo *repository.RoleRepository) *RoleService {
	return &RoleService{repo: repo}
}

func (s *RoleService) GetByID(ctx context.Context, roleID int) (*dto.RoleResponse, error) {
	role, err := s.repo.GetByID(ctx, roleID)
	if err != nil {
		log.Error().Err(err).Int("roleId", roleID).Msg("Failed to get role by ID")
		return nil, err
	}

	return &dto.RoleResponse{
		RoleID: role.RoleID,
		Name:   role.Name,
	}, nil
}

func (s *RoleService) List(ctx context.Context, limit, offset int) ([]dto.RoleResponse, error) {
	roles, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list roles")
		return nil, err
	}

	result := make([]dto.RoleResponse, 0, len(roles))
	for _, role := range roles {
		result = append(result, dto.RoleResponse{
			RoleID: role.RoleID,
			Name:   role.Name,
		})
	}

	return result, nil
}

func (s *RoleService) Create(ctx context.Context, req dto.RoleCreateRequest) (*dto.RoleResponse, error) {
	role, err := s.repo.Create(ctx, req.Name)
	if err != nil {
		log.Error().Err(err).Str("name", req.Name).Msg("Failed to create role")
		return nil, err
	}

	log.Info().Int("roleId", role.RoleID).Str("name", req.Name).Msg("Role created successfully")
	return &dto.RoleResponse{
		RoleID: role.RoleID,
		Name:   role.Name,
	}, nil
}

func (s *RoleService) Update(ctx context.Context, roleID int, req dto.RoleUpdateRequest) (*dto.RoleResponse, error) {
	role, err := s.repo.Update(ctx, roleID, req.Name)
	if err != nil {
		log.Error().Err(err).Int("roleId", roleID).Msg("Failed to update role")
		return nil, err
	}

	log.Info().Int("roleId", roleID).Msg("Role updated successfully")
	return &dto.RoleResponse{
		RoleID: role.RoleID,
		Name:   role.Name,
	}, nil
}

func (s *RoleService) Delete(ctx context.Context, roleID int) error {
	err := s.repo.Delete(ctx, roleID)
	if err != nil {
		log.Error().Err(err).Int("roleId", roleID).Msg("Failed to delete role")
		return err
	}

	log.Info().Int("roleId", roleID).Msg("Role deleted successfully")
	return nil
}
