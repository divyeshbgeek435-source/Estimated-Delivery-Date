import { authenticate } from "../shopify.server";
import { getActiveStorefrontWidgets } from "../services/widgets/widget.server";
import { createDeliveryRequest } from "../services/widgets/delivery-requests.server";
import { parseIdList, pickStorefrontWidget } from "../lib/form.server";
import { digitsOnly, normalizePincode } from "../lib/pincode";
import { WIDGET_LOCATIONS } from "../lib/constants";

function pick(source, key) {
  const value = source?.[key];
  return value == null || value === "" ? undefined : String(value);
}

async function readPayload(request) {
  const url = new URL(request.url);
  const fromQuery = {
    widgetId: pick(Object.fromEntries(url.searchParams), "widgetId"),
    pincode: pick(Object.fromEntries(url.searchParams), "pincode"),
    productId: pick(Object.fromEntries(url.searchParams), "productId"),
    productTitle: pick(Object.fromEntries(url.searchParams), "productTitle") || pick(Object.fromEntries(url.searchParams), "productName"),
    collectionIds: pick(Object.fromEntries(url.searchParams), "collectionIds"),
  };
  if (request.method === "GET" || request.method === "HEAD") return fromQuery;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => ({}));
    return { ...fromQuery, ...json };
  }
  if (contentType.includes("form") || contentType.includes("urlencoded")) {
    const form = await request.formData().catch(() => null);
    if (form) {
      return {
        widgetId: pick({ widgetId: form.get("widgetId") }, "widgetId") || fromQuery.widgetId,
        pincode: pick({ pincode: form.get("pincode") }, "pincode") || fromQuery.pincode,
        productId: pick({ productId: form.get("productId") }, "productId") || fromQuery.productId,
        productTitle:
          pick({ productTitle: form.get("productTitle") || form.get("productName") }, "productTitle") ||
          fromQuery.productTitle,
        collectionIds: pick({ collectionIds: form.get("collectionIds") }, "collectionIds") || fromQuery.collectionIds,
      };
    }
  }

  const text = await request.text().catch(() => "");
  if (!text) return fromQuery;
  try {
    return { ...fromQuery, ...JSON.parse(text) };
  } catch {
    const params = Object.fromEntries(new URLSearchParams(text));
    return {
      widgetId: pick(params, "widgetId") || fromQuery.widgetId,
      pincode: pick(params, "pincode") || fromQuery.pincode,
      productId: pick(params, "productId") || fromQuery.productId,
      productTitle: pick(params, "productTitle") || pick(params, "productName") || fromQuery.productTitle,
      collectionIds: pick(params, "collectionIds") || fromQuery.collectionIds,
    };
  }
}

export const action = async ({ request }) => {
  let shop;
  try {
    const context = await authenticate.public.appProxy(request);
    shop = context.session?.shop;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!shop) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await readPayload(request);
  const code = normalizePincode(digitsOnly(payload.pincode));
  if (!code) return Response.json({ error: "Enter a pincode." }, { status: 400 });

  const widgets = await getActiveStorefrontWidgets(shop, WIDGET_LOCATIONS.PRODUCT);
  const collectionIds = parseIdList(payload.collectionIds);
  const widget =
    (payload.widgetId && widgets.find((item) => item.id === payload.widgetId)) ||
    pickStorefrontWidget(widgets, { productId: payload.productId, collectionIds });
  if (!widget) return Response.json({ error: "Widget not found" }, { status: 404 });

  try {
    const created = await createDeliveryRequest({
      merchantId: widget.merchantId,
      widgetId: widget.id,
      pincode: code,
      country: widget.shippingRules?.pincodeRules?.country || "IN",
      productId: payload.productId || "",
      productTitle: payload.productTitle || "",
    });
    return Response.json({ ok: true, id: created?.id ? String(created.id) : "saved" });
  } catch (error) {
    console.error("createDeliveryRequest failed", error);
    return Response.json({ error: error?.message || "Could not save the delivery request." }, { status: 500 });
  }
};

export const loader = async ({ request }) => {
  if (request.method === "HEAD") return new Response(null, { status: 204 });
  return action({ request });
};
