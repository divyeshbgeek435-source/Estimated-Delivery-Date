import { authenticate } from "../shopify.server";
import { getActiveStorefrontWidgets } from "../services/widgets/widget.server";
import { buildStorefrontDelivery } from "../services/delivery/delivery-calculator.server";
import { publicStorefrontConfig } from "../services/analytics/analytics.server";
import { pickStorefrontWidget } from "../lib/form.server";
import { WIDGET_LOCATIONS } from "../lib/constants";

export const loader = async ({ request }) => {
  const { cors, sessionToken } = await authenticate.public.checkout(request);
  const shop = String(sessionToken?.dest || sessionToken?.iss || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  if (!shop) {
    return cors(Response.json({ widget: null }, { status: 401 }));
  }

  const url = new URL(request.url);
  const widgets = await getActiveStorefrontWidgets(shop, WIDGET_LOCATIONS.CHECKOUT);
  const widget = pickStorefrontWidget(widgets, {
    marketHandle: url.searchParams.get("market") || "",
    country: url.searchParams.get("country") || "",
  });
  if (!widget) {
    return cors(Response.json({ widget: null }));
  }

  const delivery = buildStorefrontDelivery(widget.shippingRules, widget.timezone, new Date(), {
    dateSettings: {
      dateFormat: widget.messageConfig?.dateFormat,
      dateSeparator: widget.messageConfig?.dateSeparator,
      includeYear: widget.messageConfig?.includeYear,
    },
  });

  return cors(
    Response.json({
      widget: publicStorefrontConfig(widget, delivery),
    }),
  );
};
