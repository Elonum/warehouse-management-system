package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
)

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

		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		BaseURL:     getEnv("BASE_URL", "http://localhost:"+port),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"), // Default to Vite dev server

		WbSuppliesToken:   getEnv("WB_SUPPLIES_TOKEN", ""),
		WbSuppliesBaseURL: getEnv("WB_SUPPLIES_BASE_URL", "https://supplies-api.wildberries.ru"),

		AllowedOrigins:       getCSVEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000"),
		TrustProxyHeaders:    getEnv("TRUST_PROXY_HEADERS", "false") == "true",
		CSPAllowUnsafeInline: getEnv("CSP_ALLOW_UNSAFE_INLINE", "true") == "true",
		CSPAllowUnsafeEval:   getEnv("CSP_ALLOW_UNSAFE_EVAL", "false") == "true",
	}

	return cfg
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
