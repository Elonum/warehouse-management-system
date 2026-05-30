package integrationlog

import "strings"

// Truncate shortens text for safe structured logs (no secrets expansion).
func Truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	if max <= 0 || len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
