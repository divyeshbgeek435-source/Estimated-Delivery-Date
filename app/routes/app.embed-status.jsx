import { requireAdmin } from "../lib/auth.server";
import { WIDGET_LOCATIONS, WIDGET_STATUSES } from "../lib/constants";
import prisma from "../lib/prisma.server";
import { loadEditorLinks, loadLiveAppEmbedStatus, clearAppEmbedStatusCache } from "../services/shopify/app-embed.server";
import { syncWidgetStorefront } from "../services/shopify/store-block.server";

export const loader = async ({ request }) => {
  const { admin, shop, session, merchant } = await requireAdmin(request);
  clearAppEmbedStatusCache(shop);
  let result = await loadLiveAppEmbedStatus(admin, shop, session);

  if (merchant?.id && result.checked && !result.missingThemeAccess) {
    const liveCount = await prisma.widget.count({
      where: {
        merchantId: merchant.id,
        status: WIDGET_STATUSES.ACTIVE,
        location: { in: [WIDGET_LOCATIONS.PRODUCT, WIDGET_LOCATIONS.CART] },
      },
    });
    const shouldBeOn = liveCount > 0;
    if (shouldBeOn !== Boolean(result.enabled)) {
      await syncWidgetStorefront(admin, session, {
        merchantId: merchant.id,
        status: shouldBeOn ? WIDGET_STATUSES.ACTIVE : WIDGET_STATUSES.DRAFT,
        location: WIDGET_LOCATIONS.PRODUCT,
      });
      result = await loadLiveAppEmbedStatus(admin, shop, session);
    }
  }

  const links = await loadEditorLinks(admin, shop, result.themeId);
  return {
    appEmbedEnabled: result.enabled,
    missingThemeAccess: Boolean(result.missingThemeAccess),
    ...links,
  };
};
