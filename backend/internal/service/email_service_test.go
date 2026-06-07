package service

import (
	"strings"
	"testing"
	"time"
)

func TestPasswordResetURL(t *testing.T) {
	svc := NewEmailService("https://wms.example.com/app", "production", SMTPConfig{})

	got, err := svc.passwordResetURL("abc+token/with=symbols")
	if err != nil {
		t.Fatalf("passwordResetURL returned error: %v", err)
	}

	if !strings.HasPrefix(got, "https://wms.example.com/reset-password?") {
		t.Fatalf("unexpected reset URL prefix: %s", got)
	}
	if !strings.Contains(got, "token=abc%2Btoken%2Fwith%3Dsymbols") {
		t.Fatalf("reset token was not URL-encoded: %s", got)
	}
}

func TestBuildResetEmailMessage(t *testing.T) {
	msg := string(buildResetEmailMessage(
		SMTPConfig{
			From:     "no-reply@example.com",
			FromName: "Склад",
			Timeout:  10 * time.Second,
		},
		"user@example.com",
		"Сброс пароля",
		"text body",
		"<p>html body</p>",
	))

	required := []string{
		"From: =?utf-8?",
		"<no-reply@example.com>",
		"To: user@example.com",
		"Subject: =?utf-8?",
		"multipart/alternative",
		"text/plain",
		"text/html",
		"text body",
		"<p>html body</p>",
	}
	for _, part := range required {
		if !strings.Contains(msg, part) {
			t.Fatalf("email message missing %q:\n%s", part, msg)
		}
	}
}
