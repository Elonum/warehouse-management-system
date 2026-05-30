package ozon

import "testing"

func TestStockQtyFromMap(t *testing.T) {
	m := map[string]interface{}{
		"available_stock_count": float64(12),
		"valid_stock_count":     float64(20),
	}
	if q := stockQtyFromMap(m); q != 12 {
		t.Fatalf("got %d", q)
	}
	m2 := map[string]interface{}{
		"valid_stock_count": float64(7),
	}
	if q := stockQtyFromMap(m2); q != 7 {
		t.Fatalf("got %d", q)
	}
}

func TestUnwrapResultItems(t *testing.T) {
	raw := []byte(`{"result":{"items":[{"sku":123,"offer_id":"A","available_stock_count":5}]}}`)
	items, err := unwrapResultItems(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 || int64FromAny(items[0]["sku"]) != 123 {
		t.Fatalf("%+v", items)
	}
}

func TestInt64FromAnyString(t *testing.T) {
	if int64FromAny("9876543210") != 9876543210 {
		t.Fatal("string parse failed")
	}
}
