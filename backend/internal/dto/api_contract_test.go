package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestStockCurrentListResponse_JSONContract(t *testing.T) {
	unitCost := 12.5
	stockValue := 125.0
	payload := StockCurrentListResponse{
		Items: []StockItemResponse{
			{
				ProductID:       "p-1",
				WarehouseID:     "w-1",
				ProductArticle:  "ART-1",
				ProductBarcode:  "BC-1",
				CurrentQuantity: 10,
				ReorderPoint:    2,
				UnitCost:        &unitCost,
				StockValue:      &stockValue,
				HasUnitCost:     true,
			},
		},
		Summary: StockCurrentSummaryResponse{
			TotalStockValue: 125.0,
			RowsMissingCost: 1,
			RowsWithCost:    2,
			TotalRows:       3,
		},
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	s := string(raw)
	for _, key := range []string{
		`"items"`, `"summary"`, `"unitCost"`, `"stockValue"`, `"hasUnitCost"`,
		`"rowsMissingCost"`, `"rowsWithCost"`, `"totalStockValue"`,
	} {
		if !strings.Contains(s, key) {
			t.Fatalf("missing key %s in json: %s", key, s)
		}
	}
}

func TestProductResponse_JSONContract(t *testing.T) {
	activeUnitCost := 99.9
	payload := ProductResponse{
		ProductID:      "p-1",
		Article:        "ART-1",
		Barcode:        "BC-1",
		UnitWeight:     100,
		ReorderPoint:   5,
		ActiveUnitCost: &activeUnitCost,
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	s := string(raw)
	if !strings.Contains(s, `"activeUnitCost"`) {
		t.Fatalf("activeUnitCost key missing in json: %s", s)
	}
	if strings.Contains(s, `"unitCost"`) {
		t.Fatalf("legacy unitCost key must not be present: %s", s)
	}
}

func TestProductCostListResponse_JSONContract(t *testing.T) {
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	payload := ProductCostListResponse{
		Items: []ProductCostListItemResponse{
			{
				CostID:              "c-1",
				ProductID:           "p-1",
				ProductArticle:      "ART-1",
				PeriodStart:         start,
				UnitCostToWarehouse: 45.5,
				IsActive:            true,
				CreatedByName:       "User A",
				UpdatedByName:       "User B",
				CreatedAt:           start,
				UpdatedAt:           start,
			},
		},
		Summary: ProductCostSummaryResponse{TotalRows: 1, ActiveRows: 1, ProductRows: 1},
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	s := string(raw)
	for _, key := range []string{
		`"items"`, `"summary"`, `"createdByName"`, `"updatedByName"`,
		`"unitCostToWarehouse"`, `"isActive"`,
	} {
		if !strings.Contains(s, key) {
			t.Fatalf("missing key %s in json: %s", key, s)
		}
	}
}

