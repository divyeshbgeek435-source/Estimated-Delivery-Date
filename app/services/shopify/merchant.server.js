import prisma from "../../lib/prisma.server";
import { resolveTimeZone } from "../../lib/timezone";

const SHOP_TIMEZONE_QUERY = `#graphql
  query DeliveryDateShopTimezone {
    shop {
      ianaTimezone
    }
  }
`;

export async function fetchShopIanaTimezone(admin) {
  if (!admin?.graphql) return "";
  try {
    const response = await admin.graphql(SHOP_TIMEZONE_QUERY);
    const json = await response.json();
    return String(json.data?.shop?.ianaTimezone || "").trim();
  } catch {
    return "";
  }
}

export async function shopTimezoneForMerchant(admin, merchant) {
  const fromShop = await fetchShopIanaTimezone(admin);
  const resolved = resolveTimeZone(fromShop || merchant?.timezone);
  if (merchant?.id && merchant.timezone !== resolved) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { timezone: resolved },
    });
  }
  return resolved;
}

export async function ensureMerchant(shopDomain) {
  const canonical = shopDomainVariants(shopDomain)[0] || String(shopDomain || "").trim();
  const existing = await findMerchantRecord(canonical);
  if (existing) {
    if (existing.uninstalledAt) {
      return prisma.merchant.update({
        where: { id: existing.id },
        data: { uninstalledAt: null },
      });
    }
    return existing;
  }
  return prisma.merchant.upsert({
    where: { shopDomain: canonical },
    update: { uninstalledAt: null },
    create: { shopDomain: canonical },
  });
}

export function shopDomainVariants(shopDomain) {
  const raw = String(shopDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  if (!raw) return [];
  const full = raw.includes(".") ? raw : `${raw}.myshopify.com`;
  const handle = full.replace(/\.myshopify\.com$/i, "");
  return [...new Set([full, raw, handle, `${handle}.myshopify.com`, String(shopDomain || "").trim()].filter(Boolean))];
}

async function findMerchantRecord(shopDomain) {
  const variants = shopDomainVariants(shopDomain);
  if (!variants.length) return null;
  return prisma.merchant.findFirst({
    where: { shopDomain: { in: variants } },
  });
}

export async function findMerchantByShopDomain(shopDomain) {
  const merchant = await findMerchantRecord(shopDomain);
  if (!merchant || merchant.uninstalledAt) return null;
  return merchant;
}

const MERCHANT_CACHE_MS = 20_000;
const merchantCache = new Map();

export async function getMerchantByShop(shopDomain) {
  const key = String(shopDomain || "").trim().toLowerCase();
  const cached = merchantCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.merchant;

  const existing = await findMerchantByShopDomain(shopDomain);
  const merchant = existing || (await ensureMerchant(shopDomain));
  if (key && merchant) {
    merchantCache.set(key, { merchant, expires: Date.now() + MERCHANT_CACHE_MS });
  }
  return merchant;
}

export async function markMerchantUninstalled(shopDomain) {
  for (const key of shopDomainVariants(shopDomain)) {
    merchantCache.delete(key.toLowerCase());
  }
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
