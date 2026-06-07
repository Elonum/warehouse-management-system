package repository

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestIsForeignKeyViolation_pgconnError(t *testing.T) {
	err := &pgconn.PgError{Code: "23503"}
	if !IsForeignKeyViolation(err) {
		t.Fatal("expected FK violation for pgconn error 23503")
	}
}

func TestIsForeignKeyViolation_wrappedPgconnError(t *testing.T) {
	inner := &pgconn.PgError{Code: "23503"}
	err := errors.Join(errors.New("delete failed"), inner)
	if !IsForeignKeyViolation(err) {
		t.Fatal("expected FK violation for wrapped pgconn error")
	}
}

func TestIsForeignKeyViolation_russianMessage(t *testing.T) {
	err := errors.New(`ОШИБКА: UPDATE или DELETE в таблице "products" нарушает ограничение внешнего ключа (SQLSTATE 23503)`)
	if !IsForeignKeyViolation(err) {
		t.Fatal("expected FK violation for SQLSTATE in message")
	}
}

func TestIsForeignKeyViolation_otherError(t *testing.T) {
	if IsForeignKeyViolation(errors.New("connection refused")) {
		t.Fatal("expected false for unrelated error")
	}
}

func TestMapDeleteForeignKey(t *testing.T) {
	inUse := errors.New("in use")
	mapped := MapDeleteForeignKey(&pgconn.PgError{Code: "23503"}, inUse)
	if !errors.Is(mapped, inUse) {
		t.Fatalf("expected in use error, got %v", mapped)
	}
}
