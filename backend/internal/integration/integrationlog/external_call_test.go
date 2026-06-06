package integrationlog

import "testing"

func TestExternalCall_FullURL(t *testing.T) {
	tests := []struct {
		name string
		call ExternalCall
		want string
	}{
		{
			name: "ozon path with slash",
			call: OzonPOST("https://api-seller.ozon.ru", "/v4/product/info/stocks"),
			want: "https://api-seller.ozon.ru/v4/product/info/stocks",
		},
		{
			name: "ozon path without slash",
			call: OzonPOST("https://api-seller.ozon.ru/", "v3/product/list"),
			want: "https://api-seller.ozon.ru/v3/product/list",
		},
		{
			name: "wildberries statistics",
			call: WildberriesGET("https://statistics-api.wildberries.ru", "/api/v1/supplier/stocks"),
			want: "https://statistics-api.wildberries.ru/api/v1/supplier/stocks",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.call.FullURL(); got != tt.want {
				t.Fatalf("FullURL() = %q, want %q", got, tt.want)
			}
		})
	}
}
