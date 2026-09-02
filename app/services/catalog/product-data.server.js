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
  const widgets = await prisma.widget.findMany({
    where: { merchantId },
    select: {
      id: true,
      placementConfig: { select: { products: true } },
      shippingRules: { select: { weightRules: true } },
    },
  });

  let saved = 0;
  for (const widget of widgets) {
    const products = Array.isArray(widget.placementConfig?.products) ? widget.placementConfig.products : [];
    if (!products.length) continue;
    saved += await upsertMerchantProducts(merchantId, products, {
      widgetId: widget.id,
      weightRules: widget.shippingRules?.weightRules,
    });
  }

  if (existing > 0 && saved === 0) return existing;
  return saved;
}
