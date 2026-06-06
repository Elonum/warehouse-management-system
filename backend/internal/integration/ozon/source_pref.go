package ozon

import (
	"sync"
	"time"
)

const preferredStockSourceTTL = 24 * time.Hour

var preferredStockSource struct {
	mu     sync.RWMutex
	source string
	until  time.Time
}

func rememberStockSource(source string) {
	if source == "" {
		return
	}
	preferredStockSource.mu.Lock()
	preferredStockSource.source = source
	preferredStockSource.until = time.Now().Add(preferredStockSourceTTL)
	preferredStockSource.mu.Unlock()
}

func preferredStockSourcePath() (string, bool) {
	preferredStockSource.mu.RLock()
	defer preferredStockSource.mu.RUnlock()
	if preferredStockSource.source == "" || time.Now().After(preferredStockSource.until) {
		return "", false
	}
	return preferredStockSource.source, true
}

func clearPreferredStockSource() {
	preferredStockSource.mu.Lock()
	preferredStockSource.source = ""
	preferredStockSource.until = time.Time{}
	preferredStockSource.mu.Unlock()
}
