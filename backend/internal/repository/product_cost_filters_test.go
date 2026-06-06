package repository

import (
	"strings"
	"testing"
	"time"
)

func TestBuildListWhere_AllFilters(t *testing.T) {
	repo := &ProductCostRepository{}
	q := "ABC"
	from := time.Date(2026, 1, 10, 14, 0, 0, 0, time.UTC)
	to := time.Date(2026, 2, 20, 18, 0, 0, 0, time.UTC)

	where, args, next := repo.buildListWhere(nil, &q, &from, &to, true)

	mustContain := []string{
		"WHERE 1=1",
		"(p.article ILIKE $1 OR p.barcode ILIKE $1)",
		"COALESCE(pc.period_end, '9999-12-31'::date) >= $2",
		"pc.period_start <= $3",
		"CURRENT_DATE >= pc.period_start",
	}
	for _, part := range mustContain {
		if !strings.Contains(where, part) {
			t.Fatalf("where does not contain %q: %s", part, where)
		}
	}

	if len(args) != 3 {
		t.Fatalf("expected 3 args, got %d", len(args))
	}
	if got, ok := args[0].(string); !ok || got != "%ABC%" {
		t.Fatalf("unexpected q arg: %#v", args[0])
	}
	if got, ok := args[1].(time.Time); !ok || !got.Equal(DateOnlyUTC(from)) {
		t.Fatalf("unexpected from arg: %#v", args[1])
	}
	if got, ok := args[2].(time.Time); !ok || !got.Equal(DateOnlyUTC(to)) {
		t.Fatalf("unexpected to arg: %#v", args[2])
	}
	if next != 4 {
		t.Fatalf("expected next arg index 4, got %d", next)
	}
}

func TestBuildMissingCostWhere_WithQuery(t *testing.T) {
	repo := &ProductCostRepository{}
	q := "sku-1"

	where, args, next := repo.buildMissingCostWhere(&q)

	if !strings.Contains(where, "cs.current_quantity > 0") {
		t.Fatalf("missing quantity condition: %s", where)
	}
	if !strings.Contains(where, "ac.unit_cost_to_warehouse IS NULL") {
		t.Fatalf("missing active cost condition: %s", where)
	}
	if !strings.Contains(where, "(p.article ILIKE $1 OR p.barcode ILIKE $1)") {
		t.Fatalf("missing search condition: %s", where)
	}
	if len(args) != 1 || args[0] != "%sku-1%" {
		t.Fatalf("unexpected args: %#v", args)
	}
	if next != 2 {
		t.Fatalf("expected next arg index 2, got %d", next)
	}
}

