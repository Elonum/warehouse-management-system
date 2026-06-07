package handlers

import (
	"errors"
	"net/http"

	"warehouse-backend/internal/repository"

	"github.com/rs/zerolog/log"
)

func writeDeleteInUse(
	w http.ResponseWriter,
	err error,
	inUse error,
	code string,
	message string,
	logField string,
	logValue string,
) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, inUse) || repository.IsForeignKeyViolation(err) {
		log.Warn().Str(logField, logValue).Msg("Delete blocked: entity is in use")
		writeError(w, http.StatusConflict, code, message)
		return true
	}
	return false
}
