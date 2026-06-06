package repository

import (
	"strings"
	"testing"
)

func TestStockCurrentWhereAndArgs_MissingCost(t *testing.T) {
	q := "A-100"
	where, args, next := stockCurrentWhereAndArgs(nil, nil, &q, StockLevelFilterMissingCost)

	if !strings.Contains(where, "(p.article ILIKE $1 OR p.barcode ILIKE $1)") {
		t.Fatalf("missing q condition: %s", where)
	}
	if !strings.Contains(where, "cs.current_quantity > 0 AND ac.unit_cost_to_warehouse IS NULL") {
		t.Fatalf("missing missing_cost condition: %s", where)
	}
	if len(args) != 1 || args[0] != "%A-100%" {
		t.Fatalf("unexpected args: %#v", args)
	}
	if next != 2 {
		t.Fatalf("expected next arg index 2, got %d", next)
	}
}

func TestStockCurrentOrderBy_BelowReorder(t *testing.T) {
	got := stockCurrentOrderBy(StockLevelFilterBelowReorder)
	wantPart := "ORDER BY cs.current_quantity ASC"
	if !strings.Contains(got, wantPart) {
		t.Fatalf("expected %q in order by, got: %s", wantPart, got)
	}
}

