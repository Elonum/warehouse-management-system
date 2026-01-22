package dto

type UserResponse struct {
	UserID     string  `json:"userId"`
	Email      string  `json:"email"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
	RoleID     string  `json:"roleId"`
}

type UserCreateRequest struct {
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	RoleID     string  `json:"roleId"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
}

type UserUpdateRequest struct {
	Email      string  `json:"email"`
	RoleID     string  `json:"roleId"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
}
