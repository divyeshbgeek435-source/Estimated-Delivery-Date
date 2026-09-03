const PRODUCT_MODE = "PRODUCTS";
const COLLECTION_MODE = "COLLECTIONS";
const ALL_MODE = "ALL_PRODUCTS";

function idKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/(\d+)\s*$/);
  return match ? match[1] : raw;
}

function uniqueIds(...lists) {
  const seen = new Set();
  const result = [];
  for (const list of lists) {
    for (const value of list || []) {
      const raw = String(value || "").trim();
      const key = idKey(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(raw);
    }
  }
  return result;
}

function sameIdSet(left, right) {
  const a = new Set(uniqueIds(left).map(idKey));
  const b = new Set(uniqueIds(right).map(idKey));
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

export function normalizePlacementForSave(placement = {}, fallback = {}) {
  const merged = { ...fallback, ...placement };
  return {
    mode: String(merged.mode || "").trim(),
    productIds: uniqueIds(
      merged.productIds,
      (merged.products || []).map((item) => item?.id),
    ),
    collectionIds: uniqueIds(
      merged.collectionIds,
      (merged.collections || []).map((item) => item?.id),
    ),
    products: Array.isArray(merged.products) ? merged.products : [],
    collections: Array.isArray(merged.collections) ? merged.collections : [],
    position: merged.position,
  };
}

export function placementWasPersisted(savedConfig, expected) {
  if (!savedConfig || !expected?.mode) return false;
  if (String(savedConfig.mode || "") !== String(expected.mode || "")) return false;
  if (expected.mode === PRODUCT_MODE) {
    return sameIdSet(
      uniqueIds(savedConfig.productIds, (savedConfig.products || []).map((item) => item?.id)),
      uniqueIds(expected.productIds, (expected.products || []).map((item) => item?.id)),
    );
  }
  if (expected.mode === COLLECTION_MODE) {
    return sameIdSet(
      uniqueIds(savedConfig.collectionIds, (savedConfig.collections || []).map((item) => item?.id)),
      uniqueIds(expected.collectionIds, (expected.collections || []).map((item) => item?.id)),
    );
  }
  return expected.mode === ALL_MODE || Boolean(expected.mode);
}

export function matchedUpdateCount(result = {}) {
  const value = result.n ?? result.nMatched ?? result.nModified ?? 0;
  if (value && typeof value === "object") {
    if ("low" in value) return Number(value.low);
    if ("$numberLong" in value) return Number(value.$numberLong);
  }
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}
