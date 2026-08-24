import { authenticate } from "../shopify.server";
import { markAppEmbedPing } from "../services/shopify/app-embed.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (session?.shop) markAppEmbedPing(session.shop);
  } catch {
    // Ping is best-effort and must not affect the storefront.
  }
  return new Response(null, { status: 204 });
};
