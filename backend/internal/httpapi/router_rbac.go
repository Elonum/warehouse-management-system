package httpapi

import (
	"net/http"
	"time"

	"warehouse-backend/internal/auth"
	"warehouse-backend/internal/httpapi/handlers"
	"warehouse-backend/internal/httpapi/middleware"
	"warehouse-backend/internal/repository"

	"github.com/go-chi/chi/v5"
)

type protectedHandlers struct {
	auth                        *handlers.AuthHandler
	stock                       *handlers.StockHandler
	stockMovement               *handlers.StockMovementHandler
	upload                      *handlers.UploadHandler
	productImageUpload          *handlers.ProductImageUploadHandler
	productImage                *handlers.ProductImageHandler
	product                     *handlers.ProductHandler
	warehouse                   *handlers.WarehouseHandler
	store                       *handlers.StoreHandler
	supplierOrder               *handlers.SupplierOrderHandler
	supplierOrderItem           *handlers.SupplierOrderItemHandler
	supplierOrderDocument       *handlers.SupplierOrderDocumentHandler
	mpShipment                  *handlers.MpShipmentHandler
	mpShipmentItem              *handlers.MpShipmentItemHandler
	wildberriesStocksList       *handlers.WildberriesStocksListHandler
	ozonStocksList              *handlers.OzonStocksListHandler
	orderStatus                 *handlers.OrderStatusHandler
	shipmentStatus              *handlers.ShipmentStatusHandler
	inventoryStatus             *handlers.InventoryStatusHandler
	inventory                   *handlers.InventoryHandler
	inventoryItem               *handlers.InventoryItemHandler
	productCost                 *handlers.ProductCostHandler
	stockSnapshot               *handlers.StockSnapshotHandler
	user                        *handlers.UserHandler
	role                        *handlers.RoleHandler
}

func mountProtectedRoutes(
	r chi.Router,
	jwtManager *auth.JWTManager,
	roleRepo *repository.RoleRepository,
	h protectedHandlers,
) {
	perm := func(perms ...auth.Permission) func(http.Handler) http.Handler {
		return middleware.RequirePermission(roleRepo, perms...)
	}
	adminOnly := perm(auth.PermAdmin)
	procurementMutate := perm(auth.PermProcurementWrite, auth.PermDeliveryWrite)

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(jwtManager))
		r.Use(middleware.LoadRoleName(roleRepo))

		r.Get("/auth/me", h.auth.GetMe)

		r.With(perm(auth.PermStockRead)).Get("/stock/current", h.stock.GetCurrentStock)
		r.With(perm(auth.PermStockMovementsRead)).Get("/stock/movements", h.stockMovement.List)

		r.Post("/upload", h.upload.Upload)
		r.With(perm(auth.PermProductsWrite)).Post("/products/images/upload", h.productImageUpload.UploadProductImage)

		r.Route("/products", func(r chi.Router) {
			r.With(perm(auth.PermProductsRead)).Get("/", h.product.List)
			r.With(perm(auth.PermProductsWrite)).Post("/", h.product.Create)
			r.With(perm(auth.PermProductsRead)).Get("/{id}", h.product.GetByID)
			r.With(perm(auth.PermProductsWrite)).Put("/{id}", h.product.Update)
			r.With(perm(auth.PermProductsWrite)).Delete("/{id}", h.product.Delete)
			r.With(perm(auth.PermProductsRead)).Get("/{productId}/images", h.productImage.GetByProductID)
			r.With(perm(auth.PermProductsWrite)).Delete("/{productId}/images/{imageId}", h.productImage.Delete)
			r.With(perm(auth.PermProductsWrite)).Put("/{productId}/images/{imageId}/order", h.productImage.UpdateDisplayOrder)
		})

		r.Route("/warehouses", func(r chi.Router) {
			r.With(perm(auth.PermWarehousesRead)).Get("/", h.warehouse.List)
			r.With(perm(auth.PermWarehousesWrite)).Post("/", h.warehouse.Create)
			r.With(perm(auth.PermWarehousesRead)).Get("/{id}", h.warehouse.GetByID)
			r.With(perm(auth.PermWarehousesWrite)).Put("/{id}", h.warehouse.Update)
			r.With(perm(auth.PermWarehousesWrite)).Delete("/{id}", h.warehouse.Delete)
		})

		r.Route("/stores", func(r chi.Router) {
			r.With(perm(auth.PermStoresRead)).Get("/", h.store.List)
			r.With(perm(auth.PermStoresWrite)).Post("/", h.store.Create)
			r.With(perm(auth.PermStoresRead)).Get("/{id}", h.store.GetByID)
			r.With(perm(auth.PermStoresWrite)).Put("/{id}", h.store.Update)
			r.With(perm(auth.PermStoresWrite)).Delete("/{id}", h.store.Delete)
		})

		r.Route("/supplier-orders", func(r chi.Router) {
			r.With(perm(auth.PermProcurementRead)).Get("/", h.supplierOrder.List)
			r.With(perm(auth.PermProcurementWrite)).Post("/", h.supplierOrder.Create)
			r.With(perm(auth.PermProcurementRead)).Get("/{id}", h.supplierOrder.GetByID)
			r.With(procurementMutate).Put("/{id}", h.supplierOrder.Update)
			r.With(perm(auth.PermProcurementWrite)).Delete("/{id}", h.supplierOrder.Delete)
			r.With(perm(auth.PermProcurementWrite)).Post("/{orderId}/suborders", h.supplierOrder.CreateSubOrder)

			r.Route("/{orderId}/items", func(r chi.Router) {
				r.With(perm(auth.PermProcurementRead)).Get("/", h.supplierOrderItem.GetByOrderID)
			})

			r.Route("/{orderId}/documents", func(r chi.Router) {
				r.With(perm(auth.PermProcurementRead)).Get("/", h.supplierOrderDocument.GetByOrderID)
			})
		})

		r.Route("/supplier-order-items", func(r chi.Router) {
			r.With(perm(auth.PermProcurementRead)).Get("/{id}", h.supplierOrderItem.GetByID)
			r.With(perm(auth.PermProcurementWrite)).Post("/", h.supplierOrderItem.Create)
			r.With(procurementMutate).Put("/{id}", h.supplierOrderItem.Update)
			r.With(perm(auth.PermProcurementWrite)).Delete("/{id}", h.supplierOrderItem.Delete)
		})

		r.Route("/mp-shipments", func(r chi.Router) {
			r.With(perm(auth.PermMarketplaceRead)).Get("/", h.mpShipment.List)
			r.With(perm(auth.PermMarketplaceWrite)).Post("/", h.mpShipment.Create)
			r.With(perm(auth.PermMarketplaceRead)).Get("/{id}", h.mpShipment.GetByID)
			r.With(perm(auth.PermMarketplaceWrite)).Put("/{id}", h.mpShipment.Update)
			r.With(perm(auth.PermMarketplaceWrite)).Delete("/{id}", h.mpShipment.Delete)

			r.Route("/{shipmentId}/items", func(r chi.Router) {
				r.With(perm(auth.PermMarketplaceRead)).Get("/", h.mpShipmentItem.GetByShipmentID)
			})
		})

		integrationRateLimiter := middleware.NewRateLimiter(6, time.Minute)
		r.With(middleware.RateLimitMiddleware(integrationRateLimiter)).Route("/integrations", func(r chi.Router) {
			r.With(perm(auth.PermIntegrationsRead)).Route("/wildberries", func(r chi.Router) {
				r.Post("/stocks/list", h.wildberriesStocksList.List)
			})
			r.With(perm(auth.PermIntegrationsRead)).Route("/ozon", func(r chi.Router) {
				r.Post("/stocks/list", h.ozonStocksList.List)
			})
		})

		r.Route("/mp-shipment-items", func(r chi.Router) {
			r.With(perm(auth.PermMarketplaceRead)).Get("/{id}", h.mpShipmentItem.GetByID)
			r.With(perm(auth.PermMarketplaceWrite)).Post("/", h.mpShipmentItem.Create)
			r.With(perm(auth.PermMarketplaceWrite)).Put("/{id}", h.mpShipmentItem.Update)
			r.With(perm(auth.PermMarketplaceWrite)).Delete("/{id}", h.mpShipmentItem.Delete)
		})

		r.Route("/order-statuses", func(r chi.Router) {
			r.With(perm(auth.PermReferenceRead)).Get("/", h.orderStatus.List)
			r.With(adminOnly).Post("/", h.orderStatus.Create)
			r.With(perm(auth.PermReferenceRead)).Get("/{id}", h.orderStatus.GetByID)
			r.With(adminOnly).Put("/{id}", h.orderStatus.Update)
			r.With(adminOnly).Delete("/{id}", h.orderStatus.Delete)
		})

		r.Route("/shipment-statuses", func(r chi.Router) {
			r.With(perm(auth.PermReferenceRead)).Get("/", h.shipmentStatus.List)
			r.With(adminOnly).Post("/", h.shipmentStatus.Create)
			r.With(perm(auth.PermReferenceRead)).Get("/{id}", h.shipmentStatus.GetByID)
			r.With(adminOnly).Put("/{id}", h.shipmentStatus.Update)
			r.With(adminOnly).Delete("/{id}", h.shipmentStatus.Delete)
		})

		r.Route("/supplier-order-documents", func(r chi.Router) {
			r.With(perm(auth.PermProcurementRead)).Get("/{id}", h.supplierOrderDocument.GetByID)
			r.With(perm(auth.PermProcurementWrite)).Post("/", h.supplierOrderDocument.Create)
			r.With(perm(auth.PermProcurementWrite)).Put("/{id}", h.supplierOrderDocument.Update)
			r.With(perm(auth.PermProcurementWrite)).Delete("/{id}", h.supplierOrderDocument.Delete)
		})

		r.Route("/inventory-statuses", func(r chi.Router) {
			r.With(perm(auth.PermReferenceRead)).Get("/", h.inventoryStatus.List)
			r.With(adminOnly).Post("/", h.inventoryStatus.Create)
			r.With(perm(auth.PermReferenceRead)).Get("/{id}", h.inventoryStatus.GetByID)
			r.With(adminOnly).Put("/{id}", h.inventoryStatus.Update)
			r.With(adminOnly).Delete("/{id}", h.inventoryStatus.Delete)
		})

		r.Route("/inventories", func(r chi.Router) {
			r.With(perm(auth.PermInventoryRead)).Get("/", h.inventory.List)
			r.With(perm(auth.PermInventoryWrite)).Post("/", h.inventory.Create)
			r.With(perm(auth.PermInventoryRead)).Get("/{id}", h.inventory.GetByID)
			r.With(perm(auth.PermInventoryWrite)).Put("/{id}", h.inventory.Update)
			r.With(perm(auth.PermInventoryWrite)).Delete("/{id}", h.inventory.Delete)

			r.Route("/{inventoryId}/items", func(r chi.Router) {
				r.With(perm(auth.PermInventoryRead)).Get("/", h.inventoryItem.GetByInventoryID)
			})
		})

		r.Route("/inventory-items", func(r chi.Router) {
			r.With(perm(auth.PermInventoryRead)).Get("/{id}", h.inventoryItem.GetByID)
			r.With(perm(auth.PermInventoryWrite)).Post("/", h.inventoryItem.Create)
			r.With(perm(auth.PermInventoryWrite)).Put("/{id}", h.inventoryItem.Update)
			r.With(perm(auth.PermInventoryWrite)).Delete("/{id}", h.inventoryItem.Delete)
		})

		r.Route("/product-costs", func(r chi.Router) {
			r.With(perm(auth.PermFinanceRead)).Get("/", h.productCost.List)
			r.With(perm(auth.PermFinanceRead)).Get("/missing", h.productCost.ListMissing)
			r.With(perm(auth.PermFinanceRead)).Get("/data-quality", h.productCost.GetDataQuality)
			r.With(perm(auth.PermFinanceWrite)).Post("/", h.productCost.Create)
			r.With(perm(auth.PermFinanceRead)).Get("/{id}", h.productCost.GetByID)
			r.With(perm(auth.PermFinanceWrite)).Put("/{id}", h.productCost.Update)
			r.With(perm(auth.PermFinanceWrite)).Delete("/{id}", h.productCost.Delete)
		})

		r.Route("/stock-snapshots", func(r chi.Router) {
			r.With(perm(auth.PermStockRead)).Get("/", h.stockSnapshot.List)
			r.With(perm(auth.PermStockSnapshotsWrite)).Post("/", h.stockSnapshot.Create)
			r.With(perm(auth.PermStockRead)).Get("/{id}", h.stockSnapshot.GetByID)
			r.With(perm(auth.PermStockSnapshotsWrite)).Put("/{id}", h.stockSnapshot.Update)
			r.With(perm(auth.PermStockSnapshotsWrite)).Delete("/{id}", h.stockSnapshot.Delete)
		})

		r.With(adminOnly).Route("/users", func(r chi.Router) {
			r.Get("/", h.user.List)
			r.Post("/", h.user.Create)
			r.Get("/{id}", h.user.GetByID)
			r.Put("/{id}", h.user.Update)
			r.Delete("/{id}", h.user.Delete)
		})

		r.With(adminOnly).Route("/roles", func(r chi.Router) {
			r.Get("/", h.role.List)
			r.Post("/", h.role.Create)
			r.Get("/{id}", h.role.GetByID)
			r.Put("/{id}", h.role.Update)
			r.Delete("/{id}", h.role.Delete)
		})
	})
}
