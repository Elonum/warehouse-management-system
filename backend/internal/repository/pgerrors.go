package repository

import (
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// IsForeignKeyViolation reports whether err is a PostgreSQL FK constraint violation (SQLSTATE 23503).
func IsForeignKeyViolation(err error) bool {
	if err == nil {
		return false
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return true
	}

	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "23503") ||
		strings.Contains(msg, "foreign key") ||
		strings.Contains(msg, "нарушает ограничение внешнего ключа")
}

// MapDeleteForeignKey maps FK violations on DELETE to a domain-level "in use" error.
func MapDeleteForeignKey(err error, inUse error) error {
	if err == nil {
		return nil
	}
	if IsForeignKeyViolation(err) {
		return inUse
	}
	return err
}
