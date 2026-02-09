package middleware

import (
	"net/http"
)

// SecurityHeaders adds security-related HTTP headers to all responses
// This middleware helps protect against common web vulnerabilities:
// - XSS attacks (X-Content-Type-Options, X-XSS-Protection)
// - Clickjacking (X-Frame-Options)
// - MIME type sniffing (X-Content-Type-Options)
// - Protocol downgrade attacks (Strict-Transport-Security in production)
// - Information disclosure (X-Powered-By removal)
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing - forces browser to respect declared Content-Type
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking attacks - controls if page can be displayed in iframe
		// DENY is most restrictive, prevents all framing
		w.Header().Set("X-Frame-Options", "DENY")

		// Enable browser's built-in XSS protection (legacy, but still useful)
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Remove server information disclosure
		// This prevents revealing technology stack (e.g., "Express", "Go", etc.)
		w.Header().Set("X-Powered-By", "")

		// Referrer Policy - controls how much referrer information is sent
		// strict-origin-when-cross-origin: send full URL for same-origin, only origin for cross-origin HTTPS->HTTPS
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature Policy)
		// Disables potentially dangerous browser features
		w.Header().Set("Permissions-Policy",
			"geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()")

		// Content Security Policy (CSP) - strict policy to prevent XSS
		// This is a restrictive policy that can be adjusted based on your needs
		// For now, we'll use a strict policy that only allows same-origin resources
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // unsafe-inline/eval may be needed for some frontend frameworks
			"style-src 'self' 'unsafe-inline'; " + // unsafe-inline needed for inline styles
			"img-src 'self' data: blob:; " + // Allow data URIs and blob for images
			"font-src 'self' data:; " +
			"connect-src 'self'; " +
			"frame-ancestors 'none'; " + // Prevent framing (redundant with X-Frame-Options but more modern)
			"base-uri 'self'; " +
			"form-action 'self'; " +
			"upgrade-insecure-requests" // Upgrade HTTP to HTTPS (useful in production)

		w.Header().Set("Content-Security-Policy", csp)

		// HSTS (HTTP Strict Transport Security) - only in production with HTTPS
		// This tells browsers to always use HTTPS for this domain
		// max-age=31536000 = 1 year
		// includeSubDomains = apply to all subdomains
		// preload = allow inclusion in browser HSTS preload lists
		// Note: Only set this if you're using HTTPS in production!
		// For development, we'll skip this or make it conditional
		if r.TLS != nil {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		next.ServeHTTP(w, r)
	})
}
