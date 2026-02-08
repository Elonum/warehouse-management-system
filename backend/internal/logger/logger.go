package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Init инициализирует глобальный логгер с настройками для production/development
func Init(env string) {
	// В development используем красивый вывод с цветами
	if env == "development" || env == "dev" {
		log.Logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stderr,
			TimeFormat: time.RFC3339,
		})
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else {
		// В production используем JSON формат
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Устанавливаем временную зону UTC для логов
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
}
