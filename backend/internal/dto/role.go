package dto

type RoleResponse struct {
	RoleID int    `json:"roleId"`
	Name   string `json:"name"`
}

type RoleCreateRequest struct {
	Name string `json:"name"`
}

type RoleUpdateRequest struct {
	Name string `json:"name"`
}
