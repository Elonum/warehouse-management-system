package service

import (
	"testing"

	"github.com/google/uuid"
	"warehouse-backend/internal/integration/wildberries"
	"warehouse-backend/internal/repository"
)

func TestNormalizeMatchBy(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{in: "barcode", want: "barcode"},
		{in: " BARCODE ", want: "barcode"},
		{in: "vendor_code", want: "vendor_code"},
		{in: "vendorCode", want: "vendor_code"},
		{in: "article", want: "vendor_code"},
		{in: "unknown", want: ""},
	}

	for _, tt := range tests {
		if got := normalizeMatchBy(tt.in); got != tt.want {
			t.Fatalf("normalizeMatchBy(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestBuildWbImportLines_DistributesAcceptedAcrossSameProduct(t *testing.T) {
	p1 := uuid.New()
	item1 := uuid.New()
	item2 := uuid.New()

	items := []repository.MpShipmentItem{
		{ShipmentItemID: item1, ProductID: p1, SentQty: 3, AcceptedQty: 0},
		{ShipmentItemID: item2, ProductID: p1, SentQty: 4, AcceptedQty: 1},
	}
	products := map[uuid.UUID]*repository.Product{
		p1: {ProductID: p1, Article: "ART-1", Barcode: "111"},
	}
	goods := []wildberries.SupplyGood{
		{Barcode: "111", AcceptedQuantity: 5},
	}

	lines, unmatched, warnings := buildWbImportLines(items, products, goods, "barcode")

	if len(unmatched) != 0 {
		t.Fatalf("expected no unmatched goods, got %d", len(unmatched))
	}
	if len(warnings) != 0 {
		t.Fatalf("expected no warnings, got %d", len(warnings))
	}
	if len(lines) != 2 {
		t.Fatalf("expected 2 lines, got %d", len(lines))
	}
	if lines[0].ImportAcceptedQty != 3 || lines[1].ImportAcceptedQty != 2 {
		t.Fatalf("unexpected allocation: got [%d,%d], want [3,2]", lines[0].ImportAcceptedQty, lines[1].ImportAcceptedQty)
	}
}

func TestBuildWbImportLines_TracksUnmatchedAndSurplus(t *testing.T) {
	p1 := uuid.New()
	item := uuid.New()

	items := []repository.MpShipmentItem{
		{ShipmentItemID: item, ProductID: p1, SentQty: 2, AcceptedQty: 0},
	}
	products := map[uuid.UUID]*repository.Product{
		p1: {ProductID: p1, Article: "ART-2", Barcode: "222"},
	}
	goods := []wildberries.SupplyGood{
		{Barcode: "222", AcceptedQuantity: 6},
		{Barcode: "999", VendorCode: "UNKNOWN", NmID: 123, AcceptedQuantity: 1},
	}

	lines, unmatched, warnings := buildWbImportLines(items, products, goods, "barcode")

	if len(lines) != 1 || lines[0].ImportAcceptedQty != 2 {
		t.Fatalf("expected accepted capped to sent qty (2), got %+v", lines)
	}
	if len(unmatched) != 1 || unmatched[0].Barcode != "999" {
		t.Fatalf("expected one unmatched row with barcode 999, got %+v", unmatched)
	}
	if len(warnings) != 1 {
		t.Fatalf("expected one warning for surplus, got %d", len(warnings))
	}
}

func TestBuildWbImportLines_MatchedWhenAcceptedIsZero(t *testing.T) {
	p1 := uuid.New()
	item := uuid.New()

	items := []repository.MpShipmentItem{
		{ShipmentItemID: item, ProductID: p1, SentQty: 2, AcceptedQty: 1},
	}
	products := map[uuid.UUID]*repository.Product{
		p1: {ProductID: p1, Article: "ART-3", Barcode: "333"},
	}
	goods := []wildberries.SupplyGood{
		{Barcode: "333", AcceptedQuantity: 0},
	}

	lines, _, _ := buildWbImportLines(items, products, goods, "barcode")
	if len(lines) != 1 {
		t.Fatalf("expected 1 line, got %d", len(lines))
	}
	if !lines[0].Matched {
		t.Fatalf("expected line to be marked matched for zero accepted quantity")
	}
	if lines[0].ImportAcceptedQty != 0 {
		t.Fatalf("expected import accepted 0, got %d", lines[0].ImportAcceptedQty)
	}
}
