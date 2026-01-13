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
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	RoleID     int     `json:"roleId"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
}

type UserResponse struct {
	UserID     int     `json:"userId"`
	Email      string  `json:"email"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
	RoleID     int     `json:"roleId"`
}
