package service

import (
	"fmt"

	"github.com/rs/zerolog/log"
)

// EmailService handles email sending
// In development, it logs emails to console
// In production, it should be replaced with a real email service (SMTP, SendGrid, etc.)
type EmailService struct {
	baseURL string
	env     string
}

func NewEmailService(baseURL, env string) *EmailService {
	return &EmailService{
		baseURL: baseURL,
		env:     env,
	}
}

// SendPasswordResetEmail sends a password reset email to the user
func (s *EmailService) SendPasswordResetEmail(email, resetToken string) error {
	// baseURL is already the frontend URL from config
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.baseURL, resetToken)

	// In development, log to console
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

	// In production, implement actual email sending here
	// Example with SMTP:
	// return s.sendSMTPEmail(email, "Сброс пароля", resetURL)

	// For now, log warning that email service is not configured
	log.Warn().
		Str("email", email).
		Msg("Email service not configured for production - password reset email not sent")

	return fmt.Errorf("email service not configured for production environment")
}

// sendSMTPEmail is a placeholder for actual SMTP email sending
// Uncomment and implement when ready for production
/*
func (s *EmailService) sendSMTPEmail(to, subject, body string) error {
	// Implement SMTP email sending here
	// Example libraries: net/smtp, gomail, sendgrid-go, etc.
	return nil
}
*/
