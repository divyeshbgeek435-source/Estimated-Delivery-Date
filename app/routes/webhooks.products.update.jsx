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

  const placements = await prisma.placementConfig.findMany({
    where: {
      widget: { merchantId: merchant.id },
      productIds: { has: productGid },
    },
  });

  await Promise.all(
    placements.map((placement) =>
      prisma.placementConfig.update({
        where: { id: placement.id },
        data: {
          productIds: placement.productIds.filter((id) => id !== productGid),
          products: (placement.products || []).filter((item) => item.id !== productGid),
        },
      }),
    ),
  );

  return new Response();
};
