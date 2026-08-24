import { authenticate } from "../shopify.server";
import { claimWebhook } from "../services/shopify/webhooks.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();
  // This app does not store customer personal information.
  return new Response();
};
