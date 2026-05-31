package config

import "testing"

func TestValidateProductionJWTSecret(t *testing.T) {
	dev := Config{Env: "development", JWTSecret: defaultJWTSecret}
	if err := dev.Validate(); err != nil {
		t.Fatalf("development config should validate: %v", err)
	}

	prodWeak := Config{Env: "production", JWTSecret: defaultJWTSecret}
	if err := prodWeak.Validate(); err == nil {
		t.Fatal("expected production default JWT secret to be rejected")
	}

	prodOK := Config{Env: "production", JWTSecret: "strong-random-production-secret"}
	if err := prodOK.Validate(); err != nil {
		t.Fatalf("expected valid production config: %v", err)
	}
}
