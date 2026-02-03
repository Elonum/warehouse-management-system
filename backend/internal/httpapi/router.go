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

	r.Use(middleware.CORS)
	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)

	jwtManager := auth.NewJWTManager(cfg.JWTSecret)

	stockRepo := repository.NewStockRepository(pg.Pool)
	userRepo := repository.NewUserRepository(pg.Pool)
	roleRepo := repository.NewRoleRepository(pg.Pool)
	productRepo := repository.NewProductRepository(pg.Pool)
	productImageRepo := repository.NewProductImageRepository(pg.Pool)
	warehouseRepo := repository.NewWarehouseRepository(pg.Pool)
	warehouseTypeRepo := repository.NewWarehouseTypeRepository(pg.Pool)
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
	authService := service.NewAuthService(userRepo, roleRepo, jwtManager)
	productService := service.NewProductService(productRepo, productImageRepo, cfg.BaseURL)
	warehouseService := service.NewWarehouseService(warehouseRepo, warehouseTypeRepo)
	warehouseTypeService := service.NewWarehouseTypeService(warehouseTypeRepo)
	storeService := service.NewStoreService(storeRepo)
	supplierOrderService := service.NewSupplierOrderService(supplierOrderRepo, orderStatusRepo)
	supplierOrderItemService := service.NewSupplierOrderItemService(supplierOrderItemRepo, supplierOrderRepo, productRepo, warehouseRepo)
	supplierOrderDocumentService := service.NewSupplierOrderDocumentService(supplierOrderDocumentRepo, supplierOrderRepo)
	mpShipmentService := service.NewMpShipmentService(mpShipmentRepo, storeRepo, warehouseRepo, shipmentStatusRepo)
	mpShipmentItemService := service.NewMpShipmentItemService(mpShipmentItemRepo, mpShipmentRepo, productRepo, warehouseRepo)
	orderStatusService := service.NewOrderStatusService(orderStatusRepo)
	shipmentStatusService := service.NewShipmentStatusService(shipmentStatusRepo)
	inventoryStatusService := service.NewInventoryStatusService(inventoryStatusRepo)
	inventoryService := service.NewInventoryService(inventoryRepo, inventoryStatusRepo, inventoryItemRepo)
	inventoryItemService := service.NewInventoryItemService(inventoryItemRepo, inventoryRepo, productRepo, warehouseRepo, stockRepo)
	productCostService := service.NewProductCostService(productCostRepo, productRepo)
	stockSnapshotService := service.NewStockSnapshotService(stockSnapshotRepo, warehouseRepo, productRepo)
	userService := service.NewUserService(userRepo, roleRepo)
	roleService := service.NewRoleService(roleRepo)

	stockHandler := handlers.NewStockHandler(stockService)
	healthHandler := handlers.NewHealthHandler(pg)
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	roleHandler := handlers.NewRoleHandler(roleService)
	productHandler := handlers.NewProductHandler(productService)
	warehouseHandler := handlers.NewWarehouseHandler(warehouseService)
	warehouseTypeHandler := handlers.NewWarehouseTypeHandler(warehouseTypeService)
	storeHandler := handlers.NewStoreHandler(storeService)
	supplierOrderHandler := handlers.NewSupplierOrderHandler(supplierOrderService)
	supplierOrderItemHandler := handlers.NewSupplierOrderItemHandler(supplierOrderItemService)
	mpShipmentHandler := handlers.NewMpShipmentHandler(mpShipmentService)
	mpShipmentItemHandler := handlers.NewMpShipmentItemHandler(mpShipmentItemService)
	orderStatusHandler := handlers.NewOrderStatusHandler(orderStatusService)
	shipmentStatusHandler := handlers.NewShipmentStatusHandler(shipmentStatusService)
	supplierOrderDocumentHandler := handlers.NewSupplierOrderDocumentHandler(supplierOrderDocumentService)
	inventoryStatusHandler := handlers.NewInventoryStatusHandler(inventoryStatusService)
	inventoryHandler := handlers.NewInventoryHandler(inventoryService)
	inventoryItemHandler := handlers.NewInventoryItemHandler(inventoryItemService)
	productCostHandler := handlers.NewProductCostHandler(productCostService)
	stockSnapshotHandler := handlers.NewStockSnapshotHandler(stockSnapshotService)
	uploadHandler := handlers.NewUploadHandler()

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", healthHandler.DBHealth)

		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/register", authHandler.Register)

		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(jwtManager))

			r.Get("/auth/me", authHandler.GetMe)
			r.Get("/stock/current", stockHandler.GetCurrentStock)
			
			// File upload endpoints
			r.Post("/upload", uploadHandler.Upload)
			r.Get("/files", uploadHandler.ServeFile)

			productImageUploadHandler := handlers.NewProductImageUploadHandler()
			r.Post("/products/images/upload", productImageUploadHandler.UploadProductImage)

			productImageHandler := handlers.NewProductImageHandler(productImageRepo)

			r.Route("/products", func(r chi.Router) {
				r.Get("/", productHandler.List)
				r.Post("/", productHandler.Create)
				r.Get("/{id}", productHandler.GetByID)
				r.Put("/{id}", productHandler.Update)
				r.Delete("/{id}", productHandler.Delete)

				// Product images endpoints
				r.Get("/{productId}/images", productImageHandler.GetByProductID)
				r.Delete("/{productId}/images/{imageId}", productImageHandler.Delete)
				r.Put("/{productId}/images/{imageId}/order", productImageHandler.UpdateDisplayOrder)
				r.Put("/{productId}/images/{imageId}/main", productImageHandler.SetAsMain)
			})

			r.Route("/warehouses", func(r chi.Router) {
				r.Get("/", warehouseHandler.List)
				r.Post("/", warehouseHandler.Create)
				r.Get("/{id}", warehouseHandler.GetByID)
				r.Put("/{id}", warehouseHandler.Update)
				r.Delete("/{id}", warehouseHandler.Delete)
			})

			r.Route("/warehouse-types", func(r chi.Router) {
				r.Get("/", warehouseTypeHandler.List)
				r.Post("/", warehouseTypeHandler.Create)
				r.Get("/{id}", warehouseTypeHandler.GetByID)
				r.Put("/{id}", warehouseTypeHandler.Update)
				r.Delete("/{id}", warehouseTypeHandler.Delete)
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

				r.Route("/{orderId}/documents", func(r chi.Router) {
					r.Get("/", supplierOrderDocumentHandler.GetByOrderID)
				})
			})

			r.Route("/supplier-order-items", func(r chi.Router) {
				r.Get("/{id}", supplierOrderItemHandler.GetByID)
				r.Post("/", supplierOrderItemHandler.Create)
				r.Put("/{id}", supplierOrderItemHandler.Update)
				r.Delete("/{id}", supplierOrderItemHandler.Delete)
			})

			r.Route("/mp-shipments", func(r chi.Router) {
				r.Get("/", mpShipmentHandler.List)
				r.Post("/", mpShipmentHandler.Create)
				r.Get("/{id}", mpShipmentHandler.GetByID)
				r.Put("/{id}", mpShipmentHandler.Update)
				r.Delete("/{id}", mpShipmentHandler.Delete)

				r.Route("/{shipmentId}/items", func(r chi.Router) {
					r.Get("/", mpShipmentItemHandler.GetByShipmentID)
				})
			})

			r.Route("/mp-shipment-items", func(r chi.Router) {
				r.Get("/{id}", mpShipmentItemHandler.GetByID)
				r.Post("/", mpShipmentItemHandler.Create)
				r.Put("/{id}", mpShipmentItemHandler.Update)
				r.Delete("/{id}", mpShipmentItemHandler.Delete)
			})

			r.Route("/order-statuses", func(r chi.Router) {
				r.Get("/", orderStatusHandler.List)
				r.Post("/", orderStatusHandler.Create)
				r.Get("/{id}", orderStatusHandler.GetByID)
				r.Put("/{id}", orderStatusHandler.Update)
				r.Delete("/{id}", orderStatusHandler.Delete)
			})

			r.Route("/shipment-statuses", func(r chi.Router) {
				r.Get("/", shipmentStatusHandler.List)
				r.Post("/", shipmentStatusHandler.Create)
				r.Get("/{id}", shipmentStatusHandler.GetByID)
				r.Put("/{id}", shipmentStatusHandler.Update)
				r.Delete("/{id}", shipmentStatusHandler.Delete)
			})

			r.Route("/supplier-order-documents", func(r chi.Router) {
				r.Get("/{id}", supplierOrderDocumentHandler.GetByID)
				r.Post("/", supplierOrderDocumentHandler.Create)
				r.Put("/{id}", supplierOrderDocumentHandler.Update)
				r.Delete("/{id}", supplierOrderDocumentHandler.Delete)
			})

			r.Route("/inventory-statuses", func(r chi.Router) {
				r.Get("/", inventoryStatusHandler.List)
				r.Post("/", inventoryStatusHandler.Create)
				r.Get("/{id}", inventoryStatusHandler.GetByID)
				r.Put("/{id}", inventoryStatusHandler.Update)
				r.Delete("/{id}", inventoryStatusHandler.Delete)
			})

			r.Route("/inventories", func(r chi.Router) {
				r.Get("/", inventoryHandler.List)
				r.Post("/", inventoryHandler.Create)
				r.Get("/{id}", inventoryHandler.GetByID)
				r.Put("/{id}", inventoryHandler.Update)
				r.Delete("/{id}", inventoryHandler.Delete)

				r.Route("/{inventoryId}/items", func(r chi.Router) {
					r.Get("/", inventoryItemHandler.GetByInventoryID)
				})
			})

			r.Route("/inventory-items", func(r chi.Router) {
				r.Get("/{id}", inventoryItemHandler.GetByID)
				r.Post("/", inventoryItemHandler.Create)
				r.Put("/{id}", inventoryItemHandler.Update)
				r.Delete("/{id}", inventoryItemHandler.Delete)
			})

			r.Route("/product-costs", func(r chi.Router) {
				r.Get("/", productCostHandler.List)
				r.Post("/", productCostHandler.Create)
				r.Get("/{id}", productCostHandler.GetByID)
				r.Put("/{id}", productCostHandler.Update)
				r.Delete("/{id}", productCostHandler.Delete)
			})

			r.Route("/stock-snapshots", func(r chi.Router) {
				r.Get("/", stockSnapshotHandler.List)
				r.Post("/", stockSnapshotHandler.Create)
				r.Get("/{id}", stockSnapshotHandler.GetByID)
				r.Put("/{id}", stockSnapshotHandler.Update)
				r.Delete("/{id}", stockSnapshotHandler.Delete)
			})

			r.Route("/users", func(r chi.Router) {
				r.Get("/", userHandler.List)
				r.Post("/", userHandler.Create)
				r.Get("/{id}", userHandler.GetByID)
				r.Put("/{id}", userHandler.Update)
				r.Delete("/{id}", userHandler.Delete)
			})

			r.Route("/roles", func(r chi.Router) {
				r.Get("/", roleHandler.List)
				r.Post("/", roleHandler.Create)
				r.Get("/{id}", roleHandler.GetByID)
				r.Put("/{id}", roleHandler.Update)
				r.Delete("/{id}", roleHandler.Delete)
			})
		})
	})

	return r
}
