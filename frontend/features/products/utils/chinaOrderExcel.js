import * as XLSX from 'xlsx';

function safeText(value) {
  if (value == null) return '';
  return String(value).trim();
}

function safeNumber(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function buildChinaOrderWorkbook({
  t,
  orderMeta,
  rows,
}) {
  const supplier = safeText(orderMeta?.supplier);
  const orderNumber = safeText(orderMeta?.orderNumber);
  const orderDate = safeText(orderMeta?.orderDate);
  const notes = safeText(orderMeta?.notes);

  const aoa = [];

  aoa.push([t('products.orderExport.excel.title')]);
  aoa.push([]);
  aoa.push([t('products.orderExport.excel.supplier'), supplier]);
  aoa.push([t('products.orderExport.excel.orderNumber'), orderNumber]);
  aoa.push([t('products.orderExport.excel.orderDate'), orderDate]);
  if (notes) aoa.push([t('products.orderExport.excel.notes'), notes]);
  aoa.push([]);

  aoa.push([
    t('products.orderExport.excel.columns.article'),
    t('products.orderExport.excel.columns.barcode'),
    t('products.orderExport.excel.columns.qty'),
    t('products.orderExport.excel.columns.unitWeight'),
    t('products.orderExport.excel.columns.purchasePriceYuan'),
    t('products.orderExport.excel.columns.amountYuan'),
  ]);

  rows.forEach((r) => {
    const qty = safeNumber(r.qty) ?? 0;
    const purchasePrice = safeNumber(r.purchasePrice) ?? null;
    const amount = purchasePrice != null ? qty * purchasePrice : null;

    aoa.push([
      safeText(r.article),
      safeText(r.barcode),
      qty,
      safeNumber(r.unitWeight) ?? null,
      purchasePrice,
      amount,
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths (rough, for readability)
  sheet['!cols'] = [
    { wch: 18 }, // article
    { wch: 18 }, // barcode
    { wch: 8 },  // qty
    { wch: 12 }, // weight
    { wch: 14 }, // purchase price
    { wch: 14 }, // amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Order');
  return wb;
}

export function downloadChinaOrderExcel({ t, orderMeta, rows }) {
  const wb = buildChinaOrderWorkbook({ t, orderMeta, rows });
  const baseName = safeText(orderMeta?.orderNumber) || 'china-order';
  const fileName = `${baseName}.xlsx`;
  XLSX.writeFile(wb, fileName, { compression: true });
}

