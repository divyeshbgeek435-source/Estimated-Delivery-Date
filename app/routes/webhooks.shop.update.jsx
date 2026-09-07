import { authenticate } from "../shopify.server";
import { claimWebhook } from "../services/shopify/webhooks.server";
import { syncMerchantProfile } from "../services/shopify/merchant.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();
  await syncMerchantProfile({ session: { shop }, payload });
  return new Response();
};
