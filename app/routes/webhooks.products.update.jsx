import { authenticate } from "../shopify.server";
import prisma from "../lib/prisma.server";
import { claimWebhook } from "../services/shopify/webhooks.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();

  const productGid =
    payload?.admin_graphql_api_id ||
    (payload?.id ? `gid://shopify/Product/${payload.id}` : null);
  if (!productGid) return new Response();

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });
  if (!merchant) return new Response();

  const widgets = await prisma.widget.findMany({
    where: {
      merchantId: merchant.id,
      placementConfig: {
        is: {
          productIds: { has: productGid },
        },
      },
    },
    select: { id: true, placementConfig: true },
  });

  await Promise.all(
    widgets.map((widget) => {
      const placement = widget.placementConfig || {};
      return prisma.widget.update({
        where: { id: widget.id },
        data: {
          placementConfig: {
            update: {
              productIds: (placement.productIds || []).filter((id) => id !== productGid),
              products: (placement.products || []).filter((item) => item.id !== productGid),
            },
          },
        },
      });
    }),
  );

  return new Response();
};
