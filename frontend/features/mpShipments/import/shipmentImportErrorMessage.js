import { ApiError } from '@/api';

/**
 * Maps API error codes to user-facing copy (no server/token jargon).
 */
export function shipmentImportErrorMessage(err, t) {
  if (!err) return '';
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'WB_SUPPLIES_TOKEN_MISSING':
        return t('shipments.import.errors.serviceUnavailable');
      case 'WB_PREVIEW_FAILED':
      case 'WB_APPLY_FAILED':
      case 'WB_SUPPLIES_LIST_FAILED':
        return t('shipments.import.errors.wbUnavailable');
      case 'SHIPMENT_COMPLETED':
        return t('shipments.errors.cannotEditCompleted');
      case 'INVALID_QUANTITY':
      case 'INVALID_SUPPLY_LIST_PARAMS':
      case 'INVALID_REQUEST':
        return t('shipments.import.errors.invalidData');
      case 'SHIPMENT_NOT_FOUND':
        return t('shipments.import.errors.shipmentNotFound');
      case 'NETWORK_ERROR':
        return t('shipments.import.errors.network');
      default:
        if (err.status >= 500) return t('shipments.import.errors.wbUnavailable');
        if (err.status === 0) return t('shipments.import.errors.network');
        return t('shipments.import.errors.generic');
    }
  }
  return t('shipments.import.errors.generic');
}

/**
 * Localizes known backend warning lines from import preview.
 */
export function formatWbPreviewWarningLine(warning, t) {
  const m = warning.match(
    /^WB accepted (\d+) extra units for article (.+);\s*surplus not allocated/i,
  );
  if (m) {
    return t('shipments.import.wbWarningSurplus', { extra: m[1], article: m[2] });
  }
  return warning;
}
