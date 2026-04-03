import ExcelJS from 'exceljs';

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

// Excel must always be EN (independent from UI language)
const EN = {
  totalsLabel: 'Totals:',
  columns: {
    no: '№',
    factoryId: 'Factory ID',
    skuid: 'SKUID',
    photo1: 'Photo 1',
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

function excelColumnWidthToPixels(width) {
  // Approximation used by ExcelJS layout; close enough for image placement.
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return 100;
  return Math.round(w * 7 + 5);
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
        if (!ctx) {
          throw new Error('canvas context unavailable');
        }
        ctx.drawImage(image, 0, 0);
        const pngBlob = await new Promise((resolveBlob) => canvas.toBlob(resolveBlob, 'image/png'));
        if (!pngBlob) {
          throw new Error('failed to convert image to png');
        }
        const pngBuffer = await pngBlob.arrayBuffer();
        resolve({ buffer: pngBuffer, extension: 'png' });
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

    // ExcelJS supports png/jpeg/gif. Convert unsupported formats to png.
    if (extension === 'webp' || extension === 'bmp' || contentType.includes('image/webp') || contentType.includes('image/bmp')) {
      try {
        return await convertBlobToPng(blob);
      } catch {
        return null;
      }
    }

    const buffer = await blob.arrayBuffer();
    return { buffer, extension };
  } catch {
    return null;
  }
}

export async function buildChinaOrderWorkbook({
  rows,
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Order');

  const header = [
    EN.columns.no,
    EN.columns.factoryId,
    EN.columns.skuid,
    EN.columns.photo1,
    EN.columns.productLink,
    EN.columns.packagingComment,
    EN.columns.qty,
    EN.columns.unitWeightGrams,
    EN.columns.totalWeightKg,
    EN.columns.priceYuan,
    EN.columns.totalCostYuan,
    EN.columns.readyTime,
  ];

  sheet.addRow(header);

  rows.forEach((r, idx) => {
    const qty = safeNumber(r.qty) ?? 0;
    const unitWeightG = safeNumber(r.unitWeight) ?? null;
    const priceY = safeNumber(r.purchasePrice) ?? null;
    const rowNumber = idx + 1;
    const excelRow = idx + 2; // header at row 1

    const row = sheet.addRow([
      rowNumber,
      safeText(r.factoryId),
      safeText(r.article),
      '',
      safeText(r.productLink),
      safeText(r.packagingComment),
      qty,
      unitWeightG,
      null,
      priceY,
      null,
      safeText(r.readyTime),
    ]);

    row.getCell(9).value = {
      formula: `IF(AND(G${excelRow}>0,H${excelRow}>0),G${excelRow}*H${excelRow}/1000,"")`,
    };
    row.getCell(11).value = {
      formula: `IF(AND(G${excelRow}>0,J${excelRow}>0),G${excelRow}*J${excelRow},"")`,
    };
  });

  if (rows.length > 0) {
    const firstDataRow = 2;
    const lastDataRow = rows.length + 1;
    const totalsRow = lastDataRow + 1;
    const row = sheet.addRow([]);
    row.getCell(6).value = EN.totalsLabel;
    row.getCell(7).value = { formula: `SUM(G${firstDataRow}:G${lastDataRow})` };
    row.getCell(9).value = { formula: `SUM(I${firstDataRow}:I${lastDataRow})` };
    row.getCell(11).value = { formula: `SUM(K${firstDataRow}:K${lastDataRow})` };
  }

  sheet.columns = [
    { width: 6 },
    { width: 12 },
    { width: 18 },
    { width: 26 },
    { width: 40 },
    { width: 22 },
    { width: 10 },
    { width: 18 },
    { width: 18 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
  ];

  const totalRows = sheet.rowCount;
  const totalCols = 12;
  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  for (let r = 1; r <= totalRows; r += 1) {
    for (let c = 1; c <= totalCols; c += 1) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = thinBorder;
    }
  }

  // Header emphasis
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF2F3A4A' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 24;

  // Palette (soft, readable, production-like)
  const fills = {
    header: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD7E3F4' } },      // slate blue (darker)
    qty: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E8FF' } },         // blue (darker)
    weight: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD7EEDC' } },      // green (darker)
    price: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6E2B8' } },       // amber (darker)
    total: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6D9FA' } },       // violet (darker)
    totalsRow: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } },   // neutral gray
  };

  for (let c = 1; c <= totalCols; c += 1) {
    sheet.getRow(1).getCell(c).fill = fills.header;
  }

  const firstDataRow = 2;
  const hasData = rows.length > 0;
  const lastDataRow = hasData ? rows.length + 1 : 1;
  const totalsRowIndex = hasData ? lastDataRow + 1 : null;

  // Alignments + number formats + column accents
  for (let r = firstDataRow; r <= lastDataRow; r += 1) {
    // B: factory ID, C: SKUID, E: link, F: comment, L: ready time
    sheet.getRow(r).getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(r).getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(r).getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    sheet.getRow(r).getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    sheet.getRow(r).getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };

    // Numeric columns
    sheet.getRow(r).getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(r).getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(r).getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(r).getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(r).getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(r).getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };

    sheet.getRow(r).getCell(7).numFmt = '#,##0';
    sheet.getRow(r).getCell(8).numFmt = '#,##0';
    sheet.getRow(r).getCell(9).numFmt = '#,##0.00';
    sheet.getRow(r).getCell(10).numFmt = '#,##0.00';
    sheet.getRow(r).getCell(11).numFmt = '#,##0.00';

    // Column accents
    sheet.getRow(r).getCell(7).fill = fills.qty;
    sheet.getRow(r).getCell(8).fill = fills.weight;
    sheet.getRow(r).getCell(9).fill = fills.weight;
    sheet.getRow(r).getCell(10).fill = fills.price;
    sheet.getRow(r).getCell(11).fill = fills.total;
  }

  if (totalsRowIndex) {
    const tr = sheet.getRow(totalsRowIndex);
    tr.height = 22;
    tr.font = { bold: true, color: { argb: 'FF1F2937' } };
    for (let c = 1; c <= totalCols; c += 1) {
      tr.getCell(c).fill = fills.totalsRow;
    }
    tr.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    tr.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    tr.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
    tr.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    tr.getCell(7).numFmt = '#,##0';
    tr.getCell(9).numFmt = '#,##0.00';
    tr.getCell(11).numFmt = '#,##0.00';
  }

  // Add images (all product images) into "Photo 1" column (D)
  for (let idx = 0; idx < rows.length; idx += 1) {
    const excelRow = idx + 2;
    const photoUrls = Array.isArray(rows[idx]?.photoUrls) ? rows[idx].photoUrls : [];
    if (!photoUrls.length) continue;

    const imageBuffers = [];
    for (const url of photoUrls) {
      const img = await fetchImageBinary(url);
      if (img) imageBuffers.push(img);
    }
    if (!imageBuffers.length) continue;

    // Arrange images in the same row: 3 per line, thumbnail style.
    const perLine = 2;
    const thumbW = 72;
    const thumbH = 72;
    const gap = 6;
    const lines = Math.ceil(imageBuffers.length / perLine);
    const rowHeightPx = lines * thumbH + Math.max(0, lines - 1) * gap + 6;
    const rowHeightPoints = Math.max(sheet.getRow(excelRow).height || 15, rowHeightPx * 0.75);
    sheet.getRow(excelRow).height = rowHeightPoints;

    // Convert pixel offsets to ExcelJS grid offsets.
    // - row: tl.row uses "row units", where 1 unit ~= current row height in pixels.
    // - col: tl.col uses "column units" where 1 unit ~= column width in pixels.
    const pixelsPerRow = rowHeightPoints / 0.75; // inverse of points = pixels * 0.75
    const colDIndex0Based = 3; // Photo 1 is column D (1-based col 4)
    const pixelsPerCol = excelColumnWidthToPixels(sheet.getColumn(colDIndex0Based + 1).width);

    imageBuffers.forEach((img, i) => {
      const imageId = workbook.addImage({
        buffer: img.buffer,
        extension: img.extension,
      });
      const line = Math.floor(i / perLine);
      const colInLine = i % perLine;
      const offsetX = 2 + colInLine * (thumbW + gap);
      const offsetY = 2 + line * (thumbH + gap);
      sheet.addImage(imageId, {
        tl: {
          col: colDIndex0Based + offsetX / pixelsPerCol,
          row: (excelRow - 1) + offsetY / pixelsPerRow,
        },
        ext: { width: thumbW, height: thumbH },
      });
    });
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

