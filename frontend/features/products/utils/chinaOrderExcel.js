import ExcelJS from 'exceljs';

const MAX_PHOTO_SLOTS = 24;

const NO_COL_PX = 60;
const FACTORY_COL_PX = 120;
const SKU_COL_PX = 170;
const WEIGHT_COL_PX = 100;
const IMAGE_DISPLAY_PX = 154;
const IMAGE_COL_PADDING_PX = 28;
const IMAGE_ROW_PADDING_PT = 12;
const MIN_DATA_ROW_PT = 18;
const HEADER_ROW_LAYOUT_PX = 45;
const FONT_SIZE_PT = 12;

function safeText(value) {
  if (value == null) return '';
  return String(value).trim();
}

function safeNumber(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clampText(value, maxLen) {
  const s = safeText(value);
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function buildFileName(raw) {
  const base = clampText(raw, 120) || 'china-order';
  return base.replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 120);
}

const EN = {
  totalsLabel: 'Totals:',
  columns: {
    no: '№',
    factoryId: 'Factory ID',
    skuid: 'SKUID',
    photo: (n) => `Photo ${n}`,
    productLink: 'Product link',
    packagingComment: 'Comment on packaging',
    qty: 'Quantity',
    unitWeightGrams: 'Product weight (g)',
    totalWeightKg: 'Total weight (kg)',
    priceYuan: 'Price in yuan',
    totalCostYuan: 'Total cost',
    readyTime: 'Ready time',
  },
};

function pixelsToExcelWidthChars(px) {
  const w = Math.ceil((Number(px) - 5) / 7);
  return Math.max(1, Math.min(w, 255));
}

function inferImageExtension(url, contentType = '') {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('png')) return 'png';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpeg';
  const lower = String(url || '').toLowerCase();
  if (lower.includes('.png')) return 'png';
  if (lower.includes('.gif')) return 'gif';
  if (lower.includes('.webp')) return 'webp';
  if (lower.includes('.bmp')) return 'bmp';
  return 'jpeg';
}

function excelColumnWidthToPixels(widthChars) {
  const w = Number(widthChars);
  if (!Number.isFinite(w) || w <= 0) return 100;
  return Math.round(w * 7 + 5);
}

function rowHeightPointsToLayoutPx(points) {
  const pt = Number(points);
  if (!Number.isFinite(pt) || pt <= 0) return 20;
  return pt / 0.75;
}

function layoutPxToRowPoints(px) {
  const n = Number(px);
  if (!Number.isFinite(n) || n <= 0) return 20;
  return n * 0.75;
}

function centerFraction(innerPx, outerPx) {
  if (outerPx <= 0) return 0;
  const excess = outerPx - innerPx;
  if (excess <= 0) return 0;
  return (excess / 2) / outerPx;
}

function maxPhotoUrlCount(rows) {
  let max = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const urls = rows[i]?.photoUrls;
    const n = Array.isArray(urls) ? urls.length : 0;
    if (n > max) max = n;
  }
  return Math.min(max, MAX_PHOTO_SLOTS);
}

function scanOptionalTextColumns(rows) {
  let hasFactoryId = false;
  let hasProductLink = false;
  let hasPackaging = false;
  let hasReadyTime = false;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (safeText(r?.factoryId)) hasFactoryId = true;
    if (safeText(r?.productLink)) hasProductLink = true;
    if (safeText(r?.packagingComment)) hasPackaging = true;
    if (safeText(r?.readyTime)) hasReadyTime = true;
  }
  return { hasFactoryId, hasProductLink, hasPackaging, hasReadyTime };
}

function buildSheetPlan(rows, photoSlots) {
  const opt = scanOptionalTextColumns(rows);
  const col = {};
  const widths = [];
  const wrapCols = new Set();

  let c = 1;

  col.no = c;
  widths.push({ width: pixelsToExcelWidthChars(NO_COL_PX) });
  c += 1;

  if (opt.hasFactoryId) {
    col.factoryId = c;
    widths.push({ width: pixelsToExcelWidthChars(FACTORY_COL_PX) });
    c += 1;
  }

  col.skuid = c;
  widths.push({ width: pixelsToExcelWidthChars(SKU_COL_PX) });
  c += 1;

  const hasPhotos = photoSlots > 0;
  const photoFirst = hasPhotos ? c : null;
  const photoLast = hasPhotos ? c + photoSlots - 1 : null;
  const imageColW = pixelsToExcelWidthChars(IMAGE_DISPLAY_PX + IMAGE_COL_PADDING_PX);
  for (let p = 0; p < photoSlots; p += 1) {
    widths.push({ width: imageColW });
  }
  c += photoSlots;

  if (opt.hasProductLink) {
    col.productLink = c;
    widths.push({ width: 36 });
    wrapCols.add(c);
    c += 1;
  }

  if (opt.hasPackaging) {
    col.packaging = c;
    widths.push({ width: 22 });
    wrapCols.add(c);
    c += 1;
  }

  col.qty = c;
  widths.push({ width: 10 });
  c += 1;

  col.unitWeightG = c;
  widths.push({ width: pixelsToExcelWidthChars(WEIGHT_COL_PX) });
  c += 1;

  col.totalWeightKg = c;
  widths.push({ width: pixelsToExcelWidthChars(WEIGHT_COL_PX) });
  c += 1;

  col.priceYuan = c;
  widths.push({ width: 12 });
  c += 1;

  col.totalCostYuan = c;
  widths.push({ width: 14 });
  c += 1;

  if (opt.hasReadyTime) {
    col.readyTime = c;
    widths.push({ width: 14 });
    wrapCols.add(c);
    c += 1;
  }

  const totalCols = c - 1;

  let totalsLabelCol = col.no;
  if (opt.hasPackaging) totalsLabelCol = col.packaging;
  else if (opt.hasProductLink) totalsLabelCol = col.productLink;
  else if (opt.hasFactoryId) totalsLabelCol = col.factoryId;

  return {
    visibility: opt,
    col,
    totalCols,
    photoSlots,
    photoFirst,
    photoLast,
    widths,
    wrapCols,
    totalsLabelCol,
  };
}

function buildHeader(plan) {
  const { visibility: opt, photoSlots } = plan;
  const parts = [EN.columns.no];
  if (opt.hasFactoryId) parts.push(EN.columns.factoryId);
  parts.push(EN.columns.skuid);
  for (let i = 0; i < photoSlots; i += 1) parts.push(EN.columns.photo(i + 1));
  if (opt.hasProductLink) parts.push(EN.columns.productLink);
  if (opt.hasPackaging) parts.push(EN.columns.packagingComment);
  parts.push(
    EN.columns.qty,
    EN.columns.unitWeightGrams,
    EN.columns.totalWeightKg,
    EN.columns.priceYuan,
    EN.columns.totalCostYuan,
  );
  if (opt.hasReadyTime) parts.push(EN.columns.readyTime);
  return parts;
}

function cellRef(row, colIndex) {
  let letters = '';
  let n = colIndex;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row}`;
}

async function convertBlobToPng(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas context unavailable');
        ctx.drawImage(image, 0, 0);
        const pngBlob = await new Promise((resolveBlob) => canvas.toBlob(resolveBlob, 'image/png'));
        if (!pngBlob) throw new Error('failed to convert image to png');
        resolve({ buffer: await pngBlob.arrayBuffer(), extension: 'png' });
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image decode failed'));
    };
    image.src = objectUrl;
  });
}

async function fetchImageBinary(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = String(res.headers.get('content-type') || '').toLowerCase();
    const extension = inferImageExtension(url, contentType);
    const blob = await res.blob();

    if (extension === 'webp' || extension === 'bmp' || contentType.includes('image/webp') || contentType.includes('image/bmp')) {
      try {
        return await convertBlobToPng(blob);
      } catch {
        return null;
      }
    }

    return { buffer: await blob.arrayBuffer(), extension };
  } catch {
    return null;
  }
}

export async function buildChinaOrderWorkbook({ rows }) {
  const photoSlots = maxPhotoUrlCount(rows);
  const plan = buildSheetPlan(rows, photoSlots);
  const {
    col,
    totalCols,
    photoFirst,
    photoLast,
    widths,
    wrapCols,
    totalsLabelCol,
    visibility: opt,
  } = plan;

  const thumbW = IMAGE_DISPLAY_PX;
  const thumbH = IMAGE_DISPLAY_PX;
  const targetRowPt = Math.max(MIN_DATA_ROW_PT, thumbH * 0.75 + IMAGE_ROW_PADDING_PT);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Order', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activeCell: 'A2' }],
  });

  sheet.addRow(buildHeader(plan));

  rows.forEach((r, idx) => {
    const excelRow = idx + 2;
    const rowNumber = idx + 1;

    const cells = [];
    cells.push(rowNumber);
    if (opt.hasFactoryId) cells.push(safeText(r.factoryId));
    cells.push(safeText(r.article));
    for (let i = 0; i < photoSlots; i += 1) cells.push('');
    if (opt.hasProductLink) cells.push(safeText(r.productLink));
    if (opt.hasPackaging) cells.push(safeText(r.packagingComment));

    const qty = safeNumber(r.qty) ?? 0;
    const unitWeightG = safeNumber(r.unitWeight) ?? null;
    const priceY = safeNumber(r.purchasePrice) ?? null;
    cells.push(qty, unitWeightG, null, priceY, null);
    if (opt.hasReadyTime) cells.push(safeText(r.readyTime));

    const row = sheet.addRow(cells);

    const cQty = cellRef(excelRow, col.qty);
    const cW = cellRef(excelRow, col.unitWeightG);
    const cP = cellRef(excelRow, col.priceYuan);

    row.getCell(col.totalWeightKg).value = {
      formula: `IF(AND(${cQty}>0,${cW}>0),${cQty}*${cW}/1000,"")`,
    };
    row.getCell(col.totalCostYuan).value = {
      formula: `IF(AND(${cQty}>0,${cP}>0),${cQty}*${cP},"")`,
    };
  });

  let totalsRowIndex = null;
  if (rows.length > 0) {
    const firstDataRow = 2;
    const lastDataRow = rows.length + 1;
    totalsRowIndex = lastDataRow + 1;

    const row = sheet.addRow([]);
    row.getCell(totalsLabelCol).value = EN.totalsLabel;
    row.getCell(col.qty).value = {
      formula: `SUM(${cellRef(firstDataRow, col.qty)}:${cellRef(lastDataRow, col.qty)})`,
    };
    row.getCell(col.totalWeightKg).value = {
      formula: `SUM(${cellRef(firstDataRow, col.totalWeightKg)}:${cellRef(lastDataRow, col.totalWeightKg)})`,
    };
    row.getCell(col.totalCostYuan).value = {
      formula: `SUM(${cellRef(firstDataRow, col.totalCostYuan)}:${cellRef(lastDataRow, col.totalCostYuan)})`,
    };
  }

  sheet.columns = widths;

  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  const totalRows = sheet.rowCount;
  for (let r = 1; r <= totalRows; r += 1) {
    for (let c = 1; c <= totalCols; c += 1) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = thinBorder;
      cell.font = { ...(cell.font || {}), size: FONT_SIZE_PT };
    }
  }

  const fills = {
    header: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD7E3F4' } },
    photo: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
    qty: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E8FF' } },
    weight: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD7EEDC' } },
    price: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6E2B8' } },
    total: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6D9FA' } },
    totalsRow: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } },
  };

  const center = { vertical: 'middle', horizontal: 'center' };
  const centerWrap = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const headerRow = sheet.getRow(1);
  headerRow.font = { size: FONT_SIZE_PT, bold: true, color: { argb: 'FF2F3A4A' } };
  headerRow.alignment = centerWrap;
  headerRow.height = layoutPxToRowPoints(HEADER_ROW_LAYOUT_PX);
  for (let c = 1; c <= totalCols; c += 1) {
    headerRow.getCell(c).fill = fills.header;
  }

  const lastDataRow = rows.length > 0 ? rows.length + 1 : 1;
  for (let r = 2; r <= lastDataRow; r += 1) {
    for (let c = 1; c <= totalCols; c += 1) {
      const cell = sheet.getRow(r).getCell(c);
      cell.alignment = wrapCols.has(c) ? centerWrap : center;
    }

    sheet.getRow(r).getCell(col.qty).fill = fills.qty;
    sheet.getRow(r).getCell(col.unitWeightG).fill = fills.weight;
    sheet.getRow(r).getCell(col.totalWeightKg).fill = fills.weight;
    sheet.getRow(r).getCell(col.priceYuan).fill = fills.price;
    sheet.getRow(r).getCell(col.totalCostYuan).fill = fills.total;

    if (photoFirst != null) {
      for (let p = photoFirst; p <= photoLast; p += 1) {
        sheet.getRow(r).getCell(p).fill = fills.photo;
      }
    }

    sheet.getRow(r).getCell(col.qty).numFmt = '#,##0';
    sheet.getRow(r).getCell(col.unitWeightG).numFmt = '#,##0';
    sheet.getRow(r).getCell(col.totalWeightKg).numFmt = '#,##0.00';
    sheet.getRow(r).getCell(col.priceYuan).numFmt = '#,##0.00';
    sheet.getRow(r).getCell(col.totalCostYuan).numFmt = '#,##0.00';
  }

  if (totalsRowIndex) {
    const tr = sheet.getRow(totalsRowIndex);
    tr.height = 24;
    tr.font = { size: FONT_SIZE_PT, bold: true, color: { argb: 'FF1F2937' } };
    for (let c = 1; c <= totalCols; c += 1) {
      const cell = tr.getCell(c);
      cell.fill = fills.totalsRow;
      cell.alignment = c === totalsLabelCol ? centerWrap : center;
    }
    tr.getCell(col.qty).numFmt = '#,##0';
    tr.getCell(col.totalWeightKg).numFmt = '#,##0.00';
    tr.getCell(col.totalCostYuan).numFmt = '#,##0.00';
  }

  if (photoSlots === 0) {
    return workbook;
  }

  for (let idx = 0; idx < rows.length; idx += 1) {
    const excelRow = idx + 2;
    const photoUrls = Array.isArray(rows[idx]?.photoUrls) ? rows[idx].photoUrls : [];
    if (!photoUrls.length) {
      sheet.getRow(excelRow).height = MIN_DATA_ROW_PT;
      continue;
    }

    const imageBuffers = [];
    for (const url of photoUrls) {
      const img = await fetchImageBinary(url);
      if (img) imageBuffers.push(img);
    }
    if (!imageBuffers.length) {
      sheet.getRow(excelRow).height = MIN_DATA_ROW_PT;
      continue;
    }

    sheet.getRow(excelRow).height = targetRowPt;
    const rowLayoutPx = rowHeightPointsToLayoutPx(sheet.getRow(excelRow).height);
    const rowFrac = centerFraction(thumbH, rowLayoutPx);

    const placed = Math.min(imageBuffers.length, photoSlots);
    for (let i = 0; i < placed; i += 1) {
      const col1Based = photoFirst + i;
      const pixelsPerCol = excelColumnWidthToPixels(sheet.getColumn(col1Based).width);
      const colFrac = centerFraction(thumbW, pixelsPerCol);

      const imageId = workbook.addImage({
        buffer: imageBuffers[i].buffer,
        extension: imageBuffers[i].extension,
      });

      sheet.addImage(imageId, {
        tl: {
          col: col1Based - 1 + colFrac,
          row: excelRow - 1 + rowFrac,
        },
        ext: { width: thumbW, height: thumbH },
      });
    }
  }

  return workbook;
}

export async function downloadChinaOrderExcel({ fileName, rows }) {
  const wb = await buildChinaOrderWorkbook({ rows });
  const finalName = `${buildFileName(fileName)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
