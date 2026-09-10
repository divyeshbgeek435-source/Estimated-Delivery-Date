/** Client-safe Shopify ID helpers (no FormData / server-only APIs). */

export function shopifyNumericId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/(\d+)\s*$/);
  return match ? match[1] : raw;
}

export function parseIdList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function idKeys(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const numeric = shopifyNumericId(raw);
  return numeric && numeric !== raw ? [raw, numeric] : [raw];
}

export function idsIntersect(left = [], right = []) {
  const wanted = new Set((right || []).flatMap(idKeys));
  return (left || []).some((id) => idKeys(id).some((key) => wanted.has(key)));
}

export function mergeIdLists(...lists) {
  const seen = new Set();
  const result = [];
  for (const list of lists) {
    for (const value of parseIdList(list)) {
      const key = shopifyNumericId(value) || value;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}
