import prisma from "../../lib/prisma.server";

export async function ensureMerchant(shopDomain) {
  return prisma.merchant.upsert({
    where: { shopDomain },
    update: { uninstalledAt: null },
    create: { shopDomain },
  });
}

export async function getMerchantByShop(shopDomain) {
  const existing = await prisma.merchant.findUnique({
    where: { shopDomain },
  });
  if (existing && !existing.uninstalledAt) return existing;
  return ensureMerchant(shopDomain);
}

export async function markMerchantUninstalled(shopDomain) {
  await prisma.merchant.updateMany({
    where: { shopDomain },
    data: { uninstalledAt: new Date() },
  });
}

export async function deleteMerchantData(shopDomain) {
  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain },
    select: { id: true },
  });

  if (!merchant) return;

  await prisma.$transaction([
    prisma.widgetEvent.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.deliveryRequest.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.widget.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.session.deleteMany({ where: { shop: shopDomain } }),
    prisma.merchant.delete({ where: { id: merchant.id } }),
  ]);
}
