package service

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"warehouse-backend/internal/config"
	"warehouse-backend/internal/dto"
	"warehouse-backend/internal/integration/wildberries"
	"warehouse-backend/internal/repository"
)

var ErrWbSuppliesTokenNotConfigured = errors.New("WB_SUPPLIES_TOKEN is not configured")

type WildberriesImportService struct {
	cfg          config.Config
	shipmentRepo *repository.MpShipmentRepository
	itemRepo     *repository.MpShipmentItemRepository
	productRepo  *repository.ProductRepository
	itemLineSvc  *MpShipmentItemService
}

func NewWildberriesImportService(
	cfg config.Config,
	shipmentRepo *repository.MpShipmentRepository,
	itemRepo *repository.MpShipmentItemRepository,
	productRepo *repository.ProductRepository,
	itemLineSvc *MpShipmentItemService,
) *WildberriesImportService {
	return &WildberriesImportService{
		cfg:          cfg,
		shipmentRepo: shipmentRepo,
		itemRepo:     itemRepo,
		productRepo:  productRepo,
		itemLineSvc:  itemLineSvc,
	}
}

func (s *WildberriesImportService) wbClient() (*wildberries.Client, error) {
	return newWbSuppliesClient(s.cfg)
}

func normalizeMatchBy(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "barcode":
		return "barcode"
	case "vendor_code", "vendorcode", "article":
		return "vendor_code"
	default:
		return ""
	}
}

func goodMatchesProduct(g wildberries.SupplyGood, p *repository.Product, matchBy string) bool {
	switch matchBy {
	case "barcode":
		b := strings.TrimSpace(g.Barcode)
		return b != "" && strings.TrimSpace(p.Barcode) == b
	case "vendor_code":
		v := strings.TrimSpace(g.VendorCode)
		return v != "" && strings.TrimSpace(p.Article) == v
	default:
		return false
	}
}

type wbImportPlan struct {
	summary   dto.WildberriesSupplySummary
	lines     []dto.WildberriesImportLine
	unmatched []dto.WildberriesUnmatchedGood
	warnings  []string
}

func (s *WildberriesImportService) buildPlan(ctx context.Context, shipmentID uuid.UUID, supplyID int64, matchBy string, isPreorderID bool) (*wbImportPlan, error) {
	wb, err := s.wbClient()
	if err != nil {
		return nil, err
	}

	detail, err := wb.GetSupply(ctx, supplyID, isPreorderID)
	if err != nil {
		return nil, err
	}

	goods, err := wb.FetchAllSupplyGoods(ctx, supplyID, isPreorderID)
	if err != nil {
		return nil, err
	}

	items, err := s.itemRepo.GetByShipmentID(ctx, shipmentID)
	if err != nil {
		return nil, err
	}

	products := make(map[uuid.UUID]*repository.Product)
	for _, it := range items {
		if _, ok := products[it.ProductID]; ok {
			continue
		}
		p, perr := s.productRepo.GetByID(ctx, it.ProductID)
		if perr != nil {
			return nil, perr
		}
		products[it.ProductID] = p
	}

	wbTotals := make(map[uuid.UUID]int)
	wbSeen := make(map[uuid.UUID]bool)
	var unmatched []dto.WildberriesUnmatchedGood

	for _, g := range goods {
		var matchedPID uuid.UUID
		found := false
		for _, p := range products {
			if goodMatchesProduct(g, p, matchBy) {
				matchedPID = p.ProductID
				found = true
				break
			}
		}
		if !found {
			unmatched = append(unmatched, dto.WildberriesUnmatchedGood{
				Barcode:          g.Barcode,
				VendorCode:       g.VendorCode,
				NmID:             g.NmID,
				TechSize:         g.TechSize,
				AcceptedQuantity: g.AcceptedQuantity,
			})
			continue
		}
		wbSeen[matchedPID] = true
		if g.AcceptedQuantity > 0 {
			wbTotals[matchedPID] += g.AcceptedQuantity
		}
	}

	remaining := make(map[uuid.UUID]int)
	for pid, qty := range wbTotals {
		remaining[pid] = qty
	}

	lines := make([]dto.WildberriesImportLine, 0, len(items))
	var warnings []string

	for _, it := range items {
		p := products[it.ProductID]
		take := remaining[it.ProductID]
		if take > it.SentQty {
			take = it.SentQty
		}
		if take < 0 {
			take = 0
		}
		remaining[it.ProductID] -= take

		lines = append(lines, dto.WildberriesImportLine{
			ShipmentItemID:    it.ShipmentItemID.String(),
			ProductID:         it.ProductID.String(),
			Article:           p.Article,
			Barcode:           p.Barcode,
			SentQty:           it.SentQty,
			CurrentAccepted:   it.AcceptedQty,
			ImportAcceptedQty: take,
			Matched:           wbSeen[it.ProductID],
		})
	}

	for pid, left := range remaining {
		if left > 0 {
			p := products[pid]
			warnings = append(warnings,
				"WB accepted "+strconv.Itoa(left)+" extra units for article "+p.Article+"; surplus not allocated to shipment lines (cap is sent qty).")
		}
	}

	plan := &wbImportPlan{
		summary: dto.WildberriesSupplySummary{
			StatusID:         detail.StatusID,
			WarehouseName:    detail.WarehouseName,
			AcceptedQuantity: detail.AcceptedQuantity,
			SupplyDate:       detail.SupplyDate,
			FactDate:         detail.FactDate,
		},
		lines:     lines,
		unmatched: unmatched,
		warnings:  warnings,
	}
	return plan, nil
}

func (s *WildberriesImportService) Preview(ctx context.Context, shipmentID uuid.UUID, req dto.WildberriesImportPreviewRequest) (*dto.WildberriesImportPreviewResponse, error) {
	matchBy := normalizeMatchBy(req.MatchBy)
	if matchBy == "" {
		return nil, errors.New("matchBy must be barcode or vendor_code")
	}
	if req.SupplyID <= 0 {
		return nil, errors.New("supplyId must be positive")
	}

	if _, err := s.shipmentRepo.GetByID(ctx, shipmentID); err != nil {
		return nil, err
	}

	plan, err := s.buildPlan(ctx, shipmentID, req.SupplyID, matchBy, req.IsPreorderID)
	if err != nil {
		return nil, err
	}

	return &dto.WildberriesImportPreviewResponse{
		Supply:         plan.summary,
		Lines:          plan.lines,
		UnmatchedGoods: plan.unmatched,
		Warnings:       plan.warnings,
	}, nil
}

func (s *WildberriesImportService) Apply(ctx context.Context, shipmentID uuid.UUID, req dto.WildberriesImportApplyRequest) (*dto.WildberriesImportApplyResponse, error) {
	matchBy := normalizeMatchBy(req.MatchBy)
	if matchBy == "" {
		return nil, errors.New("matchBy must be barcode or vendor_code")
	}
	if req.SupplyID <= 0 {
		return nil, errors.New("supplyId must be positive")
	}

	if _, err := s.shipmentRepo.GetByID(ctx, shipmentID); err != nil {
		return nil, err
	}

	plan, err := s.buildPlan(ctx, shipmentID, req.SupplyID, matchBy, req.IsPreorderID)
	if err != nil {
		return nil, err
	}

	updated := 0
	for _, line := range plan.lines {
		itemID, err := uuid.Parse(line.ShipmentItemID)
		if err != nil {
			continue
		}
		if line.ImportAcceptedQty == line.CurrentAccepted {
			continue
		}
		if _, err := s.itemLineSvc.SetAcceptedQty(ctx, itemID, line.ImportAcceptedQty); err != nil {
			return nil, err
		}
		updated++
	}

	return &dto.WildberriesImportApplyResponse{UpdatedItems: updated}, nil
}
