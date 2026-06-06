package upstream

import (
	"time"

	"warehouse-backend/internal/config"
)

var (
	Wildberries *Limiter
	Ozon        *Limiter
	Stocks      *StocksCache
	Retry       RetryPolicy
)

// Init configures process-wide upstream guards from application config.
func Init(cfg config.Config) {
	Wildberries = NewLimiter(
		"wildberries",
		cfg.WbUpstreamBurst,
		cfg.WbUpstreamRefillInterval,
		cfg.WbUpstreamMinInterval,
	)
	Ozon = NewLimiter(
		"ozon",
		cfg.OzonUpstreamBurst,
		cfg.OzonUpstreamRefillInterval,
		cfg.OzonUpstreamMinInterval,
	)
	Stocks = NewStocksCache(cfg.IntegrationStocksCacheTTL)
	Retry = RetryPolicy{
		MaxRetries: cfg.IntegrationUpstreamMaxRetries,
		BaseDelay:  cfg.IntegrationUpstreamRetryBase,
		MaxDelay:   cfg.IntegrationUpstreamRetryMax,
	}
}

// DefaultInit applies safe production defaults when tests skip config wiring.
func DefaultInit() {
	Init(config.Config{
		WbUpstreamBurst:              10,
		WbUpstreamRefillInterval:     time.Minute,
		WbUpstreamMinInterval:        6 * time.Second,
		OzonUpstreamBurst:            5,
		OzonUpstreamRefillInterval:   2 * time.Second,
		OzonUpstreamMinInterval:      350 * time.Millisecond,
		IntegrationStocksCacheTTL:    90 * time.Second,
		IntegrationUpstreamMaxRetries: 3,
		IntegrationUpstreamRetryBase:  time.Second,
		IntegrationUpstreamRetryMax:  30 * time.Second,
	})
}
