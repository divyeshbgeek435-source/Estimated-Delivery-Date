import { authenticate } from "../shopify.server";
import { claimWebhook } from "../services/shopify/webhooks.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();
  return new Response();
};
