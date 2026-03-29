package validation

import (
	"errors"
	"regexp"
	"strings"
	"unicode"
)

var (
	ErrInvalidEmail     = errors.New("invalid email format")
	ErrWeakPassword     = errors.New("password does not meet security requirements")
	ErrPasswordTooShort = errors.New("password must be at least 8 characters long")
	ErrPasswordTooLong  = errors.New("password must be no more than 128 characters long")
)

// Email validation regex pattern
// This is a comprehensive pattern that covers most valid email formats
// It's not perfect (RFC 5322 is extremely complex), but it's a good balance
// Security: Prevents injection attacks by restricting allowed characters
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// Email length constants for database protection
const (
	EmailMaxLength       = 254 // RFC 5321 maximum email length
	EmailLocalMaxLength  = 64  // RFC 5321 maximum local part length
	EmailDomainMaxLength = 253 // RFC 5321 maximum domain length
)

// ValidateEmail validates email format
// Returns error if email is invalid
func ValidateEmail(email string) error {
	if email == "" {
		return ErrInvalidEmail
	}

	// Trim whitespace
	email = strings.TrimSpace(email)

	// Check length (RFC 5321: max 254 characters for email address)
	// This prevents database overflow and DoS attacks
	if len(email) > EmailMaxLength {
		return ErrInvalidEmail
	}

	// Check basic format with regex
	if !emailRegex.MatchString(email) {
		return ErrInvalidEmail
	}

	// Additional checks
	// Email should not start or end with dot
	if strings.HasPrefix(email, ".") || strings.HasSuffix(email, ".") {
		return ErrInvalidEmail
	}

	// Email should not have consecutive dots
	if strings.Contains(email, "..") {
		return ErrInvalidEmail
	}

	// Email should have exactly one @ symbol
	atCount := strings.Count(email, "@")
	if atCount != 1 {
		return ErrInvalidEmail
	}

	// Split by @ and validate parts
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return ErrInvalidEmail
	}

	localPart := parts[0]
	domainPart := parts[1]

	// Local part validation (before @)
	// Security: Prevent buffer overflow attacks
	if len(localPart) == 0 || len(localPart) > EmailLocalMaxLength {
		return ErrInvalidEmail
	}

	// Domain part validation (after @)
	// Security: Prevent buffer overflow attacks
	if len(domainPart) == 0 || len(domainPart) > EmailDomainMaxLength {
		return ErrInvalidEmail
	}

	// Domain should have at least one dot
	if !strings.Contains(domainPart, ".") {
		return ErrInvalidEmail
	}

	// Domain should not start or end with dot or hyphen
	if strings.HasPrefix(domainPart, ".") || strings.HasSuffix(domainPart, ".") ||
		strings.HasPrefix(domainPart, "-") || strings.HasSuffix(domainPart, "-") {
		return ErrInvalidEmail
	}

	return nil
}

// PasswordRequirements defines password strength requirements
type PasswordRequirements struct {
	MinLength        int  // Minimum length (default: 8)
	MaxLength        int  // Maximum length (default: 128)
	RequireUppercase bool // Require at least one uppercase letter
	RequireLowercase bool // Require at least one lowercase letter
	RequireNumber    bool // Require at least one number
	RequireSpecial   bool // Require at least one special character
}

// DefaultPasswordRequirements returns standard password requirements
// These are industry-standard requirements for secure passwords
func DefaultPasswordRequirements() PasswordRequirements {
	return PasswordRequirements{
		MinLength:        8,
		MaxLength:        128,
		RequireUppercase: true,
		RequireLowercase: true,
		RequireNumber:    true,
		RequireSpecial:   true,
	}
}

// ValidatePassword validates password strength according to requirements
// Returns error if password doesn't meet requirements
func ValidatePassword(password string, req PasswordRequirements) error {
	if password == "" {
		return ErrWeakPassword
	}

	// Check length
	if len(password) < req.MinLength {
		return ErrPasswordTooShort
	}
	if len(password) > req.MaxLength {
		return ErrPasswordTooLong
	}

	// Check character requirements
	hasUpper := false
	hasLower := false
	hasNumber := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	// Validate requirements
	if req.RequireUppercase && !hasUpper {
		return ErrWeakPassword
	}
	if req.RequireLowercase && !hasLower {
		return ErrWeakPassword
	}
	if req.RequireNumber && !hasNumber {
		return ErrWeakPassword
	}
	if req.RequireSpecial && !hasSpecial {
		return ErrWeakPassword
	}

	// Check for common weak passwords
	if isCommonPassword(password) {
		return ErrWeakPassword
	}

	return nil
}

// isCommonPassword checks if password is in a list of common weak passwords
// This is a basic check - in production, you might want a more comprehensive list
func isCommonPassword(password string) bool {
	commonPasswords := []string{
		"password", "password123", "12345678", "123456789",
		"qwerty", "abc123", "monkey", "1234567", "letmein",
		"trustno1", "dragon", "baseball", "iloveyou", "master",
		"sunshine", "ashley", "bailey", "passw0rd", "shadow",
		"123123", "654321", "superman", "qazwsx", "michael",
		"football", "welcome", "jesus", "ninja", "mustang",
		"password1", "admin", "1234", "root", "toor",
	}

	lowerPassword := strings.ToLower(password)
	for _, common := range commonPasswords {
		if lowerPassword == common {
			return true
		}
	}

	return false
}

// GetPasswordStrength returns a strength score (0-100) for a password
// This can be used to provide feedback to users
func GetPasswordStrength(password string) int {
	if len(password) == 0 {
		return 0
	}

	score := 0

	// Length score (max 40 points)
	if len(password) >= 8 {
		score += 20
	}
	if len(password) >= 12 {
		score += 10
	}
	if len(password) >= 16 {
		score += 10
	}

	// Character variety (max 40 points)
	hasUpper := false
	hasLower := false
	hasNumber := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if hasUpper {
		score += 10
	}
	if hasLower {
		score += 10
	}
	if hasNumber {
		score += 10
	}
	if hasSpecial {
		score += 10
	}

	// Complexity bonus (max 20 points)
	// Check for patterns and repetition
	hasPattern := false
	for i := 0; i < len(password)-2; i++ {
		if password[i] == password[i+1] && password[i+1] == password[i+2] {
			hasPattern = true
			break
		}
	}
	if !hasPattern {
		score += 10
	}

	// Check for sequential characters
	hasSequential := false
	for i := 0; i < len(password)-2; i++ {
		if password[i]+1 == password[i+1] && password[i+1]+1 == password[i+2] {
			hasSequential = true
			break
		}
	}
	if !hasSequential {
		score += 10
	}

	return score
}

var (
	ErrInvalidName     = errors.New("name contains invalid characters (only letters allowed, no spaces, digits, or special characters)")
	ErrNameTooShort    = errors.New("name must be at least 2 characters long")
	ErrNameTooLong     = errors.New("name must be no more than 50 characters long")
	ErrNameRequired    = errors.New("name is required")
	ErrSurnameRequired = errors.New("surname is required")
)

// ValidateName validates a person's name (first name, surname, patronymic)
// Rules:
// - Only letters (Cyrillic and Latin alphabets)
// - No spaces, digits, or special characters
// - Length: 2-50 characters
// - Optional (for patronymic)
func ValidateName(name string, required bool) error {
	if name == "" {
		if required {
			return ErrNameRequired
		}
		return nil // Optional field can be empty
	}

	// Trim whitespace
	name = strings.TrimSpace(name)

	// Check length
	if len(name) < 2 {
		return ErrNameTooShort
	}
	if len(name) > 50 {
		return ErrNameTooLong
	}

	// Check for spaces
	if strings.Contains(name, " ") {
		return ErrInvalidName
	}

	// Check for digits
	for _, char := range name {
		if unicode.IsDigit(char) {
			return ErrInvalidName
		}
	}

	// Check for special characters (allow only letters)
	// Allow Cyrillic (А-Я, а-я, Ё, ё) and Latin (A-Z, a-z) letters
	for _, char := range name {
		if !unicode.IsLetter(char) {
			return ErrInvalidName
		}
		// Additional check: ensure it's a valid letter (not punctuation/symbols)
		if !((char >= 'А' && char <= 'Я') || (char >= 'а' && char <= 'я') || char == 'Ё' || char == 'ё' ||
			(char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z')) {
			return ErrInvalidName
		}
	}

	return nil
}

// ValidatePersonName validates a person's name with specific error for surname
func ValidatePersonName(name string, required bool, isSurname bool) error {
	if name == "" {
		if required {
			if isSurname {
				return ErrSurnameRequired
			}
			return ErrNameRequired
		}
		return nil
	}
	return ValidateName(name, false) // Don't check required again, already checked above
}
