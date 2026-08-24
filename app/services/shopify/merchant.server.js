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

  const widgets = await prisma.widget.findMany({
    where: { merchantId: merchant.id },
    select: { id: true },
  });
  const widgetIds = widgets.map((widget) => widget.id);

  await prisma.$transaction([
    prisma.widgetEvent.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.shippingRules.deleteMany({ where: { widgetId: { in: widgetIds } } }),
    prisma.messageConfig.deleteMany({ where: { widgetId: { in: widgetIds } } }),
    prisma.iconConfig.deleteMany({ where: { widgetId: { in: widgetIds } } }),
    prisma.styleConfig.deleteMany({ where: { widgetId: { in: widgetIds } } }),
    prisma.placementConfig.deleteMany({ where: { widgetId: { in: widgetIds } } }),
    prisma.cartConfig.deleteMany({ where: { widgetId: { in: widgetIds } } }),
    prisma.checkoutConfig.deleteMany({ where: { widgetId: { in: widgetIds } } }),
    prisma.widget.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.session.deleteMany({ where: { shop: shopDomain } }),
    prisma.merchant.delete({ where: { id: merchant.id } }),
  ]);
}
