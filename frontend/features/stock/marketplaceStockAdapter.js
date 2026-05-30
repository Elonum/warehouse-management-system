import { api } from '@/api';

function normalizeRow(source, row, idx) {
  const productId =
    row?.productId ??
    row?.nmId ??
    row?.sku ??
    row?.offerId ??
    `${source}-item-${idx}`;

  return {
    productId: String(productId),
    productName:
      row?.article ||
      row?.supplierArticle ||
      row?.name ||
      row?.offerName ||
      `#${productId}`,
    productBarcode: row?.barcode || row?.barcodes?.[0] || null,
    warehouseName: row?.warehouseName || row?.warehouse || row?.clusterName || null,
    currentQuantity:
      Number(
        row?.quantity ??
          row?.quantityFull ??
          row?.available_stock_count ??
          row?.valid_stock_count ??
          row?.availableQuantity ??
          row?.present ??
          row?.freeToSellAmount ??
          0,
      ) || 0,
    reorderPoint: null,
  };
}

export async function fetchMarketplaceStock({ source }) {
  if (source !== 'wildberries' && source !== 'ozon') {
    return { items: [], total: 0 };
  }

  const integrationApi =
    source === 'wildberries'
      ? api.integrations?.wildberries?.listStocks
      : api.integrations?.ozon?.listStocks;

  if (typeof integrationApi !== 'function') {
    return { items: [], total: 0 };
  }

  const response = await integrationApi({});
  const rows = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(response)
      ? response
      : [];
  return {
    items: rows.map((row, idx) => normalizeRow(source, row, idx)),
    total: Number(response?.total ?? response?.meta?.total ?? rows.length) || 0,
  };
}
