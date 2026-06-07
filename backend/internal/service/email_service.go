package service

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"html"
	"mime"
	"net"
	"net/smtp"
	"net/url"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	FromName string
	TLSMode  string
	Timeout  time.Duration
}

// EmailService handles transactional email delivery.
type EmailService struct {
	frontendURL string
	env         string
	smtpConfig  SMTPConfig
}

func NewEmailService(frontendURL, env string, smtpConfig SMTPConfig) *EmailService {
	if smtpConfig.Timeout <= 0 {
		smtpConfig.Timeout = 10 * time.Second
	}
	return &EmailService{
		frontendURL: strings.TrimRight(frontendURL, "/"),
		env:         env,
		smtpConfig:  smtpConfig,
	}
}

// SendPasswordResetEmail sends a password reset email to the user
func (s *EmailService) SendPasswordResetEmail(email, resetToken string) error {
	resetURL, err := s.passwordResetURL(resetToken)
	if err != nil {
		return err
	}

	if s.env == "development" {
		log.Info().
			Str("email", email).
			Str("resetURL", resetURL).
			Str("token", resetToken).
			Msg("Password reset email (dev mode - email not actually sent)")

		// Also print to console for easy testing
		fmt.Printf("\n=== PASSWORD RESET EMAIL (DEV MODE) ===\n")
		fmt.Printf("To: %s\n", email)
		fmt.Printf("Subject: Сброс пароля\n")
		fmt.Printf("Reset URL: %s\n", resetURL)
		fmt.Printf("Token: %s\n", resetToken)
		fmt.Printf("========================================\n\n")

		return nil
	}

	subject := "Сброс пароля в Warehouse Management System"
	textBody := fmt.Sprintf(`Здравствуйте!

Мы получили запрос на сброс пароля для вашей учётной записи.

Чтобы задать новый пароль, перейдите по ссылке:
%s

Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
`, resetURL)
	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="ru">
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <h2>Сброс пароля</h2>
  <p>Мы получили запрос на сброс пароля для вашей учётной записи.</p>
  <p>
    <a href="%s" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;">
      Задать новый пароль
    </a>
  </p>
  <p>Ссылка действительна 1 час.</p>
  <p style="color:#64748b;font-size:13px;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
</body>
</html>`, html.EscapeString(resetURL))

	return s.sendSMTPEmail(email, subject, textBody, htmlBody)
}

func (s *EmailService) passwordResetURL(resetToken string) (string, error) {
	if strings.TrimSpace(s.frontendURL) == "" {
		return "", fmt.Errorf("frontend URL is not configured")
	}
	u, err := url.Parse(s.frontendURL)
	if err != nil {
		return "", fmt.Errorf("invalid frontend URL: %w", err)
	}
	u.Path = "/reset-password"
	q := u.Query()
	q.Set("token", resetToken)
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func (s *EmailService) sendSMTPEmail(to, subject, textBody, htmlBody string) error {
	cfg := s.smtpConfig
	if strings.TrimSpace(cfg.Host) == "" || strings.TrimSpace(cfg.Port) == "" || strings.TrimSpace(cfg.From) == "" {
		return fmt.Errorf("SMTP is not configured")
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Timeout)
	defer cancel()

	client, err := s.newSMTPClient(ctx, cfg)
	if err != nil {
		return err
	}
	defer client.Close()

	if cfg.Username != "" {
		auth := smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP auth failed: %w", err)
		}
	}

	if err := client.Mail(cfg.From); err != nil {
		return fmt.Errorf("SMTP MAIL FROM failed: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("SMTP RCPT TO failed: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA failed: %w", err)
	}
	if _, err := w.Write(buildResetEmailMessage(cfg, to, subject, textBody, htmlBody)); err != nil {
		_ = w.Close()
		return fmt.Errorf("SMTP write failed: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("SMTP close DATA failed: %w", err)
	}
	if err := client.Quit(); err != nil {
		return fmt.Errorf("SMTP quit failed: %w", err)
	}
	return nil
}

func (s *EmailService) newSMTPClient(ctx context.Context, cfg SMTPConfig) (*smtp.Client, error) {
	addr := net.JoinHostPort(cfg.Host, cfg.Port)
	dialer := &net.Dialer{}
	tlsConfig := &tls.Config{
		ServerName: cfg.Host,
		MinVersion: tls.VersionTLS12,
	}

	mode := strings.ToLower(strings.TrimSpace(cfg.TLSMode))
	if mode == "" {
		mode = "starttls"
	}

	var conn net.Conn
	var err error
	if mode == "tls" {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return nil, fmt.Errorf("SMTP connect failed: %w", err)
	}
	if cfg.Timeout > 0 {
		_ = conn.SetDeadline(time.Now().Add(cfg.Timeout))
	}

	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("SMTP client init failed: %w", err)
	}

	if mode == "starttls" {
		if ok, _ := client.Extension("STARTTLS"); !ok {
			_ = client.Close()
			return nil, fmt.Errorf("SMTP server does not support STARTTLS")
		}
		if err := client.StartTLS(tlsConfig); err != nil {
			_ = client.Close()
			return nil, fmt.Errorf("SMTP STARTTLS failed: %w", err)
		}
	} else if mode != "tls" && mode != "none" {
		_ = client.Close()
		return nil, fmt.Errorf("unsupported SMTP_TLS_MODE %q", cfg.TLSMode)
	}

	return client, nil
}

func buildResetEmailMessage(cfg SMTPConfig, to, subject, textBody, htmlBody string) []byte {
	boundary := fmt.Sprintf("wms-reset-%d", time.Now().UnixNano())
	fromName := strings.TrimSpace(cfg.FromName)
	from := cfg.From
	if fromName != "" {
		from = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", fromName), cfg.From)
	}

	var buf bytes.Buffer
	writeHeader := func(key, value string) {
		buf.WriteString(key)
		buf.WriteString(": ")
		buf.WriteString(value)
		buf.WriteString("\r\n")
	}

	writeHeader("From", from)
	writeHeader("To", to)
	writeHeader("Subject", mime.QEncoding.Encode("utf-8", subject))
	writeHeader("MIME-Version", "1.0")
	writeHeader("Content-Type", fmt.Sprintf(`multipart/alternative; boundary="%s"`, boundary))
	buf.WriteString("\r\n")

	fmt.Fprintf(&buf, "--%s\r\n", boundary)
	writeHeader("Content-Type", `text/plain; charset="UTF-8"`)
	writeHeader("Content-Transfer-Encoding", "8bit")
	buf.WriteString("\r\n")
	buf.WriteString(textBody)
	buf.WriteString("\r\n")

	fmt.Fprintf(&buf, "--%s\r\n", boundary)
	writeHeader("Content-Type", `text/html; charset="UTF-8"`)
	writeHeader("Content-Transfer-Encoding", "8bit")
	buf.WriteString("\r\n")
	buf.WriteString(htmlBody)
	buf.WriteString("\r\n")
	fmt.Fprintf(&buf, "--%s--\r\n", boundary)

	return buf.Bytes()
}
