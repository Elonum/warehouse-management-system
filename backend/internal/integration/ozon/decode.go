package ozon

import (
	"encoding/json"
	"fmt"
)

type ozonPagedPayload struct {
	Items  []map[string]interface{}
	Cursor string
	LastID string
	Total  int
}

func unwrapOzonPagedPayload(raw []byte) (ozonPagedPayload, error) {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(raw, &top); err != nil {
		return ozonPagedPayload{}, err
	}

	if resultRaw, ok := top["result"]; ok {
		if payload, err := decodePagedFromObject(resultRaw); err == nil &&
			(len(payload.Items) > 0 || payload.Cursor != "" || payload.LastID != "" || payload.Total > 0) {
			return payload, nil
		}
		// result may be a bare array
		if items, err := decodeItemMaps(resultRaw); err == nil && len(items) > 0 {
			return ozonPagedPayload{Items: items}, nil
		}
	}

	if payload, err := decodePagedFromObject(mustRaw(top)); err == nil {
		if len(payload.Items) > 0 || payload.Cursor != "" || payload.LastID != "" {
			return payload, nil
		}
	}

	if itemsRaw, ok := top["items"]; ok {
		items, err := decodeItemMaps(itemsRaw)
		if err != nil {
			return ozonPagedPayload{}, err
		}
		out := ozonPagedPayload{Items: items}
		out.Cursor = readStringField(top, "cursor")
		out.LastID = readStringField(top, "last_id")
		out.Total = readIntField(top, "total")
		return out, nil
	}
	if rowsRaw, ok := top["rows"]; ok {
		items, err := decodeItemMaps(rowsRaw)
		if err != nil {
			return ozonPagedPayload{}, err
		}
		return ozonPagedPayload{Items: items}, nil
	}

	return ozonPagedPayload{}, fmt.Errorf("ozon: no items in response")
}

func decodePagedFromObject(raw json.RawMessage) (ozonPagedPayload, error) {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(raw, &obj); err != nil {
		return ozonPagedPayload{}, err
	}
	out := ozonPagedPayload{
		Cursor: readStringField(obj, "cursor"),
		LastID: readStringField(obj, "last_id"),
		Total:  readIntField(obj, "total"),
	}
	if itemsRaw, ok := obj["items"]; ok {
		items, err := decodeItemMaps(itemsRaw)
		if err != nil {
			return ozonPagedPayload{}, err
		}
		out.Items = items
		return out, nil
	}
	if rowsRaw, ok := obj["rows"]; ok {
		items, err := decodeItemMaps(rowsRaw)
		if err != nil {
			return ozonPagedPayload{}, err
		}
		out.Items = items
		return out, nil
	}
	return out, nil
}

func mustRaw(top map[string]json.RawMessage) json.RawMessage {
	b, _ := json.Marshal(top)
	return b
}

func readStringField(obj map[string]json.RawMessage, key string) string {
	raw, ok := obj[key]
	if !ok {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return ""
	}
	return stringFromAny(s)
}

func readIntField(obj map[string]json.RawMessage, key string) int {
	raw, ok := obj[key]
	if !ok {
		return 0
	}
	var n int
	if err := json.Unmarshal(raw, &n); err != nil {
		var f float64
		if json.Unmarshal(raw, &f) == nil {
			return int(f)
		}
		return 0
	}
	return n
}

func unwrapResultItems(raw []byte) ([]map[string]interface{}, error) {
	payload, err := unwrapOzonPagedPayload(raw)
	if err != nil {
		return nil, err
	}
	return payload.Items, nil
}

func decodeItemMaps(raw json.RawMessage) ([]map[string]interface{}, error) {
	var items []map[string]interface{}
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil, err
	}
	return items, nil
}

func stockQtyFromMap(m map[string]interface{}) int {
	for _, key := range []string{
		"available_stock_count",
		"free_to_sell_amount",
		"valid_stock_count",
		"present",
		"stock",
		"quantity",
		"current_stock",
	} {
		if q := intFromAny(m[key]); q > 0 {
			return q
		}
	}
	for _, key := range []string{
		"available_stock_count",
		"free_to_sell_amount",
		"valid_stock_count",
		"present",
		"stock",
		"quantity",
		"current_stock",
	} {
		if _, ok := m[key]; ok {
			return intFromAny(m[key])
		}
	}
	return 0
}

func warehouseLabelFromMap(m map[string]interface{}) string {
	for _, key := range []string{"cluster_name", "warehouse_name", "warehouse", "cluster", "source", "type"} {
		if s := stringFromAny(m[key]); s != "" {
			return s
		}
	}
	return ""
}

func mapInterfaceSlice(v interface{}) []map[string]interface{} {
	list, ok := v.([]interface{})
	if !ok {
		return nil
	}
	out := make([]map[string]interface{}, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]interface{})
		if ok {
			out = append(out, m)
		}
	}
	return out
}

func skusFromProductInfoItem(m map[string]interface{}) []int64 {
	seen := make(map[int64]struct{})
	add := func(v int64) {
		if v > 0 {
			seen[v] = struct{}{}
		}
	}
	add(int64FromAny(m["sku"]))
	add(int64FromAny(m["fbo_sku"]))
	add(int64FromAny(m["fbs_sku"]))
	for _, src := range mapInterfaceSlice(m["sources"]) {
		add(int64FromAny(src["sku"]))
	}
	for _, st := range mapInterfaceSlice(m["stocks"]) {
		add(int64FromAny(st["sku"]))
	}
	out := make([]int64, 0, len(seen))
	for sku := range seen {
		out = append(out, sku)
	}
	return out
}

func stockRowsFromProductInfoItem(m map[string]interface{}) []StockRow {
	offerID := stringFromAny(m["offer_id"])
	if offerID == "" {
		offerID = stringFromAny(m["offerId"])
	}
	productID := int64FromAny(m["id"])
	if productID == 0 {
		productID = int64FromAny(m["product_id"])
	}
	name := stringFromAny(m["name"])

	var out []StockRow
	for _, st := range mapInterfaceSlice(m["stocks"]) {
		sku := int64FromAny(st["sku"])
		if sku == 0 {
			for _, candidate := range skusFromProductInfoItem(m) {
				sku = candidate
				break
			}
		}
		wh := warehouseLabelFromMap(st)
		if wh == "" {
			wh = "Ozon"
		}
		qty := intFromAny(st["present"])
		if qty == 0 {
			qty = stockQtyFromMap(st)
		}
		out = append(out, StockRow{
			SKU:           sku,
			ProductID:     productID,
			OfferID:       offerID,
			Name:          name,
			WarehouseName: wh,
			Quantity:      qty,
		})
	}
	return out
}
