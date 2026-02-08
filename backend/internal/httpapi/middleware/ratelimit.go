package middleware

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// RateLimiter implements a simple in-memory rate limiter
// Uses token bucket algorithm with sliding window
type RateLimiter struct {
	// requests stores the number of requests per IP
	requests map[string][]time.Time
	// mu protects the requests map from concurrent access
	mu sync.RWMutex
	// cleanup runs periodically to remove old entries
	cleanupTicker *time.Ticker
	// maxRequests is the maximum number of requests allowed
	maxRequests int
	// windowDuration is the time window for rate limiting
	windowDuration time.Duration
}

// NewRateLimiter creates a new rate limiter
// maxRequests: maximum number of requests allowed
// windowDuration: time window (e.g., 1 minute, 5 minutes)
func NewRateLimiter(maxRequests int, windowDuration time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests:      make(map[string][]time.Time),
		maxRequests:   maxRequests,
		windowDuration: windowDuration,
		cleanupTicker:  time.NewTicker(5 * time.Minute), // Clean up old entries every 5 minutes
	}

	// Start cleanup goroutine to prevent memory leaks
	go rl.cleanup()

	return rl
}

// cleanup removes old entries from the requests map to prevent memory leaks
func (rl *RateLimiter) cleanup() {
	for range rl.cleanupTicker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, timestamps := range rl.requests {
			// Remove timestamps older than windowDuration
			validTimestamps := []time.Time{}
			for _, ts := range timestamps {
				if now.Sub(ts) < rl.windowDuration {
					validTimestamps = append(validTimestamps, ts)
				}
			}
			if len(validTimestamps) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = validTimestamps
			}
		}
		rl.mu.Unlock()
	}
}

// Allow checks if a request from the given IP should be allowed
// Returns true if allowed, false if rate limit exceeded
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	
	// Get existing timestamps for this IP
	timestamps, exists := rl.requests[ip]
	if !exists {
		// First request from this IP
		rl.requests[ip] = []time.Time{now}
		return true
	}

	// Remove timestamps outside the window
	validTimestamps := []time.Time{}
	for _, ts := range timestamps {
		if now.Sub(ts) < rl.windowDuration {
			validTimestamps = append(validTimestamps, ts)
		}
	}

	// Check if we've exceeded the limit
	if len(validTimestamps) >= rl.maxRequests {
		return false
	}

	// Add current request timestamp
	validTimestamps = append(validTimestamps, now)
	rl.requests[ip] = validTimestamps

	return true
}

// GetRemainingRequests returns the number of remaining requests for an IP
func (rl *RateLimiter) GetRemainingRequests(ip string) int {
	rl.mu.RLock()
	defer rl.mu.RUnlock()

	timestamps, exists := rl.requests[ip]
	if !exists {
		return rl.maxRequests
	}

	now := time.Now()
	validCount := 0
	for _, ts := range timestamps {
		if now.Sub(ts) < rl.windowDuration {
			validCount++
		}
	}

	return rl.maxRequests - validCount
}

// Stop stops the cleanup goroutine (call this on shutdown)
func (rl *RateLimiter) Stop() {
	if rl.cleanupTicker != nil {
		rl.cleanupTicker.Stop()
	}
}

// getClientIP extracts the real client IP from the request
// Handles proxies and load balancers (X-Forwarded-For, X-Real-IP)
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (set by proxies/load balancers)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		// Format: "client, proxy1, proxy2"
		ips := splitIPs(xff)
		if len(ips) > 0 {
			return ips[0]
		}
	}

	// Check X-Real-IP header (set by some proxies)
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	ip := r.RemoteAddr
	// RemoteAddr format: "IP:port", extract just the IP
	if idx := lastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// Helper functions for IP parsing
func splitIPs(s string) []string {
	var ips []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			ip := trimSpace(s[start:i])
			if ip != "" {
				ips = append(ips, ip)
			}
			start = i + 1
		}
	}
	// Add last IP
	if start < len(s) {
		ip := trimSpace(s[start:])
		if ip != "" {
			ips = append(ips, ip)
		}
	}
	return ips
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && s[start] == ' ' {
		start++
	}
	for end > start && s[end-1] == ' ' {
		end--
	}
	return s[start:end]
}

func lastIndex(s string, substr string) int {
	for i := len(s) - len(substr); i >= 0; i-- {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

// RateLimitMiddleware creates a middleware that rate limits requests
// Different limits can be applied to different endpoints
func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getClientIP(r)

			if !limiter.Allow(ip) {
				w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limiter.maxRequests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("Retry-After", strconv.Itoa(int(limiter.windowDuration.Seconds())))
				
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				
				response := map[string]interface{}{
					"error": map[string]interface{}{
						"code":    "RATE_LIMIT_EXCEEDED",
						"message": "Too many requests. Please try again later.",
					},
				}
				
				json.NewEncoder(w).Encode(response)
				return
			}

			// Add rate limit headers to successful requests
			remaining := limiter.GetRemainingRequests(ip)
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limiter.maxRequests))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

			next.ServeHTTP(w, r)
		})
	}
}

