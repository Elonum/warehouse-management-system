package service

import (
	"context"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

type UserService struct {
	repo     *repository.UserRepository
	roleRepo *repository.RoleRepository
}

func NewUserService(repo *repository.UserRepository, roleRepo *repository.RoleRepository) *UserService {
	return &UserService{
		repo:     repo,
		roleRepo: roleRepo,
	}
}

func (s *UserService) GetByID(ctx context.Context, userID int) (*dto.UserResponse, error) {
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		log.Error().Err(err).Int("userId", userID).Msg("Failed to get user by ID")
		return nil, err
	}

	return &dto.UserResponse{
		UserID:     user.UserID,
		Email:      user.Email,
		Name:       user.Name,
		Surname:    user.Surname,
		Patronymic: user.Patronymic,
		RoleID:     user.RoleID,
	}, nil
}

func (s *UserService) List(ctx context.Context, limit, offset int) ([]dto.UserResponse, error) {
	users, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("limit", limit).Int("offset", offset).Msg("Failed to list users")
		return nil, err
	}

	result := make([]dto.UserResponse, 0, len(users))
	for _, user := range users {
		result = append(result, dto.UserResponse{
			UserID:     user.UserID,
			Email:      user.Email,
			Name:       user.Name,
			Surname:    user.Surname,
			Patronymic: user.Patronymic,
			RoleID:     user.RoleID,
		})
	}

	return result, nil
}

func (s *UserService) Create(ctx context.Context, req dto.UserCreateRequest) (*dto.UserResponse, error) {
	_, err := s.roleRepo.GetByID(ctx, req.RoleID)
	if err != nil {
		if err == repository.ErrRoleNotFound {
			log.Warn().Int("roleId", req.RoleID).Msg("Role not found")
			return nil, repository.ErrRoleNotFound
		}
		log.Error().Err(err).Int("roleId", req.RoleID).Msg("Failed to validate role")
		return nil, err
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password")
		return nil, err
	}

	user, err := s.repo.Create(ctx, req.Email, passwordHash, req.RoleID, req.Name, req.Surname, req.Patronymic)
	if err != nil {
		log.Error().Err(err).Str("email", req.Email).Int("roleId", req.RoleID).Msg("Failed to create user")
		return nil, err
	}

	log.Info().Int("userId", user.UserID).Str("email", req.Email).Int("roleId", req.RoleID).Msg("User created successfully")
	return &dto.UserResponse{
		UserID:     user.UserID,
		Email:      user.Email,
		Name:       user.Name,
		Surname:    user.Surname,
		Patronymic: user.Patronymic,
		RoleID:     user.RoleID,
	}, nil
}

func (s *UserService) Update(ctx context.Context, userID int, req dto.UserUpdateRequest) (*dto.UserResponse, error) {
	_, err := s.roleRepo.GetByID(ctx, req.RoleID)
	if err != nil {
		if err == repository.ErrRoleNotFound {
			log.Warn().Int("roleId", req.RoleID).Msg("Role not found")
			return nil, repository.ErrRoleNotFound
		}
		log.Error().Err(err).Int("roleId", req.RoleID).Msg("Failed to validate role")
		return nil, err
	}

	user, err := s.repo.Update(ctx, userID, req.Email, req.RoleID, req.Name, req.Surname, req.Patronymic)
	if err != nil {
		log.Error().Err(err).Int("userId", userID).Msg("Failed to update user")
		return nil, err
	}

	log.Info().Int("userId", userID).Msg("User updated successfully")
	return &dto.UserResponse{
		UserID:     user.UserID,
		Email:      user.Email,
		Name:       user.Name,
		Surname:    user.Surname,
		Patronymic: user.Patronymic,
		RoleID:     user.RoleID,
	}, nil
}

func (s *UserService) Delete(ctx context.Context, userID int) error {
	err := s.repo.Delete(ctx, userID)
	if err != nil {
		log.Error().Err(err).Int("userId", userID).Msg("Failed to delete user")
		return err
	}

	log.Info().Int("userId", userID).Msg("User deleted successfully")
	return nil
}
