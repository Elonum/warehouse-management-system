/** Backend movement_type values from vw_stock_movements */
export const STOCK_MOVEMENT_TYPES = [
  'SUPPLIER_RECEIPT',
  'MP_SHIPMENT_OUT',
  'MP_SHIPMENT_IN',
  'INVENTORY_ADJUSTMENT',
];

export function movementDocumentPath(movementType, documentId) {
  if (!documentId) return null;
  switch (movementType) {
    case 'SUPPLIER_RECEIPT':
      return `/supplier-orders/details?id=${encodeURIComponent(documentId)}`;
    case 'MP_SHIPMENT_OUT':
    case 'MP_SHIPMENT_IN':
      return `/shipments/details?id=${encodeURIComponent(documentId)}`;
    case 'INVENTORY_ADJUSTMENT':
      return `/inventory-adjustments/details?id=${encodeURIComponent(documentId)}`;
    default:
      return null;
  }
}

export function movementBadgeVariant(movementType) {
  switch (movementType) {
    case 'SUPPLIER_RECEIPT':
    case 'MP_SHIPMENT_IN':
      return 'incoming';
    case 'MP_SHIPMENT_OUT':
      return 'outgoing';
    case 'INVENTORY_ADJUSTMENT':
      return 'adjustment';
    default:
      return 'draft';
  }
}
