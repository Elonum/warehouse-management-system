import { ApiError } from '@/api';

function looksLikeNumericOverflow(message) {
  return (
    message?.includes('numeric field overflow') ||
    message?.includes('переполнение поля numeric') ||
    message?.includes('SQLSTATE 22003')
  );
}

export function mapShipmentApiError(t, err, fallbackKey) {
  const fallback = t(fallbackKey);

  if (!(err instanceof ApiError)) return fallback;

  // Generic completion guard from backend
  if (err.code === 'SHIPMENT_COMPLETED') {
    // callers pick the right UX string
    return err.message || fallback;
  }

  if (err.code === 'SHIPMENT_EXISTS') return t('shipments.errors.numberExists');
  if (err.code === 'SHIPMENT_STATUS_NOT_FOUND') return t('shipments.errors.statusNotFound');
  if (err.code === 'SHIPMENT_NOT_FOUND') return t('shipments.errors.notFound');
  if (err.code === 'MP_DEST_WAREHOUSE_INVALID') return t('shipments.errors.marketplaceWarehouseInvalid');
  if (err.code === 'MAIN_WAREHOUSE_INVALID') return t('shipments.errors.mainWarehouseInvalid');

  if (looksLikeNumericOverflow(err.message)) {
    return t('shipments.errors.amountTooLarge');
  }

  // Keep backend message only as a last resort; we prefer localized keys.
  return err.message || fallback;
}

export function mapShipmentItemApiError(t, err, fallbackKey) {
  const fallback = t(fallbackKey);

  if (!(err instanceof ApiError)) return fallback;

  if (err.code === 'SHIPMENT_COMPLETED') return t('shipmentDetails.errors.cannotEditCompleted');

  if (err.code === 'INVALID_QUANTITY') return t('shipmentDetails.errors.invalidQuantity');

  if (err.code === 'INVALID_REQUEST') {
    if (err.message?.includes('productId is required')) {
      return t('shipmentDetails.errors.productRequired');
    }
    if (
      err.message?.includes('sentQty must be non-negative') ||
      err.message?.includes('acceptedQty must be non-negative') ||
      err.message?.includes('logisticsForItem must be non-negative')
    ) {
      return t('shipmentDetails.errors.nonNegative');
    }
  }

  if (looksLikeNumericOverflow(err.message)) {
    return t('shipmentDetails.errors.amountTooLarge');
  }

  return err.message || fallback;
}

