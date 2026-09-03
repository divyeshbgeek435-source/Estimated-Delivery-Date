import { unauthenticated } from "../../shopify.server";
import { WIDGET_LOCATIONS } from "../../lib/constants";
import { syncCheckoutMetafield } from "./metafields.server";

/**
 * Storefront widgets load from the app proxy + Theme App Extension.
 * Do not write theme assets (Asset API is not allowed for Built for Shopify).
 */
export async function syncWidgetStorefront(admin, _session, widget) {
  if (!admin || !widget) return;
  if (widget.location !== WIDGET_LOCATIONS.CHECKOUT) return;
  try {
    await syncCheckoutMetafield(admin, widget);
  } catch (error) {
    console.warn("[edd-store-block] checkout sync failed", error?.message || error);
  }
}

export function needsThemeSync(previous, next) {
  return previous?.location === WIDGET_LOCATIONS.CHECKOUT || next?.location === WIDGET_LOCATIONS.CHECKOUT;
}

export function queueWidgetStorefrontSync(admin, session, widget) {
  if (!admin || !widget || widget.location !== WIDGET_LOCATIONS.CHECKOUT) return;
  syncWidgetStorefront(admin, session, widget).catch((error) => {
    console.warn("[edd-store-block] background sync failed", error?.message || error);
  });
}

export async function syncWidgetStorefrontByShop(shop, widget) {
  if (!shop || !widget) return;
  try {
    const { admin, session } = await unauthenticated.admin(shop);
    await syncWidgetStorefront(admin, session, widget);
  } catch (error) {
    console.warn("[edd-store-block] shop sync failed", error?.message || error);
  }
}
