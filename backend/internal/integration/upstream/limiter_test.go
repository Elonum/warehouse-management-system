package upstream

import (
	"context"
	"testing"
	"time"
)

func TestLimiter_WaitRespectsMinInterval(t *testing.T) {
	lim := NewLimiter("test", 10, time.Minute, 50*time.Millisecond)
	ctx := context.Background()

	start := time.Now()
	if err := lim.Wait(ctx); err != nil {
		t.Fatal(err)
	}
	if err := lim.Wait(ctx); err != nil {
		t.Fatal(err)
	}
	if elapsed := time.Since(start); elapsed < 45*time.Millisecond {
		t.Fatalf("expected min interval between grants, got %v", elapsed)
	}
}

func TestLimiter_WaitRespectsContextCancel(t *testing.T) {
	lim := NewLimiter("test", 1, time.Hour, 0)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if err := lim.Wait(ctx); err == nil {
		t.Fatal("expected context error")
	}
}
