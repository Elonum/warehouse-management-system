package dto

type SupplierOrderDocumentResponse struct {
	DocumentID  int     `json:"documentId"`
	OrderID     int     `json:"orderId"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	FilePath    string  `json:"filePath"`
}

type SupplierOrderDocumentCreateRequest struct {
	OrderID     int     `json:"orderId"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	FilePath    string  `json:"filePath"`
}

type SupplierOrderDocumentUpdateRequest struct {
	OrderID     int     `json:"orderId"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	FilePath    string  `json:"filePath"`
}
