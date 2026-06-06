//go:build integration

package integrationtest

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/config"
	"warehouse-backend/internal/db"
	"warehouse-backend/internal/httpapi"
)

const (
	testAdminUserID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
	testAdminRoleID = "11111111-1111-1111-1111-111111111111"
)

type Harness struct {
	Router http.Handler
	JWT    *auth.JWTManager
	PG     *db.Postgres
}

func NewHarness(t *testing.T) *Harness {
	t.Helper()

	cfg := config.Load()
	pg, err := db.New(db.Config{
		Host:     cfg.DBHost,
		Port:     cfg.DBPort,
		User:     cfg.DBUser,
		Password: cfg.DBPassword,
		DBName:   cfg.DBName,
	})
	if err != nil {
		t.Skipf("integration DB unavailable: %v", err)
	}
	t.Cleanup(func() { pg.Pool.Close() })

	return &Harness{
		Router: httpapi.NewRouter(pg, cfg),
		JWT:    auth.NewJWTManager(cfg.JWTSecret),
		PG:     pg,
	}
}

func (h *Harness) AdminToken(t *testing.T) string {
	t.Helper()
	userID := uuid.MustParse(testAdminUserID)
	roleID := uuid.MustParse(testAdminRoleID)
	token, err := h.JWT.GenerateToken(userID, "admin@warehouse.ru", roleID)
	if err != nil {
		t.Fatalf("generate admin token: %v", err)
	}
	return token
}

func (h *Harness) Do(t *testing.T, method, path string, token string, body io.Reader) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, body)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	h.Router.ServeHTTP(w, req)
	return w
}

func (h *Harness) GET(t *testing.T, path string, token string) *httptest.ResponseRecorder {
	return h.Do(t, http.MethodGet, path, token, nil)
}

type apiEnvelope struct {
	Data  json.RawMessage `json:"data"`
	Meta  json.RawMessage `json:"meta"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func decodeEnvelope(t *testing.T, body []byte) apiEnvelope {
	t.Helper()
	var env apiEnvelope
	if err := json.Unmarshal(body, &env); err != nil {
		t.Fatalf("decode envelope: %v body=%s", err, string(body))
	}
	return env
}

func assertStatus(t *testing.T, w *httptest.ResponseRecorder, want int) {
	t.Helper()
	if w.Code != want {
		t.Fatalf("status %d, want %d, body=%s", w.Code, want, w.Body.String())
	}
}
