import { authenticate } from "../shopify.server";
import { editorLinksForShop, loadLiveAppEmbedStatus, clearAppEmbedStatusCache } from "../services/shopify/app-embed.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  if (fresh) clearAppEmbedStatusCache(shop);

  const result = await loadLiveAppEmbedStatus(admin, shop, session, { fresh });
  return {
    appEmbedEnabled: Boolean(result.checked) && Boolean(result.enabled),
    missingThemeAccess: Boolean(result.missingThemeAccess),
    ...editorLinksForShop(shop, result.themeId),
  };
};
