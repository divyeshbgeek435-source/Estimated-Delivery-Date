import { requireAdmin } from "../lib/auth.server";
import { loadEditorLinks, loadLiveAppEmbedStatus } from "../services/shopify/app-embed.server";

export const loader = async ({ request }) => {
  const { admin, shop, session } = await requireAdmin(request);
  const result = await loadLiveAppEmbedStatus(admin, shop, session);
  const links = await loadEditorLinks(admin, shop, result.themeId);
  return {
    appEmbedEnabled: result.enabled,
    missingThemeAccess: Boolean(result.missingThemeAccess),
    ...links,
  };
};
