import { PLACEMENT_MODES, WORKING_DAYS } from "./constants";
import { idsIntersect, mergeIdLists } from "./form-ids";

export {
  idsIntersect,
  mergeIdLists,
  parseIdList,
  shopifyNumericId,
} from "./form-ids";

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

function placementIds(placement, idKey, listKey) {
  return mergeIdLists(
    placement?.[idKey],
    (placement?.[listKey] || []).map((item) => item?.id),
  );
}

export function syncedPlacementIds(placement) {
  const source = placement && typeof placement === "object" ? placement : {};
  return {
    productIds: placementIds(source, "productIds", "products"),
    collectionIds: placementIds(source, "collectionIds", "collections"),
  };
}

export function widgetAppliesToProduct(widget, productId, collectionIds = []) {
  const placement = widget.placementConfig || {};
  const mode = placement.mode || PLACEMENT_MODES.ALL_PRODUCTS;
  if (mode === PLACEMENT_MODES.ALL_PRODUCTS) return true;
  if (mode === PLACEMENT_MODES.PRODUCTS) {
    const productIds = placementIds(placement, "productIds", "products");
    if (!productIds.length || !productId) return false;
    return idsIntersect([productId], productIds);
  }
  if (mode === PLACEMENT_MODES.COLLECTIONS) {
    const wanted = placementIds(placement, "collectionIds", "collections");
    if (!wanted.length || !(collectionIds || []).length) return false;
    return idsIntersect(collectionIds, wanted);
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

function placementSpecificity(widget) {
  const mode = widget?.placementConfig?.mode || PLACEMENT_MODES.ALL_PRODUCTS;
  if (mode === PLACEMENT_MODES.PRODUCTS) return 3;
  if (mode === PLACEMENT_MODES.COLLECTIONS) return 2;
  return 1;
}

export function pickStorefrontWidget(widgets, { productId, collectionIds = [], marketHandle, country, pageType } = {}) {
  const list = widgets || [];
  let matching = list.filter((widget) => widgetAppliesToProduct(widget, productId, collectionIds));
  if (pageType === "collection") {
    const collectionWidgets = matching.filter(
      (widget) => (widget.placementConfig?.mode || PLACEMENT_MODES.ALL_PRODUCTS) === PLACEMENT_MODES.COLLECTIONS,
    );
    if (collectionWidgets.length) matching = collectionWidgets;
  }
  matching = [...matching].sort((left, right) => {
    const bySpecificity = placementSpecificity(right) - placementSpecificity(left);
    if (bySpecificity) return bySpecificity;
    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
  const specific = matching.filter(
    (widget) => widget.marketMode === "SPECIFIC" && widgetAppliesToMarket(widget, marketHandle, country),
  );
  if (specific.length) return specific[0];
  return matching.find((widget) => widget.marketMode !== "SPECIFIC") || matching[0] || null;
}
