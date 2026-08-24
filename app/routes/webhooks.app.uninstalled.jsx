import { authenticate } from "../shopify.server";
import prisma from "../lib/prisma.server";
import { claimWebhook } from "../services/shopify/webhooks.server";
import { markMerchantUninstalled } from "../services/shopify/merchant.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();

  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  } else {
    await prisma.session.deleteMany({ where: { shop } });
  }

  await markMerchantUninstalled(shop);
  return new Response();
};
