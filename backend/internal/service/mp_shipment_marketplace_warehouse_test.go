package service

import (
	"testing"

	"github.com/google/uuid"
	"warehouse-backend/internal/repository"
)

func TestCollectMarketplaceWarehouseIDs(t *testing.T) {
	dest := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	w1 := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	w2 := uuid.MustParse("33333333-3333-3333-3333-333333333333")

	t.Run("has marketplace warehouses", func(t *testing.T) {
		warehouses := []repository.Warehouse{
			{WarehouseID: w1, IsMarketplace: true},
			{WarehouseID: w2, IsMarketplace: false},
		}
		got, had := collectMarketplaceWarehouseIDs(warehouses, dest)
		if !had {
			t.Fatalf("expected hadMarketplace=true")
		}
		if _, ok := got[w1]; !ok {
			t.Fatalf("expected marketplace warehouse w1 in result")
		}
		if _, ok := got[w2]; ok {
			t.Fatalf("did not expect non-marketplace warehouse w2 in result")
		}
		if _, ok := got[dest]; !ok {
			t.Fatalf("expected destination warehouse in result for source exclusion")
		}
	})

	t.Run("no marketplace warehouses fallback", func(t *testing.T) {
		warehouses := []repository.Warehouse{
			{WarehouseID: w2, IsMarketplace: false},
		}
		got, had := collectMarketplaceWarehouseIDs(warehouses, dest)
		if had {
			t.Fatalf("expected hadMarketplace=false")
		}
		if len(got) != 1 {
			t.Fatalf("expected only destination warehouse in result, got %d", len(got))
		}
		if _, ok := got[dest]; !ok {
			t.Fatalf("expected destination warehouse in result")
		}
	})
}

