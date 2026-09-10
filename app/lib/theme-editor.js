const APP_CLIENT_ID =
  process.env.SHOPIFY_API_KEY ||
  process.env.SHOPIFY_DELIVERY_DATE_WIDGET_ID ||
  "428f3d88064e44c926da9dbde635d831";

export const APP_EMBED_HANDLE = "app-embed";
export const APP_BLOCK_HANDLE = "estimated-delivery";
export const APP_CART_BLOCK_HANDLE = "cart-estimated-delivery";

function storeHandle(shop) {
  return String(shop || "").replace(/\.myshopify\.com$/i, "");
}

function themeSegment(themeId) {
  const id = String(themeId || "").split("/").pop();
  return id && /^\d+$/.test(id) ? id : "current";
}

export function appEmbedEditorUrl(shop, { themeId, productHandle, activate = true } = {}) {
  const params = new URLSearchParams({
    template: "product",
    context: "apps",
  });
  if (activate) {
    params.set("activateAppId", `${APP_CLIENT_ID}/${APP_EMBED_HANDLE}`);
  }
  if (productHandle) {
    params.set("previewPath", `/products/${productHandle}`);
  }
  const handle = storeHandle(shop);
  return `https://admin.shopify.com/store/${handle}/themes/${themeSegment(themeId)}/editor?${params.toString()}`;
}

export function appBlockEditorUrl(shop, { themeId, productHandle, activate = true } = {}) {
  const params = new URLSearchParams({
    template: "product",
  });
  if (activate) {
    params.set("addAppBlockId", `${APP_CLIENT_ID}/${APP_BLOCK_HANDLE}`);
    params.set("target", "mainSection");
  }
  if (productHandle) {
    params.set("previewPath", `/products/${productHandle}`);
  }
  const handle = storeHandle(shop);
  return `https://admin.shopify.com/store/${handle}/themes/${themeSegment(themeId)}/editor?${params.toString()}`;
}

export function productThemeEditorUrl(shop, options = {}) {
  return appBlockEditorUrl(shop, { ...options, activate: true });
}

export function cartBlockEditorUrl(shop, { themeId, activate = true } = {}) {
  const params = new URLSearchParams({
    template: "cart",
    previewPath: "/cart",
  });
  if (activate) {
    params.set("addAppBlockId", `${APP_CLIENT_ID}/${APP_CART_BLOCK_HANDLE}`);
  }
  const handle = storeHandle(shop);
  return `https://admin.shopify.com/store/${handle}/themes/${themeSegment(themeId)}/editor?${params.toString()}`;
}

export function checkoutEditorUrl(shop, { page, position } = {}) {
  const handle = storeHandle(shop);
  if (!handle) return "";
  const editorPage = page || (position === "THANK_YOU" ? "thank-you" : "checkout");
  const params = new URLSearchParams({
    page: editorPage,
    context: "apps",
  });
  return `https://admin.shopify.com/store/${handle}/settings/checkout/editor?${params.toString()}`;
}

export function widgetThemeEditorUrl(shop, location, options = {}) {
  if (location === "CART") return cartBlockEditorUrl(shop, options);
  if (location === "CHECKOUT") return checkoutEditorUrl(shop, options);
  return productThemeEditorUrl(shop, options);
}

export { storefrontPageUrl } from "./widget-status";
