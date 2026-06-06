package upstream

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestStocksCache_GetOrFetchSingleflight(t *testing.T) {
	cache := NewStocksCache(time.Minute)
	var calls int32

	fetch := func(context.Context) (int, error) {
		atomic.AddInt32(&calls, 1)
		return 42, nil
	}

	v1, hit1, err := GetOrFetch(cache, context.Background(), "k", fetch)
	if err != nil || v1 != 42 || hit1 {
		t.Fatalf("first fetch: v=%d hit=%v err=%v", v1, hit1, err)
	}

	v2, hit2, err := GetOrFetch(cache, context.Background(), "k", fetch)
	if err != nil || v2 != 42 || !hit2 {
		t.Fatalf("second fetch: v=%d hit=%v err=%v", v2, hit2, err)
	}
	if calls != 1 {
		t.Fatalf("expected 1 upstream call, got %d", calls)
	}
}
