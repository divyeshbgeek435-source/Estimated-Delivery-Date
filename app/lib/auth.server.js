import { authenticate } from "../shopify.server";
import { getMerchantByShop, syncMerchantProfile } from "../services/shopify/merchant.server";
import { getWidgetForMerchant, getWidgetForSave } from "../services/widgets/widget.server";

export async function requireAdmin(request) {
  const { admin, session, redirect, sessionToken } = await authenticate.admin(request);
  const existing = await getMerchantByShop(session.shop);
  const merchant =
    (await syncMerchantProfile({ admin, session, sessionToken, merchant: existing })) || existing;
  return { admin, session, merchant, shop: session.shop, redirect };
}

export async function requireWidget(request, widgetId, options = {}) {
  const context = await requireAdmin(request);
  const widget = options.fast
    ? await getWidgetForSave(context.merchant.id, widgetId)
    : await getWidgetForMerchant(context.merchant.id, widgetId);
  if (!widget) {
    throw new Response("Widget not found", { status: 404 });
  }
  return { ...context, widget };
}
