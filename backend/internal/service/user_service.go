package service

import (
	"context"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/validation"

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

func roleHasAdminPermission(roleName string) bool {
	return auth.HasPermission(roleName, auth.PermAdmin)
}

func (s *UserService) isAdministratorRole(ctx context.Context, roleID uuid.UUID) (bool, error) {
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return false, err
	}
	return roleHasAdminPermission(role.Name), nil
}

func (s *UserService) GetByID(ctx context.Context, userID uuid.UUID) (*dto.UserResponse, error) {
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to get user by ID")
		return nil, err
	}

	return &dto.UserResponse{
		UserID:     user.UserID.String(),
		Email:      user.Email,
		Name:       user.Name,
		Surname:    user.Surname,
		Patronymic: user.Patronymic,
		RoleID:     user.RoleID.String(),
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
			UserID:     user.UserID.String(),
			Email:      user.Email,
			Name:       user.Name,
			Surname:    user.Surname,
			Patronymic: user.Patronymic,
			RoleID:     user.RoleID.String(),
		})
	}

	return result, nil
}

func (s *UserService) Create(ctx context.Context, req dto.UserCreateRequest) (*dto.UserResponse, error) {
	// Validate email
	if err := validation.ValidateEmail(req.Email); err != nil {
		log.Warn().Str("email", req.Email).Err(err).Msg("Invalid email format")
		return nil, err
	}

	// Validate password
	passwordReq := validation.DefaultPasswordRequirements()
	if err := validation.ValidatePassword(req.Password, passwordReq); err != nil {
		log.Warn().Err(err).Msg("Weak password")
		return nil, err
	}

	// Validate name (required)
	if err := validation.ValidatePersonName(req.Name, true, false); err != nil {
		log.Warn().Str("name", req.Name).Err(err).Msg("Invalid name")
		return nil, err
	}

	// Validate surname (required)
	if err := validation.ValidatePersonName(req.Surname, true, true); err != nil {
		log.Warn().Str("surname", req.Surname).Err(err).Msg("Invalid surname")
		return nil, err
	}

	// Validate patronymic (optional)
	if req.Patronymic != nil && *req.Patronymic != "" {
		if err := validation.ValidateName(*req.Patronymic, false); err != nil {
			log.Warn().Str("patronymic", *req.Patronymic).Err(err).Msg("Invalid patronymic")
			return nil, err
		}
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		log.Warn().Str("roleId", req.RoleID).Msg("Invalid role ID format")
		return nil, repository.ErrRoleNotFound
	}

	_, err = s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		if err == repository.ErrRoleNotFound {
			log.Warn().Str("roleId", req.RoleID).Msg("Role not found")
			return nil, repository.ErrRoleNotFound
		}
		log.Error().Err(err).Str("roleId", req.RoleID).Msg("Failed to validate role")
		return nil, err
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password")
		return nil, err
	}

	user, err := s.repo.Create(ctx, req.Email, passwordHash, roleID, req.Name, req.Surname, req.Patronymic)
	if err != nil {
		log.Error().Err(err).Str("email", req.Email).Str("roleId", req.RoleID).Msg("Failed to create user")
		return nil, err
	}

	log.Info().Str("userId", user.UserID.String()).Str("email", req.Email).Str("roleId", req.RoleID).Msg("User created successfully")
	return &dto.UserResponse{
		UserID:     user.UserID.String(),
		Email:      user.Email,
		Name:       user.Name,
		Surname:    user.Surname,
		Patronymic: user.Patronymic,
		RoleID:     user.RoleID.String(),
	}, nil
}

func (s *UserService) Update(ctx context.Context, actorUserID uuid.UUID, userID uuid.UUID, req dto.UserUpdateRequest) (*dto.UserResponse, error) {
	// Validate email
	if err := validation.ValidateEmail(req.Email); err != nil {
		log.Warn().Str("email", req.Email).Err(err).Msg("Invalid email format")
		return nil, err
	}

	// Validate password if provided
	if req.Password != nil && *req.Password != "" {
		passwordReq := validation.DefaultPasswordRequirements()
		if err := validation.ValidatePassword(*req.Password, passwordReq); err != nil {
			log.Warn().Err(err).Msg("Weak password")
			return nil, err
		}
	}

	// Validate name (required)
	if err := validation.ValidatePersonName(req.Name, true, false); err != nil {
		log.Warn().Str("name", req.Name).Err(err).Msg("Invalid name")
		return nil, err
	}

	// Validate surname (required)
	if err := validation.ValidatePersonName(req.Surname, true, true); err != nil {
		log.Warn().Str("surname", req.Surname).Err(err).Msg("Invalid surname")
		return nil, err
	}

	// Validate patronymic (optional)
	if req.Patronymic != nil && *req.Patronymic != "" {
		if err := validation.ValidateName(*req.Patronymic, false); err != nil {
			log.Warn().Str("patronymic", *req.Patronymic).Err(err).Msg("Invalid patronymic")
			return nil, err
		}
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		log.Warn().Str("roleId", req.RoleID).Msg("Invalid role ID format")
		return nil, repository.ErrRoleNotFound
	}

	newRole, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		if err == repository.ErrRoleNotFound {
			log.Warn().Str("roleId", req.RoleID).Msg("Role not found")
			return nil, repository.ErrRoleNotFound
		}
		log.Error().Err(err).Str("roleId", req.RoleID).Msg("Failed to validate role")
		return nil, err
	}

	targetUser, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	wasAdmin, err := s.isAdministratorRole(ctx, targetUser.RoleID)
	if err != nil {
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to resolve current user role")
		return nil, err
	}

	willBeAdmin := roleHasAdminPermission(newRole.Name)
	if wasAdmin && !willBeAdmin {
		count, err := s.repo.CountAdministrators(ctx)
		if err != nil {
			log.Error().Err(err).Msg("Failed to count administrators")
			return nil, err
		}
		if count <= 1 {
			log.Warn().
				Str("actorUserId", actorUserID.String()).
				Str("targetUserId", userID.String()).
				Msg("Attempt to remove the last administrator")
			return nil, repository.ErrLastAdministrator
		}
	}

	var passwordHash *string
	if req.Password != nil && *req.Password != "" {
		hash, err := auth.HashPassword(*req.Password)
		if err != nil {
			log.Error().Err(err).Msg("Failed to hash password")
			return nil, err
		}
		passwordHash = &hash
	}

	user, err := s.repo.Update(ctx, userID, req.Email, roleID, req.Name, req.Surname, req.Patronymic, passwordHash)
	if err != nil {
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to update user")
		return nil, err
	}

	log.Info().Str("userId", userID.String()).Msg("User updated successfully")
	return &dto.UserResponse{
		UserID:     user.UserID.String(),
		Email:      user.Email,
		Name:       user.Name,
		Surname:    user.Surname,
		Patronymic: user.Patronymic,
		RoleID:     user.RoleID.String(),
	}, nil
}

func (s *UserService) Delete(ctx context.Context, actorUserID uuid.UUID, userID uuid.UUID) error {
	if actorUserID != uuid.Nil && actorUserID == userID {
		log.Warn().Str("userId", userID.String()).Msg("Attempt to delete own account")
		return repository.ErrCannotDeleteSelf
	}

	targetUser, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	isAdmin, err := s.isAdministratorRole(ctx, targetUser.RoleID)
	if err != nil {
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to resolve user role for deletion")
		return err
	}

	if isAdmin {
		count, err := s.repo.CountAdministrators(ctx)
		if err != nil {
			log.Error().Err(err).Msg("Failed to count administrators")
			return err
		}
		if count <= 1 {
			log.Warn().Str("userId", userID.String()).Msg("Attempt to delete the last administrator")
			return repository.ErrLastAdministrator
		}
	}

	err = s.repo.Delete(ctx, userID)
	if err != nil {
		log.Error().Err(err).Str("userId", userID.String()).Msg("Failed to delete user")
		return err
	}

	log.Info().Str("userId", userID.String()).Msg("User deleted successfully")
	return nil
}
