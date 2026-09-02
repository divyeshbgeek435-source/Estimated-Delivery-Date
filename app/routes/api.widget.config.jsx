import { authenticate, unauthenticated } from "../shopify.server";
import { getActiveStorefrontWidgets } from "../services/widgets/widget.server";
import { publicStorefrontConfig } from "../services/analytics/analytics.server";
import { mergeIdLists, parseIdList, pickStorefrontWidget } from "../lib/form.server";
import { getProductCollectionIds } from "../services/shopify/catalog.server";
import { PLACEMENT_MODES, WIDGET_LOCATIONS } from "../lib/constants";
import {
  deliveriesFromCartItems,
  parseCartItems,
  safeEstimate,
  storefrontOptions,
  widgetPayload,
} from "../services/widgets/storefront-payload.server";

function parseCollectionIds(value) {
  return parseIdList(value);
}

async function resolveCollectionIds(shop, admin, productId, provided, widgets = []) {
  const merged = mergeIdLists(provided);
  const needsLookup = Boolean(
    productId &&
      widgets.some((widget) => (widget.placementConfig?.mode || "") === PLACEMENT_MODES.COLLECTIONS),
  );
  if (!needsLookup) return merged;
  try {
    const client = admin || (await unauthenticated.admin(shop)).admin;
    return mergeIdLists(merged, await getProductCollectionIds(client, productId));
  } catch {
    return merged;
  }
}

async function requestUrl(request) {
  const url = new URL(request.url);
  if (request.method === "GET" || request.method === "HEAD") return url;
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    params.forEach((value, key) => {
      if (value) url.searchParams.set(key, value);
    });
  } catch {
    // Keep query-string params when the body is empty or not form-encoded.
  }
  return url;
}

async function handleConfig(request) {
  let shop;
  let admin;
  try {
    const context = await authenticate.public.appProxy(request);
    shop = context.session?.shop;
    admin = context.admin;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!shop) {
    return Response.json({ widget: null });
  }

  try {
    const url = await requestUrl(request);
    const location = (url.searchParams.get("location") || WIDGET_LOCATIONS.PRODUCT).toUpperCase();
    const productId = url.searchParams.get("productId") || url.searchParams.get("product_id");
    const pageType = String(url.searchParams.get("page") || url.searchParams.get("template") || "").toLowerCase();
    const collectionIdsFromRequest = parseCollectionIds(
      url.searchParams.get("collectionIds") || url.searchParams.get("collection_ids"),
    );
    const marketHandle = url.searchParams.get("market") || url.searchParams.get("marketHandle");
    const country = url.searchParams.get("country");
    const productName = url.searchParams.get("productName") || "";
    const stockLeft = url.searchParams.get("stockLeft") || "";
    const cartItems = parseCartItems(url.searchParams.get("cartItems"));
    const options = storefrontOptions(url, { productName, stockLeft });

    const widgets = await getActiveStorefrontWidgets(shop, location);
    const collectionIds =
      location === WIDGET_LOCATIONS.PRODUCT
        ? await resolveCollectionIds(shop, admin, productId, collectionIdsFromRequest, widgets)
        : collectionIdsFromRequest;

    if (location === WIDGET_LOCATIONS.PRODUCT) {
      const widget = pickStorefrontWidget(widgets, {
        productId,
        collectionIds,
        marketHandle,
        country,
        pageType,
      });
      if (!widget) return Response.json({ widget: null });
      return Response.json({ widget: await widgetPayload(widget, options) });
    }

    const displayWidget = pickStorefrontWidget(widgets, { marketHandle, country }) || widgets[0];
    if (!displayWidget) return Response.json({ widget: null });

    const productWidgets = await getActiveStorefrontWidgets(shop, WIDGET_LOCATIONS.PRODUCT);
    const withDelivery = await deliveriesFromCartItems({
      productWidgets,
      cartItems,
      options,
      marketHandle,
      country,
      collectionIds,
      fallbackWidget: displayWidget,
    });
    const cartDelivery = withDelivery[0]?.delivery || safeEstimate(displayWidget, options);
    const perProduct = displayWidget.cartConfig?.displayMode === "PER_PRODUCT" && withDelivery.length;

    return Response.json({
      widget: publicStorefrontConfig(displayWidget, cartDelivery, {
        ...options,
        items: perProduct
          ? withDelivery.map((entry) => ({
              id: entry.item.id,
              title: entry.item.title,
              delivery: entry.delivery,
            }))
          : [],
      }),
    });
  } catch (error) {
    console.warn("[edd] storefront config failed", error?.message || error);
    return Response.json({ widget: null });
  }
}

export const loader = async ({ request }) => handleConfig(request);
export const action = async ({ request }) => handleConfig(request);
