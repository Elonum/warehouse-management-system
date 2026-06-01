import { ApiError } from '@/api';

const CODE_TO_KEY = {
  COST_EXISTS: 'productCosts.errors.costExists',
  PERIOD_OVERLAP: 'productCosts.errors.periodOverlap',
  INVALID_DATE_RANGE: 'productCosts.errors.invalidDateRange',
  PRODUCT_NOT_FOUND: 'productCosts.errors.productNotFound',
  INVALID_COST: 'productCosts.errors.invalidCost',
};

export function messageForProductCostError(err, t, fallbackKey) {
  if (err instanceof ApiError) {
    const mapped = CODE_TO_KEY[err.code];
    if (mapped) {
      return t(mapped);
    }
    if (err.message) {
      return err.message;
    }
  }
  return t(fallbackKey);
}
