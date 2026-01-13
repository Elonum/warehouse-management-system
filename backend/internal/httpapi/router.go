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
	warehouseRepo := repository.NewWarehouseRepository(pg.Pool)
	storeRepo := repository.NewStoreRepository(pg.Pool)
	supplierOrderRepo := repository.NewSupplierOrderRepository(pg.Pool)
	supplierOrderItemRepo := repository.NewSupplierOrderItemRepository(pg.Pool)

	stockService := service.NewStockService(stockRepo)
	authService := service.NewAuthService(userRepo, roleRepo, jwtManager)
	productService := service.NewProductService(productRepo)
	warehouseService := service.NewWarehouseService(warehouseRepo)
	storeService := service.NewStoreService(storeRepo)
	supplierOrderService := service.NewSupplierOrderService(supplierOrderRepo)
	supplierOrderItemService := service.NewSupplierOrderItemService(supplierOrderItemRepo)

	stockHandler := handlers.NewStockHandler(stockService)
	healthHandler := handlers.NewHealthHandler(pg)
	authHandler := handlers.NewAuthHandler(authService)
	productHandler := handlers.NewProductHandler(productService)
	warehouseHandler := handlers.NewWarehouseHandler(warehouseService)
	storeHandler := handlers.NewStoreHandler(storeService)
	supplierOrderHandler := handlers.NewSupplierOrderHandler(supplierOrderService)
	supplierOrderItemHandler := handlers.NewSupplierOrderItemHandler(supplierOrderItemService)

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

			r.Route("/warehouses", func(r chi.Router) {
				r.Get("/", warehouseHandler.List)
				r.Post("/", warehouseHandler.Create)
				r.Get("/{id}", warehouseHandler.GetByID)
				r.Put("/{id}", warehouseHandler.Update)
				r.Delete("/{id}", warehouseHandler.Delete)
			})

			r.Route("/stores", func(r chi.Router) {
				r.Get("/", storeHandler.List)
				r.Post("/", storeHandler.Create)
				r.Get("/{id}", storeHandler.GetByID)
				r.Put("/{id}", storeHandler.Update)
				r.Delete("/{id}", storeHandler.Delete)
			})

			r.Route("/supplier-orders", func(r chi.Router) {
				r.Get("/", supplierOrderHandler.List)
				r.Post("/", supplierOrderHandler.Create)
				r.Get("/{id}", supplierOrderHandler.GetByID)
				r.Put("/{id}", supplierOrderHandler.Update)
				r.Delete("/{id}", supplierOrderHandler.Delete)

				r.Route("/{orderId}/items", func(r chi.Router) {
					r.Get("/", supplierOrderItemHandler.GetByOrderID)
				})
			})

			r.Route("/supplier-order-items", func(r chi.Router) {
				r.Get("/{id}", supplierOrderItemHandler.GetByID)
				r.Post("/", supplierOrderItemHandler.Create)
				r.Put("/{id}", supplierOrderItemHandler.Update)
				r.Delete("/{id}", supplierOrderItemHandler.Delete)
			})
		})
	})

	return r
}
