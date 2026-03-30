package service

import (
	"testing"

	"github.com/google/uuid"
)

func TestAllocateFromSortedSources(t *testing.T) {
	a := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	b := uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
	c := uuid.MustParse("cccccccc-cccc-cccc-cccc-cccccccccccc")

	t.Run("exactSum", func(t *testing.T) {
		sources := []sourceAllocation{
			{warehouseID: a, qty: 3},
			{warehouseID: b, qty: 7},
		}
		allocations, available, err := allocateFromSortedSources(10, sources)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if available != 10 {
			t.Fatalf("expected available=10, got %d", available)
		}
		if len(allocations) != 2 {
			t.Fatalf("expected 2 allocations, got %d", len(allocations))
		}
		if allocations[0].warehouseID != a || allocations[0].qty != 3 {
			t.Fatalf("unexpected first allocation: %+v", allocations[0])
		}
		if allocations[1].warehouseID != b || allocations[1].qty != 7 {
			t.Fatalf("unexpected second allocation: %+v", allocations[1])
		}
	})

	t.Run("partialFromFirst", func(t *testing.T) {
		sources := []sourceAllocation{
			{warehouseID: a, qty: 10},
			{warehouseID: b, qty: 2},
		}
		allocations, available, err := allocateFromSortedSources(5, sources)
		if err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
		if available != 12 {
			t.Fatalf("expected available=12, got %d", available)
		}
		if len(allocations) != 1 {
			t.Fatalf("expected 1 allocation, got %d", len(allocations))
		}
		if allocations[0].warehouseID != a || allocations[0].qty != 5 {
			t.Fatalf("unexpected allocation: %+v", allocations[0])
		}
	})

	t.Run("insufficient", func(t *testing.T) {
		sources := []sourceAllocation{
			{warehouseID: a, qty: 3},
			{warehouseID: b, qty: 4},
			{warehouseID: c, qty: 4},
		}
		allocations, available, err := allocateFromSortedSources(12, sources)
		if err == nil {
			t.Fatalf("expected error, got nil allocations=%v available=%d", allocations, available)
		}
		if available != 11 {
			t.Fatalf("expected available=11, got %d", available)
		}
	})
}

