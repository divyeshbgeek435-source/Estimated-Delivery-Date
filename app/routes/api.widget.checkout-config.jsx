import { authenticate } from "../shopify.server";
import { getActiveStorefrontWidgets } from "../services/widgets/widget.server";
import { buildStorefrontDelivery } from "../services/delivery/delivery-calculator.server";
import { publicStorefrontConfig } from "../services/analytics/analytics.server";
import { WIDGET_LOCATIONS } from "../lib/constants";
import { isAppEmbedEnabledForShop } from "../services/shopify/app-embed.server";

export const loader = async ({ request }) => {
  const { cors, sessionToken } = await authenticate.public.checkout(request);
  const shop = String(sessionToken?.dest || "").replace(/^https?:\/\//, "");
  if (!shop) {
    return cors(Response.json({ widget: null }, { status: 401 }));
  }

  const embedEnabled = await isAppEmbedEnabledForShop(shop);
  if (!embedEnabled) {
    return cors(Response.json({ widget: null, embedEnabled: false }));
  }

  const widgets = await getActiveStorefrontWidgets(shop, WIDGET_LOCATIONS.CHECKOUT);
  const widget = widgets[0];
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
