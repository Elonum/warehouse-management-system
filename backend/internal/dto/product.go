package dto

type ProductResponse struct {
	ProductID       string                 `json:"productId"`
	Article         string                 `json:"article"`
	Barcode         string                 `json:"barcode"`
	UnitWeight      int                    `json:"unitWeight"`
	ReorderPoint    int                    `json:"reorderPoint"`
	UnitCost        *float64               `json:"unitCost,omitempty"`
	PurchasePrice   *float64               `json:"purchasePrice,omitempty"`
	Images          []ProductImageResponse `json:"images,omitempty"`
}

type ProductImageResponse struct {
	ImageID      string `json:"imageId"`
	FilePath     string `json:"filePath"`
	DisplayOrder int    `json:"displayOrder"`
	ImageURL     string `json:"imageUrl"` // Full URL for accessing the image
}

type ProductCreateRequest struct {
	Article         string   `json:"article"`
	Barcode         string   `json:"barcode"`
	UnitWeight      int      `json:"unitWeight"`
	ReorderPoint    int      `json:"reorderPoint"`
	UnitCost        *float64 `json:"unitCost,omitempty"`
	PurchasePrice   *float64 `json:"purchasePrice,omitempty"`
	ImagePaths      []string `json:"imagePaths,omitempty"` // Paths to already uploaded images
}

type ProductUpdateRequest struct {
	Article         string   `json:"article"`
	Barcode         string   `json:"barcode"`
	UnitWeight      int      `json:"unitWeight"`
	ReorderPoint    int      `json:"reorderPoint"`
	UnitCost        *float64 `json:"unitCost,omitempty"`
	PurchasePrice   *float64 `json:"purchasePrice,omitempty"`
	ImagePaths      []string `json:"imagePaths,omitempty"` // Paths to already uploaded images
}
