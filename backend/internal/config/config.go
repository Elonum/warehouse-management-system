package config

import (
	"os"

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

	JWTSecret string // Секретный ключ для JWT токенов
	BaseURL   string // Base URL for serving files (e.g., "http://localhost:8080")
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

		JWTSecret: getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		BaseURL:   getEnv("BASE_URL", "http://localhost:"+port),
	}

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
