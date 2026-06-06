package integrationlog

import (
	"net/http"
	"strings"

	"github.com/rs/zerolog"
)

// ExternalCall describes an upstream marketplace HTTP request for structured logs.
type ExternalCall struct {
	Integration string
	Method      string
	BaseURL     string
	Path        string
}

// FullURL returns base URL + path (path is normalized with a leading slash).
func (c ExternalCall) FullURL() string {
	base := strings.TrimRight(strings.TrimSpace(c.BaseURL), "/")
	path := strings.TrimSpace(c.Path)
	if path == "" {
		return base
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return base + path
}

// Apply adds integration and external_* fields to a zerolog event.
func (c ExternalCall) Apply(e *zerolog.Event) *zerolog.Event {
	if c.Integration != "" {
		e = e.Str("integration", c.Integration)
	}
	if c.Method != "" {
		e = e.Str("external_method", c.Method)
	}
	if c.BaseURL != "" {
		e = e.Str("external_base", strings.TrimRight(strings.TrimSpace(c.BaseURL), "/"))
	}
	if c.Path != "" {
		path := strings.TrimSpace(c.Path)
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		e = e.Str("external_path", path)
	}
	return e.Str("external_url", c.FullURL())
}

// LogExternalCall attaches upstream call fields to a log event.
func LogExternalCall(e *zerolog.Event, call ExternalCall) *zerolog.Event {
	return call.Apply(e)
}

// OzonPOST builds an ExternalCall for Ozon Seller API POST endpoints.
func OzonPOST(baseURL, path string) ExternalCall {
	return ExternalCall{
		Integration: "ozon",
		Method:      http.MethodPost,
		BaseURL:     baseURL,
		Path:        path,
	}
}

// WildberriesGET builds an ExternalCall for Wildberries Statistics API GET endpoints.
func WildberriesGET(baseURL, path string) ExternalCall {
	return ExternalCall{
		Integration: "wildberries",
		Method:      http.MethodGet,
		BaseURL:     baseURL,
		Path:        path,
	}
}
