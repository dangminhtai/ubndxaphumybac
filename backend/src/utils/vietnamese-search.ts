export function removeVietnameseAccents(value: string) {
  return value
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeSearchText(value: string) {
  return removeVietnameseAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchText(value: string) {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(' ') : [];
}

export function normalizeCatalogCode(value: string) {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const match = compact.match(/^CH(VT|TH|TC|PC|CC|KH)(\d{2})$/);
  return match ? `CH.${match[1]}.${match[2]}` : undefined;
}

function trigrams(value: string) {
  const padded = `  ${value}  `;
  const grams = new Set<string>();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    grams.add(padded.slice(index, index + 3));
  }
  return grams;
}

export function diceSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (left.length < 3 || right.length < 3) return 0;
  const leftGrams = trigrams(left);
  const rightGrams = trigrams(right);
  let overlap = 0;
  for (const gram of leftGrams) {
    if (rightGrams.has(gram)) overlap += 1;
  }
  return (2 * overlap) / (leftGrams.size + rightGrams.size);
}
