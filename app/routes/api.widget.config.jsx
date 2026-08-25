import { authenticate } from "../shopify.server";
import { getActiveStorefrontWidgets } from "../services/widgets/widget.server";
import { buildStorefrontDelivery } from "../services/delivery/delivery-calculator.server";
import { publicStorefrontConfig } from "../services/analytics/analytics.server";
import { pickStorefrontWidget } from "../lib/form.server";
import { matchPincodeRule, publicPincodeState, shippingWithPincodeRule } from "../lib/pincode";
import { WIDGET_LOCATIONS } from "../lib/constants";

function parseCollectionIds(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCartItems(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dateSettingsFrom(widget) {
  return {
    dateFormat: widget.messageConfig.dateFormat,
    dateSeparator: widget.messageConfig.dateSeparator,
    includeYear: widget.messageConfig.includeYear,
  };
}

function estimateFor(widget, extras = {}) {
  const shipping = extras.pincodeRule
    ? shippingWithPincodeRule(widget.shippingRules, extras.pincodeRule)
    : widget.shippingRules;
  return buildStorefrontDelivery(shipping, widget.timezone, new Date(), {
    dateSettings: dateSettingsFrom(widget),
    ...extras,
  });
}

function storefrontOptions(url, extras = {}) {
  return {
    locale: url.searchParams.get("locale") || "en",
    pincode: url.searchParams.get("pincode") || "",
    productWeight: url.searchParams.get("productWeight") || extras.productWeight || "",
    ...extras,
  };
}

function widgetPayload(widget, extras = {}) {
  const pincodeValue = extras.pincode || "";
  const pincodeState = publicPincodeState(widget.shippingRules?.pincodeRules, { code: pincodeValue });
  const pincodeRule =
    pincodeState.enabled && pincodeValue
      ? matchPincodeRule(pincodeValue, widget.shippingRules?.pincodeRules)
      : null;
  const hideDelivery = Boolean(pincodeState.enabled && pincodeValue && pincodeState.available === false);
  const delivery = hideDelivery ? null : estimateFor(widget, { ...extras, pincodeRule });
  return publicStorefrontConfig(widget, delivery, extras);
}

export const loader = async ({ request }) => {
  let shop;
  try {
    const context = await authenticate.public.appProxy(request);
    shop = context.session?.shop;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!shop) {
    return Response.json({ widget: null });
  }

  try {
    const url = new URL(request.url);
    const location = (url.searchParams.get("location") || WIDGET_LOCATIONS.PRODUCT).toUpperCase();
    const productId = url.searchParams.get("productId") || url.searchParams.get("product_id");
    const collectionIds = parseCollectionIds(
      url.searchParams.get("collectionIds") || url.searchParams.get("collection_ids"),
    );
    const marketHandle = url.searchParams.get("market") || url.searchParams.get("marketHandle");
    const country = url.searchParams.get("country");
    const productName = url.searchParams.get("productName") || "";
    const stockLeft = url.searchParams.get("stockLeft") || "";
    const cartItems = parseCartItems(url.searchParams.get("cartItems"));
    const options = storefrontOptions(url, { productName, stockLeft });

    const widgets = await getActiveStorefrontWidgets(shop, location);

    if (location === WIDGET_LOCATIONS.PRODUCT) {
      const widget = pickStorefrontWidget(widgets, {
        productId,
        collectionIds,
        marketHandle,
        country,
      });
      if (!widget) return Response.json({ widget: null });
      return Response.json({ widget: widgetPayload(widget, options) });
    }

    const displayWidget = pickStorefrontWidget(widgets, { marketHandle, country });
    if (!displayWidget) return Response.json({ widget: null });

    const cartDelivery = estimateFor(displayWidget, options);
    if (displayWidget.cartConfig?.displayMode !== "PER_PRODUCT" || !cartItems.length) {
      return Response.json({
        widget: publicStorefrontConfig(displayWidget, cartDelivery, options),
      });
    }

    const productWidgets = await getActiveStorefrontWidgets(shop, WIDGET_LOCATIONS.PRODUCT);
    const sourceItems = cartItems.length ? cartItems : [{ id: productId, collectionIds }];
    const matched = sourceItems
      .map((item) => ({
        item,
        widget: pickStorefrontWidget(productWidgets, {
          productId: item.id || item.productId,
          collectionIds: item.collectionIds || collectionIds,
          marketHandle,
          country,
        }),
      }))
      .filter((entry) => entry.widget);

    if (!matched.length) {
      return Response.json({
        widget: publicStorefrontConfig(displayWidget, cartDelivery, options),
      });
    }

    const withDelivery = matched.map((entry) => ({
      ...entry,
      delivery: estimateFor(entry.widget, { ...options, productName: entry.item.title || productName }),
    }));
    withDelivery.sort((a, b) => String(b.delivery.deliveryDateMax).localeCompare(String(a.delivery.deliveryDateMax)));

    return Response.json({
      widget: publicStorefrontConfig(displayWidget, withDelivery[0]?.delivery || cartDelivery, {
        ...options,
        items: withDelivery.map((entry) => ({
          id: entry.item.id,
          title: entry.item.title,
          delivery: entry.delivery,
        })),
      }),
    });
  } catch (error) {
    console.warn("[edd] storefront config failed", error?.message || error);
    return Response.json({ widget: null });
  }
};
