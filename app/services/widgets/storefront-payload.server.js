import { publicStorefrontConfig } from "../analytics/analytics.server";
import { buildStorefrontDelivery } from "../delivery/delivery-calculator.server";
import { parseIdList, pickStorefrontWidget } from "../../lib/form.server";
import {
  asksForPincode,
  matchPincodeRule,
  shippingWithPincodeRule,
} from "../../lib/pincode";
import { resolveStorefrontPincodeState } from "../../lib/pincode.server";

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
  const { state: pincodeState, rules: pincodeRules, place } = await resolveStorefrontPincodeState({
    rules: widget.shippingRules?.pincodeRules,
    shipping: widget.shippingRules,
    weightRules: widget.shippingRules?.weightRules,
    code: pincodeValue,
    productWeight: extras.productWeight,
  });
  const pincodeRule =
    pincodeState.enabled && pincodeState.available
      ? matchPincodeRule(pincodeValue, pincodeRules) || {
          minDays: pincodeState.minDays,
          maxDays: pincodeState.maxDays,
        }
      : null;
  const askPincode = asksForPincode(widget.shippingRules?.weightRules, pincodeRules);
  const hideUntilCheck = askPincode && pincodeState.available !== true;
  const hideDelivery = Boolean(askPincode && pincodeValue && pincodeState.available === false);
  const nextExtras = { ...extras, place, pincodeState };
  const delivery =
    hideDelivery || hideUntilCheck ? null : estimateFor(widget, { ...nextExtras, pincodeRule });
  return publicStorefrontConfig(
    {
      ...widget,
      shippingRules: {
        ...widget.shippingRules,
        pincodeRules,
      },
    },
    delivery,
    nextExtras,
  );
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
  try {
    const payload = await widgetPayload(widget, extras);
    if (payload?.delivery) return payload.delivery;
    // A provided pincode that produced no delivery means unavailable / failed check.
    if (extras.pincode) return null;
    // Cart/checkout never collect a pincode - still estimate from base shipping when
    // the product widget would otherwise wait for a pincode check on the PDP.
    return safeEstimate(widget, extras);
  } catch (error) {
    console.warn("[edd] product widget estimate failed", error?.message || error);
    return null;
  }
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
