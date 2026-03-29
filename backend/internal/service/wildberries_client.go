package service

import (
	"strings"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/integration/wildberries"
)

func newWbSuppliesClient(cfg config.Config) (*wildberries.Client, error) {
	if strings.TrimSpace(cfg.WbSuppliesToken) == "" {
		return nil, ErrWbSuppliesTokenNotConfigured
	}
	return wildberries.NewClient(cfg.WbSuppliesBaseURL, cfg.WbSuppliesToken), nil
}
