export const DECIMAL_10_2_MAX = 99999999.99;

export function sanitizeDecimal10_2Input(value) {
  if (value == null) return '';
  let v = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
  if (v === '') return '';

  const parts = v.split('.');
  if (parts.length > 2) {
    v = `${parts[0]}.${parts.slice(1).join('')}`;
  }

  const endsWithDot = v.endsWith('.');
  let [intPart, fracPart] = v.split('.');

  // DECIMAL(10,2) -> max 8 digits in integer part
  intPart = intPart ? intPart.slice(0, 8) : '';

  if (fracPart != null) {
    fracPart = fracPart.slice(0, 2);
  }

  if (endsWithDot && (fracPart == null || fracPart === '')) {
    return intPart === '' ? '0.' : `${intPart}.`;
  }

  if (fracPart != null && fracPart !== '') {
    return `${intPart}.${fracPart}`;
  }

  return intPart;
}

export function parseDecimalOrNull(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function isDecimal10_2InRange(value) {
  if (value == null) return true;
  return Number.isFinite(value) && value >= 0 && value <= DECIMAL_10_2_MAX;
}

