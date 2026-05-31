package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
)

const defaultJWTSecret = "your-secret-key-change-in-production"

type Config struct {
	Port string
	Env  string // development, production

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	JWTSecret   string // Секретный ключ для JWT токенов
	BaseURL     string // Base URL for serving files (e.g., "http://localhost:8080")
	FrontendURL string // Frontend URL for password reset links (e.g., "http://localhost:5173")

	// Wildberries FBW Supplies API (category «Поставки» in seller token settings)
	WbSuppliesToken   string
	WbSuppliesBaseURL string

	// Wildberries Statistics API — остатки GET /api/v1/supplier/stocks (категория «Статистика»; для песочницы — тестовый контур и WB_STATISTICS_BASE_URL).
	WbStatisticsToken   string
	WbStatisticsBaseURL string

	// Ozon Seller API — Client-Id + Api-Key из кабинета продавца.
	OzonClientID string
	OzonAPIKey   string
	OzonBaseURL  string

	// HTTP hardening / proxy settings
	AllowedOrigins       []string
	TrustProxyHeaders    bool
	CSPAllowUnsafeInline bool
	CSPAllowUnsafeEval   bool
}

func Load() Config {
	// Пытаемся загрузить .env из корня проекта, затем из internal/config
	if err := godotenv.Load(".env"); err != nil {
		if err := godotenv.Load("internal/config/.env"); err != nil {
			log.Debug().Msg(".env file not found, using system env")
		}
	}

	port := getEnv("PORT", "8080")
	cfg := Config{
		Port: port,
		Env:  getEnv("ENV", "development"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "warehouse"),

		JWTSecret:   getEnv("JWT_SECRET", defaultJWTSecret),
		BaseURL:     getEnv("BASE_URL", "http://localhost:"+port),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"), // Default to Vite dev server

		WbSuppliesToken:   getEnv("WB_SUPPLIES_TOKEN", ""),
		WbSuppliesBaseURL: getEnv("WB_SUPPLIES_BASE_URL", "https://supplies-api.wildberries.ru"),

		WbStatisticsToken:   getEnv("WB_STATISTICS_TOKEN", ""),
		WbStatisticsBaseURL: getEnv("WB_STATISTICS_BASE_URL", "https://statistics-api.wildberries.ru"),

		OzonClientID: getEnv("OZON_CLIENT_ID", ""),
		OzonAPIKey:   getEnv("OZON_API_KEY", ""),
		OzonBaseURL:  getEnv("OZON_BASE_URL", "https://api-seller.ozon.ru"),

		AllowedOrigins:       getCSVEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000"),
		TrustProxyHeaders:    getEnv("TRUST_PROXY_HEADERS", "false") == "true",
		CSPAllowUnsafeInline: getEnv("CSP_ALLOW_UNSAFE_INLINE", "true") == "true",
		CSPAllowUnsafeEval:   getEnv("CSP_ALLOW_UNSAFE_EVAL", "false") == "true",
	}

	return cfg
}

// Validate rejects unsafe production configuration.
func (c Config) Validate() error {
	if c.Env != "production" {
		return nil
	}
	if strings.TrimSpace(c.JWTSecret) == "" || c.JWTSecret == defaultJWTSecret {
		return fmt.Errorf("JWT_SECRET must be set to a strong unique value when ENV=production")
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getCSVEnv(key, defaultValue string) []string {
	raw := getEnv(key, defaultValue)
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		v := strings.TrimSpace(part)
		if v != "" {
			result = append(result, v)
		}
	}
	return result
}
