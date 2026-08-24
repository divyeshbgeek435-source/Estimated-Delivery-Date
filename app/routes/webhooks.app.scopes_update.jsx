import { authenticate } from "../shopify.server";
import prisma from "../lib/prisma.server";
import { claimWebhook } from "../services/shopify/webhooks.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  const { duplicate } = await claimWebhook(request, topic, shop);
  if (duplicate) return new Response();

  const current = payload.current;
  if (session) {
    await prisma.session.updateMany({
      where: { id: session.id },
      data: { scope: current.toString() },
    });
  }

  return new Response();
};
