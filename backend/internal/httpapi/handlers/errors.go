package handlers

import (
	"encoding/json"
	"net/http"

	"warehouse-backend/internal/dto"
)

// writeError writes a standardized error response
// This function ensures consistent error format across all handlers
// and prevents information leakage by using generic error messages
func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	response := dto.APIResponse[any]{
		Error: &dto.Error{
			Code:    code,
			Message: message,
		},
	}

	json.NewEncoder(w).Encode(response)
}

// writeSecurityError writes an error response for security-related issues
// Uses generic messages to prevent information disclosure
func writeSecurityError(w http.ResponseWriter, message string) {
	writeError(w, http.StatusForbidden, "SECURITY_ERROR", message)
}

// writeValidationError writes an error response for validation failures
func writeValidationError(w http.ResponseWriter, code, message string) {
	writeError(w, http.StatusBadRequest, code, message)
}

