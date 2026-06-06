package upstream

import (
	"context"
	"fmt"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

// StocksCache deduplicates in-flight integration fetches and serves recent responses from memory.
type StocksCache struct {
	ttl time.Duration
	mu  sync.RWMutex
	entries map[string]cacheEntry
	sf  singleflight.Group
}

type cacheEntry struct {
	value     any
	expiresAt time.Time
}

func NewStocksCache(ttl time.Duration) *StocksCache {
	if ttl <= 0 {
		ttl = 90 * time.Second
	}
	return &StocksCache{
		ttl:     ttl,
		entries: make(map[string]cacheEntry),
	}
}

func (c *StocksCache) TTL() time.Duration {
	return c.ttl
}

func (c *StocksCache) get(key string) (any, bool) {
	c.mu.RLock()
	entry, ok := c.entries[key]
	c.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		return nil, false
	}
	return entry.value, true
}

func (c *StocksCache) set(key string, value any) {
	c.mu.Lock()
	c.entries[key] = cacheEntry{
		value:     value,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Unlock()
}

// GetOrFetch returns cached data when fresh; otherwise runs fetch once per key (singleflight).
func GetOrFetch[T any](c *StocksCache, ctx context.Context, key string, fetch func(context.Context) (T, error)) (T, bool, error) {
	var zero T
	if c == nil {
		v, err := fetch(ctx)
		return v, false, err
	}

	if v, ok := c.get(key); ok {
		if typed, ok := v.(T); ok {
			return typed, true, nil
		}
	}

	v, err, _ := c.sf.Do(key, func() (any, error) {
		if cached, ok := c.get(key); ok {
			return cached, nil
		}
		result, err := fetch(ctx)
		if err != nil {
			return nil, err
		}
		c.set(key, result)
		return result, nil
	})
	if err != nil {
		return zero, false, err
	}
	typed, ok := v.(T)
	if !ok {
		return zero, false, fmt.Errorf("upstream cache: type mismatch for key %q", key)
	}
	return typed, false, nil
}
