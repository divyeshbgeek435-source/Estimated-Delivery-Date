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
  if (!productId || placement.mode === "ALL_PRODUCTS") return true;
  if (placement.mode === "PRODUCTS") {
    return (placement.productIds || []).includes(productId);
  }
  if (placement.mode === "COLLECTIONS") {
    return (collectionIds || []).some((id) =>
      (placement.collectionIds || []).includes(id),
    );
  }
  return true;
}

export function widgetAppliesToMarket(widget, marketHandle, country) {
  if (!widget.marketMode || widget.marketMode === "ALL") return true;
  const ids = widget.marketIds || [];
  const markets = widget.markets || [];
  const handles = markets.map((item) => item.handle || item.id);
  const titles = markets.map((item) => item.title);
  if (marketHandle && (ids.includes(marketHandle) || handles.includes(marketHandle))) return true;
  if (country && (ids.includes(country) || titles.includes(country))) return true;
  return false;
}

export function pickStorefrontWidget(widgets, { productId, collectionIds = [], marketHandle, country } = {}) {
  const matching = (widgets || []).filter((widget) =>
    widgetAppliesToProduct(widget, productId, collectionIds),
  );
  const specific = matching.filter(
    (widget) =>
      widget.marketMode === "SPECIFIC" && widgetAppliesToMarket(widget, marketHandle, country),
  );
  if (specific.length) return specific[0];
  return matching.find((widget) => widget.marketMode !== "SPECIFIC") || null;
}
