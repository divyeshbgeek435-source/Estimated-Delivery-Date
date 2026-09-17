import { PLACEMENT_MODES, WIDGET_LOCATIONS, WIDGET_STATUSES } from "./constants";
import { idsIntersect, mergeIdLists, shopifyNumericId } from "./form-ids";

export const ACTIVATION_CONFLICT_KEY = "__activationConflict";

function idKeys(list = []) {
  return [...new Set((list || []).map((value) => shopifyNumericId(value) || String(value || "").trim()).filter(Boolean))];
}

export function placementTargetIds(placement = {}) {
  const mode = placement.mode || PLACEMENT_MODES.ALL_PRODUCTS;
  if (mode === PLACEMENT_MODES.PRODUCTS) {
    return mergeIdLists(
      placement.productIds,
      (placement.products || []).map((item) => item?.id),
    );
  }
  if (mode === PLACEMENT_MODES.COLLECTIONS) {
    return mergeIdLists(
      placement.collectionIds,
      (placement.collections || []).map((item) => item?.id),
    );
  }
  return [];
}

export function describePlacement(placement = {}) {
  const mode = placement.mode || PLACEMENT_MODES.ALL_PRODUCTS;
  if (mode === PLACEMENT_MODES.ALL_PRODUCTS) {
    return { mode, label: "All products", titles: ["All products"] };
  }
  if (mode === PLACEMENT_MODES.COLLECTIONS) {
    const titles = (placement.collections || []).map((item) => item?.title || item?.handle || item?.id).filter(Boolean);
    const ids = placementTargetIds(placement);
    return {
      mode,
      label: titles.length ? `Collections: ${titles.join(", ")}` : `Collections (${ids.length})`,
      titles,
      ids,
    };
  }
  const titles = (placement.products || []).map((item) => item?.title || item?.handle || item?.id).filter(Boolean);
  const ids = placementTargetIds(placement);
  return {
    mode,
    label: titles.length ? `Products: ${titles.join(", ")}` : `Products (${ids.length})`,
    titles,
    ids,
  };
}

function cartDisplayLabel(widget = {}) {
  const mode = widget.cartConfig?.displayMode || widget.displayMode || "GENERAL";
  return mode === "PER_PRODUCT" ? "Cart · Per product" : "Cart page";
}

/** Human-readable “Apply to” value for dashboard tables and conflict UI. */
export function widgetApplyToLabel(widget = {}) {
  if (widget.location === WIDGET_LOCATIONS.CART) {
    return cartDisplayLabel(widget);
  }
  if (widget.location === WIDGET_LOCATIONS.CHECKOUT) {
    return "Checkout";
  }
  return describePlacement(widget.placementConfig || {}).label;
}

/**
 * Two PRODUCT widgets conflict when their live placements would overlap.
 * Two CART widgets always conflict - only one cart widget can be live.
 */
export function placementsConflict(left = {}, right = {}) {
  const modeA = left.mode || PLACEMENT_MODES.ALL_PRODUCTS;
  const modeB = right.mode || PLACEMENT_MODES.ALL_PRODUCTS;

  if (modeA === PLACEMENT_MODES.ALL_PRODUCTS || modeB === PLACEMENT_MODES.ALL_PRODUCTS) {
    return true;
  }

  if (modeA === PLACEMENT_MODES.COLLECTIONS && modeB === PLACEMENT_MODES.COLLECTIONS) {
    return idsIntersect(placementTargetIds(left), placementTargetIds(right));
  }

  if (modeA === PLACEMENT_MODES.PRODUCTS && modeB === PLACEMENT_MODES.PRODUCTS) {
    return idsIntersect(placementTargetIds(left), placementTargetIds(right));
  }

  // Products vs collections do not conflict: specific-product widgets and
  // collection widgets can both be live. Storefront pick prefers PRODUCTS.
  return false;
}

export function widgetsConflict(left = {}, right = {}) {
  const location = left.location || right.location;
  if (!location || (left.location && right.location && left.location !== right.location)) {
    return false;
  }
  if (location === WIDGET_LOCATIONS.CART) return true;
  if (location === WIDGET_LOCATIONS.PRODUCT) {
    return placementsConflict(left.placementConfig || {}, right.placementConfig || {});
  }
  return false;
}

export function overlapSummary(left = {}, right = {}) {
  const modeA = left.mode || PLACEMENT_MODES.ALL_PRODUCTS;
  const modeB = right.mode || PLACEMENT_MODES.ALL_PRODUCTS;

  if (modeA === PLACEMENT_MODES.ALL_PRODUCTS || modeB === PLACEMENT_MODES.ALL_PRODUCTS) {
    return "All products coverage";
  }

  if (modeA === PLACEMENT_MODES.COLLECTIONS && modeB === PLACEMENT_MODES.COLLECTIONS) {
    const leftTitles = new Map(
      (left.collections || []).map((item) => [shopifyNumericId(item?.id) || item?.id, item?.title || item?.id]),
    );
    const rightIds = idKeys(placementTargetIds(right));
    const shared = rightIds
      .map((id) => leftTitles.get(id))
      .filter(Boolean);
    if (shared.length) return `Collections: ${shared.join(", ")}`;
    return "Shared collections";
  }

  if (modeA === PLACEMENT_MODES.PRODUCTS && modeB === PLACEMENT_MODES.PRODUCTS) {
    const leftTitles = new Map(
      (left.products || []).map((item) => [shopifyNumericId(item?.id) || item?.id, item?.title || item?.id]),
    );
    const rightIds = idKeys(placementTargetIds(right));
    const shared = rightIds
      .map((id) => leftTitles.get(id))
      .filter(Boolean);
    if (shared.length) return `Products: ${shared.join(", ")}`;
    return "Shared products";
  }

  return "Overlapping placement";
}

export function serializeConflictWidget(widget, candidate = {}) {
  const location = widget.location || candidate.location || WIDGET_LOCATIONS.PRODUCT;
  if (location === WIDGET_LOCATIONS.CART) {
    return {
      id: widget.id,
      name: widget.name || "Untitled widget",
      status: widget.status,
      location,
      mode: "CART",
      placementLabel: cartDisplayLabel(widget),
      overlap: "Cart page",
    };
  }

  const placement = widget.placementConfig || {};
  const candidatePlacement = candidate.placementConfig || {};
  const described = describePlacement(placement);
  return {
    id: widget.id,
    name: widget.name || "Untitled widget",
    status: widget.status,
    location,
    mode: described.mode,
    placementLabel: described.label,
    overlap: overlapSummary(candidatePlacement, placement),
  };
}

export function supportsLiveConflict(location) {
  return location === WIDGET_LOCATIONS.PRODUCT || location === WIDGET_LOCATIONS.CART;
}

export function findConflictingWidgets(candidate, others = []) {
  if (!candidate || !supportsLiveConflict(candidate.location)) return [];
  return (others || [])
    .filter((widget) => {
      if (!widget || widget.id === candidate.id) return false;
      if (widget.location && widget.location !== candidate.location) return false;
      const status = widget.status || WIDGET_STATUSES.ACTIVE;
      if (status !== WIDGET_STATUSES.ACTIVE && status !== WIDGET_STATUSES.SCHEDULED) return false;
      return widgetsConflict(candidate, widget);
    })
    .map((widget) => serializeConflictWidget(widget, candidate));
}

export function findLivePlacementConflicts(candidate, liveWidgets = []) {
  return findConflictingWidgets(
    candidate,
    (liveWidgets || []).filter((widget) => widget.status === WIDGET_STATUSES.ACTIVE),
  );
}

export function conflictDialogCopy(location, mode = "publish") {
  if (location === WIDGET_LOCATIONS.CART) {
    if (mode === "activation") {
      return {
        title: "Scheduled cart widget conflicts with a live widget",
        body: "A scheduled cart widget is due to go live, but another cart widget is already live. Choose which one should stay live. The other will move to draft.",
      };
    }
    return {
      title: "Another cart widget is already live",
      body: "Only one cart widget can be live at a time. Choose which widget should stay live. The other will move to draft.",
    };
  }
  if (mode === "activation") {
    return {
      title: "Scheduled widget conflicts with a live widget",
      body: "This scheduled widget is due to go live, but another widget already covers the same all-products, collection, or product placement. Choose which one should stay live.",
    };
  }
  return {
    title: "Another widget is already live",
    body: "All products can only have one live widget. The same collection or product cannot be live on two widgets. Choose which widget should stay live - only that one remains published.",
  };
}
