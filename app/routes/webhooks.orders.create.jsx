import { authenticate } from "../shopify.server";
import prisma from "../lib/prisma.server";
import { claimWebhook } from "../services/shopify/webhooks.server";
import { recordWidgetEvent } from "../services/analytics/analytics.server";
import { EVENT_TYPES, WIDGET_STATUSES } from "../lib/constants";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();

  const orderGid = payload?.admin_graphql_api_id;
  if (!orderGid) return new Response();

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: shop },
  });
  if (!merchant || merchant.uninstalledAt) return new Response();

  const widgets = await prisma.widget.findMany({
    where: { merchantId: merchant.id, status: WIDGET_STATUSES.ACTIVE },
    select: { id: true },
  });

  await Promise.all(
    widgets.map((widget) =>
      recordWidgetEvent({
        widgetId: widget.id,
        merchantId: merchant.id,
        type: EVENT_TYPES.CONVERSION,
        eventKey: `${shop}:${orderGid}:${widget.id}:conversion`,
        metadata: { orderId: orderGid },
      }),
    ),
  );

  return new Response();
};
