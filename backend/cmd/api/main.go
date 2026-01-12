package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/db"
	"warehouse-backend/internal/httpapi"
	"warehouse-backend/internal/logger"

	"github.com/rs/zerolog/log"
)

func main() {
	cfg := config.Load()

	logger.Init(cfg.Env)
	log.Info().Str("env", cfg.Env).Msg("Starting warehouse management system")

	pg, err := db.New(db.Config{
		Host:     cfg.DBHost,
		Port:     cfg.DBPort,
		User:     cfg.DBUser,
		Password: cfg.DBPassword,
		DBName:   cfg.DBName,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("DB connection failed")
	}
	defer pg.Pool.Close()

	migrationsPath := "./migrations"
	if _, err := os.Stat(migrationsPath); err == nil {
		if err := db.RunMigrations(db.Config{
			Host:     cfg.DBHost,
			Port:     cfg.DBPort,
			User:     cfg.DBUser,
			Password: cfg.DBPassword,
			DBName:   cfg.DBName,
		}, migrationsPath); err != nil {
			log.Warn().Err(err).Msg("Failed to run migrations (this is OK if DB schema is already up to date)")
		} else {
			log.Info().Msg("Database migrations completed successfully")
		}
	}

	router := httpapi.NewRouter(pg, cfg)

	addr := ":" + cfg.Port
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	go func() {
		log.Info().Str("addr", addr).Msg("API server started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited gracefully")
}
