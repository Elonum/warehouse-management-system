package wildberries

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// decodeSupplierStocksJSON разбирает ответ GET /supplier/stocks: массив объектов, опционально в поле data.
// Числа приходят как float64 (стандарт json.Unmarshal в map), иногда строкой — не обнуляем остатки.
func decodeSupplierStocksJSON(body []byte) ([]SupplierStockRow, error) {
	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return nil, nil
	}
	if body[0] == '{' {
		var wrap map[string]json.RawMessage
		if err := json.Unmarshal(body, &wrap); err == nil {
			for _, key := range []string{"data", "items", "result"} {
				if raw, ok := wrap[key]; ok {
					inner := bytes.TrimSpace(raw)
					if len(inner) > 0 && inner[0] == '[' {
						body = inner
						break
					}
				}
			}
		}
	}
	var raw []map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("wildberries statistics: decode stocks array: %w", err)
	}
	out := make([]SupplierStockRow, 0, len(raw))
	for _, m := range raw {
		out = append(out, supplierStockRowFromMap(m))
	}
	return out, nil
}

func supplierStockRowFromMap(m map[string]interface{}) SupplierStockRow {
	return SupplierStockRow{
		LastChangeDate:  stringFromAny(m["lastChangeDate"]),
		WarehouseName:   stringFromAny(m["warehouseName"]),
		SupplierArticle: stringFromAny(m["supplierArticle"]),
		NmID:            int64FromAny(m["nmId"]),
		Barcode:         stringFromAny(m["barcode"]),
		TechSize:        stringFromAny(m["techSize"]),
		Quantity:        intFromAny(m["quantity"]),
		QuantityFull:    intFromAny(m["quantityFull"]),
	}
}

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
	case int:
		return strconv.Itoa(x)
	case int64:
		return strconv.FormatInt(x, 10)
	case bool:
		return strconv.FormatBool(x)
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
	case float32:
		return int64(x)
	case int:
		return int64(x)
	case int64:
		return x
	case uint64:
		return int64(x)
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
