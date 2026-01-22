package dto

type SupplierOrderDocumentResponse struct {
	DocumentID  string  `json:"documentId"`
	OrderID     string  `json:"orderId"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	FilePath    string  `json:"filePath"`
}

type SupplierOrderDocumentCreateRequest struct {
	OrderID     string  `json:"orderId"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	FilePath    string  `json:"filePath"`
}

type SupplierOrderDocumentUpdateRequest struct {
	OrderID     string  `json:"orderId"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	FilePath    string  `json:"filePath"`
}
