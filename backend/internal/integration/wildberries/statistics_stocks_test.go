package wildberries

import (
	"testing"
)

func TestParseStatisticsDateFrom(t *testing.T) {
	got, err := ParseStatisticsDateFrom("")
	if err != nil {
		t.Fatal(err)
	}
	if want := "2020-11-15T00:00:00Z"; got != want {
		t.Fatalf("empty: got %q want %q", got, want)
	}

	got, err = ParseStatisticsDateFrom("2024-03-01")
	if err != nil {
		t.Fatal(err)
	}
	if want := "2024-03-01T00:00:00Z"; got != want {
		t.Fatalf("date: got %q want %q", got, want)
	}

	_, err = ParseStatisticsDateFrom("not-a-date")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestDedupeSupplierStocks(t *testing.T) {
	rows := []SupplierStockRow{
		{NmID: 1, Barcode: "a", WarehouseName: "W", LastChangeDate: "2024-01-01T00:00:00Z", Quantity: 1},
		{NmID: 1, Barcode: "a", WarehouseName: "W", LastChangeDate: "2024-02-01T00:00:00Z", Quantity: 5},
		{NmID: 2, Barcode: "b", WarehouseName: "W", LastChangeDate: "2024-01-01T00:00:00Z", Quantity: 2},
	}
	out := DedupeSupplierStocks(rows)
	if len(out) != 2 {
		t.Fatalf("len %d", len(out))
	}
	var q1 int
	for _, r := range out {
		if r.NmID == 1 {
			q1 = r.Quantity
		}
	}
	if q1 != 5 {
		t.Fatalf("expected qty 5 for nm 1, got %d", q1)
	}
}

func TestSellableQuantity(t *testing.T) {
	if q := SellableQuantity(SupplierStockRow{Quantity: 3, QuantityFull: 10}); q != 3 {
		t.Fatalf("got %d", q)
	}
	if q := SellableQuantity(SupplierStockRow{Quantity: 0, QuantityFull: 7}); q != 7 {
		t.Fatalf("got %d", q)
	}
}
