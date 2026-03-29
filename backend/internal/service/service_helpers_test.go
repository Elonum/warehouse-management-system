package service

import (
	"testing"
	"time"

	"warehouse-backend/internal/repository"
)

func TestMinProcessingDelay(t *testing.T) {
	min := 200 * time.Millisecond
	if got := minProcessingDelay(250*time.Millisecond, min); got != 0 {
		t.Fatalf("expected zero delay when elapsed >= min, got %v", got)
	}
	if got := minProcessingDelay(50*time.Millisecond, min); got != 150*time.Millisecond {
		t.Fatalf("expected 150ms delay, got %v", got)
	}
}

func TestValidateSupplierOrderDates(t *testing.T) {
	purchase := time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)
	planned := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	actual := time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC)

	if err := validateSupplierOrderDates(&purchase, &planned, &actual); err != nil {
		t.Fatalf("expected valid date range, got err=%v", err)
	}

	badPlanned := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	if err := validateSupplierOrderDates(&purchase, &badPlanned, &actual); err != repository.ErrInvalidDateRange {
		t.Fatalf("expected ErrInvalidDateRange for planned<purchase, got %v", err)
	}

	badActual := time.Date(2026, 1, 12, 0, 0, 0, 0, time.UTC)
	if err := validateSupplierOrderDates(&purchase, &planned, &badActual); err != repository.ErrInvalidDateRange {
		t.Fatalf("expected ErrInvalidDateRange for actual<planned, got %v", err)
	}
}

func TestStatusHelpers(t *testing.T) {
	if !isFinalShipmentStatus(&repository.ShipmentStatus{IsFinal: true}) {
		t.Fatalf("expected final shipment status to be true")
	}
	if isFinalShipmentStatus(nil) {
		t.Fatalf("expected nil shipment status to be false")
	}
	if !shouldBlockInventoryMutation(&repository.InventoryStatus{IsFinal: true}, nil) {
		t.Fatalf("expected inventory mutation to be blocked for final status")
	}
	if shouldBlockInventoryMutation(&repository.InventoryStatus{IsFinal: false}, nil) {
		t.Fatalf("expected non-final inventory status to be allowed")
	}
}
