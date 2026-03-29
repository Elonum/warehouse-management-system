package dto

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type RegisterRequest struct {
	Email      string  `json:"email"`                // Required
	Password   string  `json:"password"`             // Required
	RoleID     string  `json:"roleId"`               // Required
	Name       string  `json:"name"`                 // Required
	Surname    string  `json:"surname"`              // Required
	Patronymic *string `json:"patronymic,omitempty"` // Optional
}

type PasswordResetRequest struct {
	Email string `json:"email"`
}

type PasswordResetConfirmRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}
