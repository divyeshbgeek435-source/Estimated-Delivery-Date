import { authenticate } from "../shopify.server";
import { getActiveStorefrontWidgets } from "../services/widgets/widget.server";
import { publicStorefrontConfig } from "../services/analytics/analytics.server";
import { pickStorefrontWidget } from "../lib/form.server";
import { WIDGET_LOCATIONS } from "../lib/constants";
import {
  deliveriesFromCartItems,
  estimateFromProductWidget,
  parseCartItems,
  storefrontOptions,
} from "../services/widgets/storefront-payload.server";

async function requestUrl(request) {
  const url = new URL(request.url);
  if (request.method === "GET" || request.method === "HEAD") return url;
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      Object.entries(body || {}).forEach(([key, value]) => {
        if (value == null || value === "") return;
        url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
      });
      return url;
    }
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

export const loader = async ({ request }) => {
  const payloadRequest = request.clone();
  const { cors, sessionToken } = await authenticate.public.checkout(request);
  const shop = String(sessionToken?.dest || sessionToken?.iss || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  if (!shop) {
    return cors(Response.json({ widget: null }, { status: 401 }));
  }

  const url = await requestUrl(payloadRequest);
  const widgets = await getActiveStorefrontWidgets(shop, WIDGET_LOCATIONS.CHECKOUT);
  const country = url.searchParams.get("country") || "";
  const marketHandle = url.searchParams.get("market") || "";
  const widget = pickStorefrontWidget(widgets, { marketHandle, country });
  if (!widget) {
    return cors(Response.json({ widget: null }));
  }

  const productWidgets = await getActiveStorefrontWidgets(shop, WIDGET_LOCATIONS.PRODUCT);
  const cartItems = parseCartItems(url.searchParams.get("cartItems"));
  const options = storefrontOptions(url);

  let withDelivery = await deliveriesFromCartItems({
    productWidgets,
    cartItems,
    options,
    marketHandle,
    country,
  });

  if (!cartItems.length) {
    const productWidget = pickStorefrontWidget(productWidgets, { marketHandle, country });
    if (!productWidget) {
      return cors(Response.json({ widget: null }));
    }
    const delivery = await estimateFromProductWidget(productWidget, options);
    if (!delivery) {
      return cors(Response.json({ widget: null }));
    }
    withDelivery = [{ widget: productWidget, delivery }];
  }

  if (!withDelivery.length) {
    return cors(Response.json({ widget: null }));
  }

  const productWidget = withDelivery[0].widget;
  return cors(
    Response.json({
      widget: publicStorefrontConfig(
        {
          ...widget,
          shippingRules: productWidget.shippingRules || widget.shippingRules,
          timezone: productWidget.timezone || widget.timezone,
        },
        withDelivery[0].delivery,
        options,
      ),
    }),
  );
};

export const action = loader;
