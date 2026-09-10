import { authenticate } from "../shopify.server";
import {
  buildEmbedStatusPayload,
  clearAppEmbedStatusCache,
  loadLiveAppEmbedStatus,
} from "../services/shopify/app-embed.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  if (fresh) clearAppEmbedStatusCache(shop);

  const result = await loadLiveAppEmbedStatus(admin, shop, session, { fresh });
  return buildEmbedStatusPayload(shop, result);
};
