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

  const placements = await prisma.placementConfig.findMany({
    where: {
      widget: { merchantId: merchant.id },
      collectionIds: { has: collectionGid },
    },
  });

  await Promise.all(
    placements.map((placement) =>
      prisma.placementConfig.update({
        where: { id: placement.id },
        data: {
          collections: (placement.collections || []).map((item) =>
            item.id === collectionGid
              ? { ...item, title: payload.title || item.title }
              : item,
          ),
        },
      }),
    ),
  );

  return new Response();
};
