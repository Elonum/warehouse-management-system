package service

import (
	"testing"
	"time"

	"warehouse-backend/internal/repository"
)

func TestValidatePeriodRange(t *testing.T) {
	start := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC)

	if err := validatePeriodRange(start, &end); err != repository.ErrInvalidDateRange {
		t.Fatalf("expected ErrInvalidDateRange, got %v", err)
	}

	if err := validatePeriodRange(start, nil); err != nil {
		t.Fatalf("open period should be valid, got %v", err)
	}

	okEnd := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	if err := validatePeriodRange(start, &okEnd); err != nil {
		t.Fatalf("valid closed period, got %v", err)
	}
}

func TestValidatePeriodRangeSameDay(t *testing.T) {
	day := time.Date(2025, 3, 15, 12, 30, 0, 0, time.UTC)
	if err := validatePeriodRange(day, &day); err != nil {
		t.Fatalf("same calendar day should be valid, got %v", err)
	}
}
