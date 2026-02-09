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
	Email      string  `json:"email"`      // Required
	Password   string  `json:"password"`  // Required
	RoleID     string  `json:"roleId"`    // Required
	Name       string  `json:"name"`      // Required
	Surname    string  `json:"surname"`   // Required
	Patronymic *string `json:"patronymic,omitempty"` // Optional
}

type UserUpdateRequest struct {
	Email      string  `json:"email"`      // Required
	Password   *string `json:"password,omitempty"` // Optional (only if changing)
	RoleID     string  `json:"roleId"`    // Required
	Name       string  `json:"name"`      // Required
	Surname    string  `json:"surname"`   // Required
	Patronymic *string `json:"patronymic,omitempty"` // Optional
}
