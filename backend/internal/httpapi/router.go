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

	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)

	jwtManager := auth.NewJWTManager(cfg.JWTSecret)

	stockRepo := repository.NewStockRepository(pg.Pool)
	userRepo := repository.NewUserRepository(pg.Pool)
	roleRepo := repository.NewRoleRepository(pg.Pool)
	productRepo := repository.NewProductRepository(pg.Pool)

	stockService := service.NewStockService(stockRepo)
	authService := service.NewAuthService(userRepo, roleRepo, jwtManager)
	productService := service.NewProductService(productRepo)

	stockHandler := handlers.NewStockHandler(stockService)
	healthHandler := handlers.NewHealthHandler(pg)
	authHandler := handlers.NewAuthHandler(authService)
	productHandler := handlers.NewProductHandler(productService)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthHandler.DBHealth)

		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/register", authHandler.Register)

		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(jwtManager))

			r.Get("/auth/me", authHandler.GetMe)
			r.Get("/stock/current", stockHandler.GetCurrentStock)

			r.Route("/products", func(r chi.Router) {
				r.Get("/", productHandler.List)
				r.Post("/", productHandler.Create)
				r.Get("/{id}", productHandler.GetByID)
				r.Put("/{id}", productHandler.Update)
				r.Delete("/{id}", productHandler.Delete)
			})
		})
	})

	return r
}
