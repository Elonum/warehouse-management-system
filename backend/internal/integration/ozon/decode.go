package ozon

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

func stringFromAny(v interface{}) string {
	if v == nil {
		return ""
	}
	switch x := v.(type) {
	case string:
		return strings.TrimSpace(x)
	case json.Number:
		return strings.TrimSpace(x.String())
	case float64:
		return strconv.FormatInt(int64(x), 10)
	case int64:
		return strconv.FormatInt(x, 10)
	case int:
		return strconv.Itoa(x)
	default:
		return strings.TrimSpace(fmt.Sprint(x))
	}
}

func intFromAny(v interface{}) int {
	return int(int64FromAny(v))
}

func int64FromAny(v interface{}) int64 {
	if v == nil {
		return 0
	}
	switch x := v.(type) {
	case float64:
		return int64(x)
	case int:
		return int64(x)
	case int64:
		return x
	case json.Number:
		i, err := x.Int64()
		if err != nil {
			f, err2 := x.Float64()
			if err2 != nil {
				return 0
			}
			return int64(f)
		}
		return i
	case string:
		s := strings.TrimSpace(x)
		if s == "" {
			return 0
		}
		i, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			return 0
		}
		return i
	default:
		return 0
	}
}

func unwrapResultItems(raw []byte) ([]map[string]interface{}, error) {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(raw, &top); err != nil {
		return nil, err
	}
	if resultRaw, ok := top["result"]; ok {
		var resultObj map[string]json.RawMessage
		if err := json.Unmarshal(resultRaw, &resultObj); err == nil {
			if itemsRaw, ok := resultObj["items"]; ok {
				return decodeItemMaps(itemsRaw)
			}
		}
		var direct []map[string]interface{}
		if err := json.Unmarshal(resultRaw, &direct); err == nil {
			return direct, nil
		}
	}
	if itemsRaw, ok := top["items"]; ok {
		return decodeItemMaps(itemsRaw)
	}
	var direct []map[string]interface{}
	if err := json.Unmarshal(raw, &direct); err == nil {
		return direct, nil
	}
	return nil, fmt.Errorf("ozon: no items in response")
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
	for _, key := range []string{"cluster_name", "warehouse_name", "warehouse", "cluster"} {
		if s := stringFromAny(m[key]); s != "" {
			return s
		}
	}
	return ""
}
