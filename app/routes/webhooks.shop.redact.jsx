import { authenticate } from "../shopify.server";
import { claimWebhook } from "../services/shopify/webhooks.server";
import { deleteMerchantData } from "../services/shopify/merchant.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();
  await deleteMerchantData(shop);
  return new Response();
};
