package dto

type UserResponse struct {
	UserID     int     `json:"userId"`
	Email      string  `json:"email"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
	RoleID     int     `json:"roleId"`
}

type UserCreateRequest struct {
	Email      string  `json:"email"`
	Password   string  `json:"password"`
	RoleID     int     `json:"roleId"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
}

type UserUpdateRequest struct {
	Email      string  `json:"email"`
	RoleID     int     `json:"roleId"`
	Name       *string `json:"name,omitempty"`
	Surname    *string `json:"surname,omitempty"`
	Patronymic *string `json:"patronymic,omitempty"`
}
