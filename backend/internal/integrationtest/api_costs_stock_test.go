//go:build integration

package integrationtest

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestStockCurrent_RequiresAuth(t *testing.T) {
	h := NewHarness(t)
	w := h.GET(t, "/api/v1/stock/current", "")
	assertStatus(t, w, http.StatusUnauthorized)
}

func TestStockCurrent_ReturnsItemsAndSummary(t *testing.T) {
	h := NewHarness(t)
	token := h.AdminToken(t)

	w := h.GET(t, "/api/v1/stock/current?limit=10&offset=0", token)
	assertStatus(t, w, http.StatusOK)

	env := decodeEnvelope(t, w.Body.Bytes())
	if env.Error != nil {
		t.Fatalf("unexpected api error: %+v", env.Error)
	}

	var data struct {
		Items []struct {
			ProductID       string   `json:"productId"`
			HasUnitCost     bool     `json:"hasUnitCost"`
			UnitCost        *float64 `json:"unitCost"`
			StockValue      *float64 `json:"stockValue"`
			CurrentQuantity int      `json:"currentQuantity"`
		} `json:"items"`
		Summary struct {
			TotalStockValue float64 `json:"totalStockValue"`
			RowsMissingCost int     `json:"rowsMissingCost"`
			RowsWithCost    int     `json:"rowsWithCost"`
			TotalRows       int     `json:"totalRows"`
		} `json:"summary"`
	}
	if err := json.Unmarshal(env.Data, &data); err != nil {
		t.Fatalf("decode stock data: %v", err)
	}
	if data.Summary.TotalRows < 0 {
		t.Fatalf("invalid summary.totalRows: %d", data.Summary.TotalRows)
	}
	if len(data.Items) == 0 {
		t.Fatalf("expected at least one stock row in seeded DB")
	}
}

func TestStockCurrent_InvalidLevelFilter(t *testing.T) {
	h := NewHarness(t)
	token := h.AdminToken(t)

	w := h.GET(t, "/api/v1/stock/current?levelFilter=invalid", token)
	assertStatus(t, w, http.StatusBadRequest)

	env := decodeEnvelope(t, w.Body.Bytes())
	if env.Error == nil || env.Error.Code != "INVALID_LEVEL_FILTER" {
		t.Fatalf("expected INVALID_LEVEL_FILTER, got %+v", env.Error)
	}
}

func TestProductCosts_List_IncludesAuditAndSummary(t *testing.T) {
	h := NewHarness(t)
	token := h.AdminToken(t)

	w := h.GET(t, "/api/v1/product-costs?limit=10&offset=0&view=journal", token)
	assertStatus(t, w, http.StatusOK)

	env := decodeEnvelope(t, w.Body.Bytes())
	var data struct {
		Items []struct {
			CostID        string `json:"costId"`
			CreatedByName string `json:"createdByName"`
			UpdatedByName string `json:"updatedByName"`
		} `json:"items"`
		Summary struct {
			TotalRows int `json:"totalRows"`
		} `json:"summary"`
	}
	if err := json.Unmarshal(env.Data, &data); err != nil {
		t.Fatalf("decode product costs data: %v", err)
	}
	if data.Summary.TotalRows <= 0 {
		t.Fatalf("expected summary.totalRows > 0, got %d", data.Summary.TotalRows)
	}
	if len(data.Items) == 0 {
		t.Fatalf("expected at least one cost period")
	}
	if data.Items[0].CreatedByName == "" {
		t.Fatalf("expected createdByName in list item")
	}
}

func TestProductCosts_Missing_ReturnsItems(t *testing.T) {
	h := NewHarness(t)
	token := h.AdminToken(t)

	w := h.GET(t, "/api/v1/product-costs/missing?limit=10&offset=0", token)
	assertStatus(t, w, http.StatusOK)

	env := decodeEnvelope(t, w.Body.Bytes())
	var data struct {
		Items []struct {
			ProductID      string `json:"productId"`
			ProductArticle string `json:"productArticle"`
			TotalQuantity  int64  `json:"totalQuantity"`
			WarehouseCount int64  `json:"warehouseCount"`
		} `json:"items"`
	}
	if err := json.Unmarshal(env.Data, &data); err != nil {
		t.Fatalf("decode missing costs data: %v", err)
	}
	// Seeded periods are historical (2024), so products with stock should appear here in 2026.
	if len(data.Items) == 0 {
		t.Fatalf("expected products without active cost when stock exists")
	}
}

func TestProductCosts_DataQuality_ReturnsOverlapCount(t *testing.T) {
	h := NewHarness(t)
	token := h.AdminToken(t)

	w := h.GET(t, "/api/v1/product-costs/data-quality", token)
	assertStatus(t, w, http.StatusOK)

	env := decodeEnvelope(t, w.Body.Bytes())
	var data struct {
		OverlapPairCount int64 `json:"overlapPairCount"`
	}
	if err := json.Unmarshal(env.Data, &data); err != nil {
		t.Fatalf("decode data quality: %v", err)
	}
	if data.OverlapPairCount < 0 {
		t.Fatalf("invalid overlapPairCount: %d", data.OverlapPairCount)
	}
}

func TestProducts_List_UsesActiveUnitCostField(t *testing.T) {
	h := NewHarness(t)
	token := h.AdminToken(t)

	w := h.GET(t, "/api/v1/products?limit=5&offset=0", token)
	assertStatus(t, w, http.StatusOK)

	var products []struct {
		ProductID      string   `json:"productId"`
		Article        string   `json:"article"`
		ActiveUnitCost *float64 `json:"activeUnitCost"`
	}
	env := decodeEnvelope(t, w.Body.Bytes())
	if err := json.Unmarshal(env.Data, &products); err != nil {
		t.Fatalf("decode products list: %v", err)
	}
	if len(products) == 0 {
		t.Fatalf("expected products in seeded DB")
	}
	if products[0].Article == "" {
		t.Fatalf("expected article in product response")
	}

	var rawProducts []map[string]json.RawMessage
	if err := json.Unmarshal(env.Data, &rawProducts); err != nil {
		t.Fatalf("decode raw products: %v", err)
	}
	if _, hasLegacy := rawProducts[0]["unitCost"]; hasLegacy {
		t.Fatalf("legacy unitCost must not be exposed in products list")
	}
}
