import prisma from "../../lib/prisma.server";

export async function claimWebhook(request, topic, shop) {
  const webhookId = request.headers.get("x-shopify-webhook-id");
  if (!webhookId) return { duplicate: false, webhookId: `${topic}:${shop}:${Date.now()}` };

  const existing = await prisma.processedWebhook.findUnique({
    where: { webhookId },
    select: { id: true },
  });
  if (existing) return { duplicate: true, webhookId };

  await prisma.processedWebhook.create({
    data: { webhookId, topic, shop },
  });
  return { duplicate: false, webhookId };
}
