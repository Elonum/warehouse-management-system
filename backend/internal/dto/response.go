package dto

type APIResponse[T any] struct {
	Data  T      `json:"data"`
	Meta  *Meta  `json:"meta,omitempty"`
	Error *Error `json:"error,omitempty"`
}

type Meta struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
