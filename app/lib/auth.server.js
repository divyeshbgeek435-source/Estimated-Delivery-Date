import { authenticate } from "../shopify.server";
import { getMerchantByShop } from "../services/shopify/merchant.server";
import { getWidgetForMerchant } from "../services/widgets/widget.server";

export async function requireAdmin(request) {
  const { admin, session, redirect } = await authenticate.admin(request);
  const merchant = await getMerchantByShop(session.shop);
  return { admin, session, merchant, shop: session.shop, redirect };
}

export async function requireWidget(request, widgetId) {
  const context = await requireAdmin(request);
  const widget = await getWidgetForMerchant(context.merchant.id, widgetId);
  if (!widget) {
    throw new Response("Widget not found", { status: 404 });
  }
  return { ...context, widget };
}
