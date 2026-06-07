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

	prodOK := Config{
		Env:         "production",
		JWTSecret:   "strong-random-production-secret",
		FrontendURL: "https://wms.example.com",
		SMTPHost:    "smtp.example.com",
		SMTPPort:    "587",
		SMTPFrom:    "no-reply@example.com",
		SMTPTLSMode: "starttls",
	}
	if err := prodOK.Validate(); err != nil {
		t.Fatalf("expected valid production config: %v", err)
	}
}

func TestValidateProductionSMTPConfig(t *testing.T) {
	base := Config{
		Env:         "production",
		JWTSecret:   "strong-random-production-secret",
		FrontendURL: "https://wms.example.com",
		SMTPHost:    "smtp.example.com",
		SMTPPort:    "587",
		SMTPFrom:    "no-reply@example.com",
		SMTPTLSMode: "starttls",
	}

	missingHost := base
	missingHost.SMTPHost = ""
	if err := missingHost.Validate(); err == nil {
		t.Fatal("expected missing SMTP_HOST to be rejected")
	}

	noTLS := base
	noTLS.SMTPTLSMode = "none"
	if err := noTLS.Validate(); err == nil {
		t.Fatal("expected SMTP_TLS_MODE=none to be rejected in production")
	}

	invalidTLSMode := base
	invalidTLSMode.SMTPTLSMode = "sslmaybe"
	if err := invalidTLSMode.Validate(); err == nil {
		t.Fatal("expected invalid SMTP_TLS_MODE to be rejected")
	}
}
