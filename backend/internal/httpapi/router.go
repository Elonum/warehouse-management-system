package httpapi

import (
	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/config"
	"warehouse-backend/internal/db"
	"warehouse-backend/internal/httpapi/handlers"
	"warehouse-backend/internal/httpapi/middleware"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
)

func NewRouter(pg *db.Postgres, cfg config.Config) *chi.Mux {
	r := chi.NewRouter()

	// global middleware
	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)

	// Инициализируем JWT менеджер для авторизации
	jwtManager := auth.NewJWTManager(cfg.JWTSecret)

	// repositories
	stockRepo := repository.NewStockRepository(pg.Pool)
	userRepo := repository.NewUserRepository(pg.Pool)

	// services
	stockService := service.NewStockService(stockRepo)
	authService := service.NewAuthService(userRepo, jwtManager)

	// handlers
	stockHandler := handlers.NewStockHandler(stockService)
	healthHandler := handlers.NewHealthHandler(pg)
	authHandler := handlers.NewAuthHandler(authService)

	r.Route("/api/v1", func(r chi.Router) {
		// Public endpoints (не требуют авторизации)
		r.Get("/health", healthHandler.DBHealth)

		// Auth endpoints
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/register", authHandler.Register)

		// Protected endpoints (требуют авторизации)
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(jwtManager))

			// Stock endpoints
			r.Get("/stock/current", stockHandler.GetCurrentStock)
		})
	})

	return r
}
