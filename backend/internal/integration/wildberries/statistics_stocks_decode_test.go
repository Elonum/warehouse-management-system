package wildberries

import "testing"

func TestDecodeSupplierStocksJSON_StringQuantity(t *testing.T) {
	raw := []byte(`[{"nmId":1439871458,"quantity":"33","quantityFull":34,"warehouseName":"W","lastChangeDate":"2023-01-01","barcode":"x","supplierArticle":"a"}]`)
	rows, err := decodeSupplierStocksJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("len %d", len(rows))
	}
	if rows[0].Quantity != 33 || rows[0].QuantityFull != 34 || rows[0].NmID != 1439871458 {
		t.Fatalf("%+v", rows[0])
	}
}

func TestDecodeSupplierStocksJSON_WrappedData(t *testing.T) {
	raw := []byte(`{"data":[{"nmId":1,"quantity":5,"quantityFull":5,"warehouseName":"X","lastChangeDate":"t","barcode":"","supplierArticle":""}]}`)
	rows, err := decodeSupplierStocksJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].Quantity != 5 {
		t.Fatalf("%+v", rows)
	}
}
