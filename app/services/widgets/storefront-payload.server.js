import { publicStorefrontConfig } from "../analytics/analytics.server";
import { buildStorefrontDelivery } from "../delivery/delivery-calculator.server";
import { parseIdList, pickStorefrontWidget } from "../../lib/form.server";
import {
  asksForPincode,
  matchPincodeRule,
  publicPincodeState,
  shippingWithPincodeRule,
} from "../../lib/pincode";
import { lookupPlaceForRules } from "../../lib/pincode.server";

export function parseCartItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dateSettingsFrom(widget) {
  return {
    dateFormat: widget.messageConfig.dateFormat,
    dateSeparator: widget.messageConfig.dateSeparator,
    includeYear: widget.messageConfig.includeYear,
  };
}

export function estimateFor(widget, extras = {}) {
  const shipping = extras.pincodeRule
    ? shippingWithPincodeRule(widget.shippingRules, extras.pincodeRule)
    : widget.shippingRules;
  return buildStorefrontDelivery(shipping, widget.timezone, new Date(), {
    dateSettings: dateSettingsFrom(widget),
    ...extras,
  });
}

export function storefrontOptions(url, extras = {}) {
  return {
    locale: url.searchParams.get("locale") || "en",
    pincode: url.searchParams.get("pincode") || "",
    productWeight: url.searchParams.get("productWeight") || extras.productWeight || "",
    ...extras,
  };
}

export async function widgetPayload(widget, extras = {}) {
  const pincodeValue = extras.pincode || "";
  const options = {
    code: pincodeValue,
    rules: widget.shippingRules?.pincodeRules,
    weightRules: widget.shippingRules?.weightRules,
    productWeight: extras.productWeight,
    shipping: widget.shippingRules,
  };
  let pincodeState = publicPincodeState(widget.shippingRules?.pincodeRules, options);
  if (pincodeState.needsLookup) {
    const place = await lookupPlaceForRules(widget.shippingRules?.pincodeRules, pincodeValue);
    pincodeState = publicPincodeState(widget.shippingRules?.pincodeRules, { ...options, place });
    extras = { ...extras, place };
  }
  const pincodeRule =
    pincodeState.enabled && pincodeState.available
      ? matchPincodeRule(pincodeValue, widget.shippingRules?.pincodeRules) || {
          minDays: pincodeState.minDays,
          maxDays: pincodeState.maxDays,
        }
      : null;
  const askPincode = asksForPincode(widget.shippingRules?.weightRules, widget.shippingRules?.pincodeRules);
  const hideUntilCheck = askPincode && pincodeState.available !== true;
  const hideDelivery = Boolean(askPincode && pincodeValue && pincodeState.available === false);
  const delivery = hideDelivery || hideUntilCheck ? null : estimateFor(widget, { ...extras, pincodeRule });
  return publicStorefrontConfig(widget, delivery, extras);
}

export function safeEstimate(widget, extras = {}) {
  try {
    return estimateFor(widget, extras);
  } catch (error) {
    console.warn("[edd] delivery estimate failed", error?.message || error);
    return null;
  }
}

export async function estimateFromProductWidget(widget, extras = {}) {
  const payload = await widgetPayload(widget, extras);
  if (payload?.delivery) return payload.delivery;
  if (extras.pincode) return null;
  return safeEstimate(widget, extras);
}

export async function deliveriesFromCartItems({
  productWidgets,
  cartItems,
  options,
  marketHandle,
  country,
  collectionIds,
  fallbackWidget = null,
}) {
  const withDelivery = [];
  for (const item of cartItems || []) {
    const itemWidget =
      pickStorefrontWidget(productWidgets, {
        productId: item.id || item.productId,
        collectionIds: parseIdList(item.collectionIds || collectionIds),
        marketHandle,
        country,
      }) || fallbackWidget;
    if (!itemWidget) continue;
    const delivery = await estimateFromProductWidget(itemWidget, {
      ...options,
      productName: item.title || options.productName,
      productWeight: item.productWeight || options.productWeight,
    });
    if (!delivery) continue;
    withDelivery.push({ item, widget: itemWidget, delivery });
  }
  withDelivery.sort((a, b) =>
    String(b.delivery?.deliveryDateMax || "").localeCompare(String(a.delivery?.deliveryDateMax || "")),
  );
  return withDelivery;
}
