import { WORKING_DAYS } from "./constants";

export function readWorkingDays(formData, prefix = "workingDay_") {
  return WORKING_DAYS.filter((day) => {
    const value = formData.get(`${prefix}${day}`);
    return value === "on" || value === "true" || value === day;
  });
}

export function readJsonField(formData, name, fallback) {
  const raw = formData.get(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

export function widgetAppliesToProduct(widget, productId, collectionIds = []) {
  const placement = widget.placementConfig || {};
  const mode = placement.mode || "ALL_PRODUCTS";
  const productIds = placement.productIds || [];
  const collectionIdsForWidget = placement.collectionIds || [];
  if (!productId || mode === "ALL_PRODUCTS") return true;
  if (mode === "PRODUCTS") {
    if (!productIds.length) return true;
    return productIds.includes(productId);
  }
  if (mode === "COLLECTIONS") {
    if (!collectionIdsForWidget.length) return true;
    return (collectionIds || []).some((id) => collectionIdsForWidget.includes(id));
  }
  return true;
}

export function widgetAppliesToMarket(widget, marketHandle, country) {
  if (!widget.marketMode || widget.marketMode === "ALL") return true;
  const ids = widget.marketIds || [];
  const markets = widget.markets || [];
  if (!ids.length && !markets.length) return true;
  const handles = markets.map((item) => item.handle || item.id);
  const titles = markets.map((item) => item.title);
  if (marketHandle && (ids.includes(marketHandle) || handles.includes(marketHandle))) return true;
  if (country && (ids.includes(country) || titles.includes(country) || handles.includes(country))) return true;
  return false;
}

export function pickStorefrontWidget(widgets, { productId, collectionIds = [], marketHandle, country } = {}) {
  const list = widgets || [];
  const matching = list.filter((widget) => widgetAppliesToProduct(widget, productId, collectionIds));
  const pool = matching.length ? matching : list;
  const specific = pool.filter(
    (widget) => widget.marketMode === "SPECIFIC" && widgetAppliesToMarket(widget, marketHandle, country),
  );
  if (specific.length) return specific[0];
  return pool.find((widget) => widget.marketMode !== "SPECIFIC") || pool[0] || null;
}
