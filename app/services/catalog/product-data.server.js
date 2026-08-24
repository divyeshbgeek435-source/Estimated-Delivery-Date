import prisma from "../../lib/prisma.server";
import { DEFAULT_WEIGHT_RULES } from "../../lib/constants";
import { normalizeWeightRules } from "../../lib/pincode";

function productId(product = {}) {
  return String(product.id || product.shopifyProductId || "").trim();
}

function productRecord(merchantId, product, extras = {}) {
  const shopifyProductId = productId(product);
  const weightRules = extras.weightRules
    ? normalizeWeightRules(extras.weightRules)
    : normalizeWeightRules(product.weightRules || DEFAULT_WEIGHT_RULES);
  return {
    merchantId,
    shopifyProductId,
    handle: String(product.handle || "").trim(),
    title: String(product.title || "").trim(),
    status: String(product.status || "").trim(),
    image: String(product.image || product.featuredImage?.url || "").trim(),
    weightValue: String(weightRules.value || product.weightValue || "").trim(),
    weightUnit: String(weightRules.unit || product.weightUnit || "kg"),
    weightRules,
    widgetId: extras.widgetId || product.widgetId || null,
  };
}

export async function upsertMerchantProducts(merchantId, products = [], extras = {}) {
  if (!merchantId || !Array.isArray(products) || !products.length) return 0;

  const rows = products
    .map((product) => productRecord(merchantId, product, extras))
    .filter((row) => row.shopifyProductId);

  await Promise.all(
    rows.map((row) =>
      prisma.productData.upsert({
        where: {
          merchantId_shopifyProductId: {
            merchantId: row.merchantId,
            shopifyProductId: row.shopifyProductId,
          },
        },
        create: row,
        update: {
          handle: row.handle,
          title: row.title,
          status: row.status,
          image: row.image,
          weightValue: row.weightValue,
          weightUnit: row.weightUnit,
          weightRules: row.weightRules,
          widgetId: row.widgetId,
        },
      }),
    ),
  );

  return rows.length;
}

export async function listMerchantProducts(merchantId) {
  if (!merchantId) return [];
  return prisma.productData.findMany({
    where: { merchantId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMerchantProduct(merchantId, shopifyProductId) {
  if (!merchantId || !shopifyProductId) return null;
  return prisma.productData.findUnique({
    where: {
      merchantId_shopifyProductId: { merchantId, shopifyProductId },
    },
  });
}

export async function backfillProductData(merchantId) {
  if (!merchantId) return 0;

  const existing = await prisma.productData.count({ where: { merchantId } });
  const placements = await prisma.placementConfig.findMany({
    where: { widget: { merchantId } },
    select: {
      widgetId: true,
      products: true,
      widget: {
        select: {
          shippingRules: { select: { weightRules: true } },
        },
      },
    },
  });

  let saved = 0;
  for (const placement of placements) {
    const products = Array.isArray(placement.products) ? placement.products : [];
    if (!products.length) continue;
    saved += await upsertMerchantProducts(merchantId, products, {
      widgetId: placement.widgetId,
      weightRules: placement.widget?.shippingRules?.weightRules,
    });
  }

  if (existing > 0 && saved === 0) return existing;
  return saved;
}
