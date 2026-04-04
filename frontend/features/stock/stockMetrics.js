/**
 * Единые расчёты для страницы остатков и дашборда (наши склады и нормализованные строки МП).
 */

export function summarizeStockRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const withStock = list.filter((r) => (Number(r.currentQuantity) || 0) > 0);
  const productKeys = new Set(
    withStock.map((r) => String(r.productId ?? '')).filter((k) => k !== ''),
  );
  return {
    uniqueProductsWithStock: productKeys.size,
    positionsWithStock: withStock.length,
    totalUnits: list.reduce((s, r) => s + (Number(r.currentQuantity) || 0), 0),
  };
}

export function sumStockQuantities(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.reduce((s, r) => s + (Number(r.currentQuantity) || 0), 0);
}
