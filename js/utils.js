export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’ʼ`]/g, "'")
    .replace(/ё/g, 'е')
    .trim();
}

// Ukrainian plural: plural(5, ['порція', 'порції', 'порцій'])
export function plural(n, forms) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

const COUNTABLE_UNITS = new Set(['шт.', 'шт', 'головка', 'зубчик', 'зубчики', 'пучок']);

export function scaleAmount(amount, factor, unit) {
  if (amount === null || amount === undefined) return null;
  const value = amount * factor;
  if (COUNTABLE_UNITS.has(unit)) return Math.max(0.5, Math.round(value * 2) / 2);
  if (value >= 100) return Math.round(value / 5) * 5;
  if (value >= 10) return Math.round(value);
  return Math.round(value * 10) / 10;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '';
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value % 1 - 0.5) < 1e-9) {
    const whole = Math.floor(value);
    return whole === 0 ? '½' : `${whole}½`;
  }
  return String(value).replace('.', ',');
}

export function formatMinutes(min, max) {
  if (min === null || min === undefined) return '';
  if (max && max !== min) return `${min}–${max} хв`;
  return `${min} хв`;
}

export function isSafeImageSrc(src) {
  if (!src) return false;
  if (/^https:\/\//i.test(src)) return true;
  return /^(?!\/)(?![a-z][a-z0-9+.-]*:)[\w\-./]+\.(svg|png|jpe?g|webp|gif)$/i.test(src);
}
