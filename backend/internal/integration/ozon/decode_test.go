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

	rowsRaw := []byte(`{"result":{"rows":[{"sku":456,"item_name":"X","free_to_sell_amount":3}]}}`)
	rows, err := unwrapResultItems(rowsRaw)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || int64FromAny(rows[0]["sku"]) != 456 {
		t.Fatalf("%+v", rows)
	}
}

func TestUnwrapOzonPagedPayloadTopLevelV4(t *testing.T) {
	raw := []byte(`{
		"cursor":"next",
		"total":1,
		"items":[{"offer_id":"A","product_id":10,"stocks":[{"sku":99,"type":"FBO","present":7}]}]
	}`)
	payload, err := unwrapOzonPagedPayload(raw)
	if err != nil {
		t.Fatal(err)
	}
	if payload.Cursor != "next" || len(payload.Items) != 1 {
		t.Fatalf("%+v", payload)
	}
}

func TestStockRowsFromProductInfoItem(t *testing.T) {
	item := map[string]interface{}{
		"id":       float64(10),
		"offer_id": "SKU-1",
		"name":     "Product",
		"sources": []interface{}{
			map[string]interface{}{"sku": float64(555), "source": "FBO"},
		},
		"stocks": []interface{}{
			map[string]interface{}{"sku": float64(555), "source": "FBO", "present": float64(4)},
		},
	}
	rows := stockRowsFromProductInfoItem(item)
	if len(rows) != 1 || rows[0].Quantity != 4 || rows[0].SKU != 555 {
		t.Fatalf("%+v", rows)
	}
}

func TestSkusFromProductInfoItemSources(t *testing.T) {
	item := map[string]interface{}{
		"sources": []interface{}{
			map[string]interface{}{"sku": float64(777), "source": "FBS"},
		},
	}
	skus := skusFromProductInfoItem(item)
	if len(skus) != 1 || skus[0] != 777 {
		t.Fatalf("%v", skus)
	}
}

func TestInt64FromAnyString(t *testing.T) {
	if int64FromAny("9876543210") != 9876543210 {
		t.Fatal("string parse failed")
	}
}
