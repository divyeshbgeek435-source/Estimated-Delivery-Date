import { authenticate } from "../shopify.server";
import prisma from "../lib/prisma.server";
import { claimWebhook } from "../services/shopify/webhooks.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();

  const collectionGid =
    payload?.admin_graphql_api_id ||
    (payload?.id ? `gid://shopify/Collection/${payload.id}` : null);
  if (!collectionGid) return new Response();

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
          collectionIds: { has: collectionGid },
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
              collections: (placement.collections || []).map((item) =>
                item.id === collectionGid
                  ? { ...item, title: payload.title || item.title }
                  : item,
              ),
            },
          },
        },
      });
    }),
  );

  return new Response();
};
