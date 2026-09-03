import { authenticate } from "../shopify.server";
import { widgetEventSchema } from "../lib/validation";
import { getWidgetByShop } from "../services/widgets/widget.server";
import { recordWidgetEvent } from "../services/analytics/analytics.server";

async function identifyShop(request) {
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (session?.shop) return { shop: session.shop, cors: null };
  } catch {
    // Fall through to checkout authentication.
  }

  try {
    const { sessionToken, cors } = await authenticate.public.checkout(request);
    const dest = sessionToken?.dest || "";
    const shop = dest.replace(/^https?:\/\//, "");
    return { shop, cors };
  } catch {
    return { shop: null, cors: null };
  }
}

function pick(source, key) {
  const value = source?.[key];
  return value == null || value === "" ? undefined : String(value);
}

async function readEventPayload(request) {
  const url = new URL(request.url);
  const fromQuery = {
    widgetId: pick(Object.fromEntries(url.searchParams), "widgetId"),
    type: pick(Object.fromEntries(url.searchParams), "type"),
    productId: pick(Object.fromEntries(url.searchParams), "productId"),
    eventKey: pick(Object.fromEntries(url.searchParams), "eventKey"),
  };

  if (request.method === "GET" || request.method === "HEAD") return fromQuery;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => ({}));
    return { ...fromQuery, ...json };
  }

  if (contentType.includes("form") || contentType.includes("urlencoded")) {
    const form = await request.formData().catch(() => null);
    if (!form) return fromQuery;
    return {
      widgetId: pick({ widgetId: form.get("widgetId") }, "widgetId") || fromQuery.widgetId,
      type: pick({ type: form.get("type") }, "type") || fromQuery.type,
      productId: pick({ productId: form.get("productId") }, "productId") || fromQuery.productId,
      eventKey: pick({ eventKey: form.get("eventKey") }, "eventKey") || fromQuery.eventKey,
    };
  }

  const text = await request.text().catch(() => "");
  if (!text) return fromQuery;
  try {
    return { ...fromQuery, ...JSON.parse(text) };
  } catch {
    const params = new URLSearchParams(text);
    return {
      widgetId: pick(Object.fromEntries(params), "widgetId") || fromQuery.widgetId,
      type: pick(Object.fromEntries(params), "type") || fromQuery.type,
      productId: pick(Object.fromEntries(params), "productId") || fromQuery.productId,
      eventKey: pick(Object.fromEntries(params), "eventKey") || fromQuery.eventKey,
    };
  }
}

async function handleEvent(request) {
  const { shop, cors } = await identifyShop(request);
  if (!shop) {
    return jsonWithCors({ error: "Unauthorized" }, 401, cors);
  }

  const parsed = widgetEventSchema.safeParse(await readEventPayload(request));
  if (!parsed.success) {
    console.warn("[edd] widget event rejected", parsed.error?.issues?.[0]?.message || "invalid");
    return jsonWithCors({ error: "Invalid event" }, 400, cors);
  }

  try {
    const widget = await getWidgetByShop(shop, parsed.data.widgetId);
    if (!widget) {
      console.warn("[edd] widget event unknown widget", parsed.data.widgetId, shop);
      return jsonWithCors({ error: "Unknown widget" }, 404, cors);
    }

    await recordWidgetEvent({
      widgetId: widget.id,
      merchantId: widget.merchantId,
      type: parsed.data.type,
      productId: parsed.data.productId,
      eventKey: parsed.data.eventKey,
      metadata: { source: "storefront" },
    });
  } catch (error) {
    console.warn("[edd] widget event failed", error?.message || error);
    return jsonWithCors({ error: "Could not record event" }, 500, cors);
  }

  return jsonWithCors({ ok: true }, 200, cors);
}

function jsonWithCors(body, status, cors) {
  const response = Response.json(body, { status });
  return cors ? cors(response) : response;
}

export const loader = async ({ request }) => {
  if (request.method === "HEAD") return new Response(null, { status: 204 });
  return handleEvent(request);
};
export const action = async ({ request }) => handleEvent(request);
