package httpapi

import (
	"context"
	"time"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/config"
	"warehouse-backend/internal/db"
	"warehouse-backend/internal/httpapi/handlers"
	"warehouse-backend/internal/httpapi/middleware"
	"warehouse-backend/internal/integration/upstream"
	"warehouse-backend/internal/repository"
	"warehouse-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

func NewRouter(pg *db.Postgres, cfg config.Config) *chi.Mux {
	r := chi.NewRouter()

	// Security headers should be applied first to all responses
	r.Use(middleware.SecurityHeaders(cfg))
	r.Use(middleware.RequestID)
	r.Use(middleware.CORS(cfg))
	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)
	middleware.ConfigureRateLimitProxyTrust(cfg.TrustProxyHeaders)
	upstream.Init(cfg)

	jwtManager := auth.NewJWTManager(cfg.JWTSecret)

	stockRepo := repository.NewStockRepository(pg.Pool)
	stockMovementRepo := repository.NewStockMovementRepository(pg.Pool)
	userRepo := repository.NewUserRepository(pg.Pool)
	roleRepo := repository.NewRoleRepository(pg.Pool)
	productRepo := repository.NewProductRepository(pg.Pool)
	productImageRepo := repository.NewProductImageRepository(pg.Pool)
	warehouseRepo := repository.NewWarehouseRepository(pg.Pool)
	storeRepo := repository.NewStoreRepository(pg.Pool)
	supplierOrderRepo := repository.NewSupplierOrderRepository(pg.Pool)
	supplierOrderItemRepo := repository.NewSupplierOrderItemRepository(pg.Pool)
	mpShipmentRepo := repository.NewMpShipmentRepository(pg.Pool)
	mpShipmentItemRepo := repository.NewMpShipmentItemRepository(pg.Pool)
	orderStatusRepo := repository.NewOrderStatusRepository(pg.Pool)
	shipmentStatusRepo := repository.NewShipmentStatusRepository(pg.Pool)
	supplierOrderDocumentRepo := repository.NewSupplierOrderDocumentRepository(pg.Pool)
	inventoryStatusRepo := repository.NewInventoryStatusRepository(pg.Pool)
	inventoryRepo := repository.NewInventoryRepository(pg.Pool)
	inventoryItemRepo := repository.NewInventoryItemRepository(pg.Pool)
	productCostRepo := repository.NewProductCostRepository(pg.Pool)
	stockSnapshotRepo := repository.NewStockSnapshotRepository(pg.Pool)

	stockService := service.NewStockService(stockRepo)
	stockMovementService := service.NewStockMovementService(stockMovementRepo)

	// Password reset and email services
	passwordResetRepo := repository.NewPasswordResetRepository(pg.Pool)
	emailService := service.NewEmailService(cfg.FrontendURL, cfg.Env)
	authService := service.NewAuthService(userRepo, roleRepo, passwordResetRepo, emailService, jwtManager)
	productService := service.NewProductService(productRepo, productImageRepo, productCostRepo, cfg.BaseURL)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		removed, err := productService.CleanupOrphanProductImageFiles(ctx)
		if err != nil {
			log.Warn().Err(err).Msg("Failed to cleanup orphan product image files")
			return
		}
		if removed > 0 {
			log.Info().Int("removedFiles", removed).Msg("Orphan product image files cleaned up")
		}
	}()
	warehouseService := service.NewWarehouseService(warehouseRepo)
	storeService := service.NewStoreService(storeRepo)
	supplierOrderService := service.NewSupplierOrderService(supplierOrderRepo, orderStatusRepo, supplierOrderItemRepo, stockRepo)
	supplierOrderItemService := service.NewSupplierOrderItemService(supplierOrderItemRepo, supplierOrderRepo, orderStatusRepo, productRepo, warehouseRepo)
	supplierOrderDocumentService := service.NewSupplierOrderDocumentService(supplierOrderDocumentRepo, supplierOrderRepo)
	mpShipmentService := service.NewMpShipmentService(
		mpShipmentRepo,
		storeRepo,
		warehouseRepo,
		shipmentStatusRepo,
		mpShipmentItemRepo,
		stockRepo,
	)
	mpShipmentItemService := service.NewMpShipmentItemService(mpShipmentItemRepo, mpShipmentRepo, productRepo, shipmentStatusRepo)
	wildberriesStockService := service.NewWildberriesStockService(cfg)
	ozonStockService := service.NewOzonStockService(cfg)
	orderStatusService := service.NewOrderStatusService(orderStatusRepo)
	shipmentStatusService := service.NewShipmentStatusService(shipmentStatusRepo)
	inventoryStatusService := service.NewInventoryStatusService(inventoryStatusRepo)
	inventoryService := service.NewInventoryService(inventoryRepo, inventoryStatusRepo, inventoryItemRepo, stockRepo)
	inventoryItemService := service.NewInventoryItemService(inventoryItemRepo, inventoryRepo, inventoryStatusRepo, productRepo, warehouseRepo, stockRepo)
	productCostService := service.NewProductCostService(productCostRepo, productRepo)
	stockSnapshotService := service.NewStockSnapshotService(stockSnapshotRepo, warehouseRepo, productRepo)
	userService := service.NewUserService(userRepo, roleRepo)
	roleService := service.NewRoleService(roleRepo)

	stockHandler := handlers.NewStockHandler(stockService)
	stockMovementHandler := handlers.NewStockMovementHandler(stockMovementService)
	healthHandler := handlers.NewHealthHandler(pg)
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	roleHandler := handlers.NewRoleHandler(roleService)
	productHandler := handlers.NewProductHandler(productService)
	warehouseHandler := handlers.NewWarehouseHandler(warehouseService)
	storeHandler := handlers.NewStoreHandler(storeService)
	supplierOrderHandler := handlers.NewSupplierOrderHandler(supplierOrderService, supplierOrderItemService)
	supplierOrderItemHandler := handlers.NewSupplierOrderItemHandler(supplierOrderItemService)
	mpShipmentHandler := handlers.NewMpShipmentHandler(mpShipmentService)
	mpShipmentItemHandler := handlers.NewMpShipmentItemHandler(mpShipmentItemService)
	wildberriesStocksListHandler := handlers.NewWildberriesStocksListHandler(wildberriesStockService)
	ozonStocksListHandler := handlers.NewOzonStocksListHandler(ozonStockService)
	orderStatusHandler := handlers.NewOrderStatusHandler(orderStatusService)
	shipmentStatusHandler := handlers.NewShipmentStatusHandler(shipmentStatusService)
	supplierOrderDocumentHandler := handlers.NewSupplierOrderDocumentHandler(supplierOrderDocumentService)
	inventoryStatusHandler := handlers.NewInventoryStatusHandler(inventoryStatusService)
	inventoryHandler := handlers.NewInventoryHandler(inventoryService)
	inventoryItemHandler := handlers.NewInventoryItemHandler(inventoryItemService)
	productCostHandler := handlers.NewProductCostHandler(productCostService)
	stockSnapshotHandler := handlers.NewStockSnapshotHandler(stockSnapshotService)
	uploadHandler := handlers.NewUploadHandler(jwtManager)

	// Rate limiters for auth endpoints
	loginLimiter, registerLimiter, passwordResetLimiter := buildAuthRateLimiters()

	productImageUploadHandler := handlers.NewProductImageUploadHandler()
	productImageHandler := handlers.NewProductImageHandler(productImageRepo)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthHandler.DBHealth)

		// Auth endpoints with strict rate limiting
		r.With(middleware.RateLimitMiddleware(loginLimiter)).Post("/auth/login", authHandler.Login)
		r.With(middleware.RateLimitMiddleware(registerLimiter)).Post("/auth/register", authHandler.Register)
		// Password reset endpoints (with rate limiting to prevent abuse)
		r.With(middleware.RateLimitMiddleware(passwordResetLimiter)).Post("/auth/password-reset/request", authHandler.RequestPasswordReset)
		r.With(middleware.RateLimitMiddleware(passwordResetLimiter)).Post("/auth/password-reset/confirm", authHandler.ResetPassword)

		// Product images are public; documents require auth (enforced in ServeFile).
		r.Get("/files", uploadHandler.ServeFile)

		mountProtectedRoutes(r, jwtManager, roleRepo, protectedHandlers{
			auth:                  authHandler,
			stock:                 stockHandler,
			stockMovement:         stockMovementHandler,
			upload:                uploadHandler,
			productImageUpload:    productImageUploadHandler,
			productImage:          productImageHandler,
			product:               productHandler,
			warehouse:             warehouseHandler,
			store:                 storeHandler,
			supplierOrder:         supplierOrderHandler,
			supplierOrderItem:     supplierOrderItemHandler,
			supplierOrderDocument: supplierOrderDocumentHandler,
			mpShipment:            mpShipmentHandler,
			mpShipmentItem:        mpShipmentItemHandler,
			wildberriesStocksList: wildberriesStocksListHandler,
			ozonStocksList:        ozonStocksListHandler,
			orderStatus:           orderStatusHandler,
			shipmentStatus:        shipmentStatusHandler,
			inventoryStatus:       inventoryStatusHandler,
			inventory:             inventoryHandler,
			inventoryItem:         inventoryItemHandler,
			productCost:           productCostHandler,
			stockSnapshot:         stockSnapshotHandler,
			user:                  userHandler,
			role:                  roleHandler,
		})
	})

	return r
}

func buildAuthRateLimiters() (login, register, passwordReset *middleware.RateLimiter) {
	// Login: 5 attempts per 15 minutes (prevents brute-force)
	login = middleware.NewRateLimiter(5, 15*time.Minute)
	// Register: 3 attempts per hour (prevents spam account creation)
	register = middleware.NewRateLimiter(3, 1*time.Hour)
	// Password reset: 5 requests per hour (prevents abuse)
	passwordReset = middleware.NewRateLimiter(5, 1*time.Hour)
	return
}

