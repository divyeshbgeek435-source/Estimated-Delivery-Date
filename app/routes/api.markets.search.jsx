import { authenticate } from "../shopify.server";
import { searchQuerySchema } from "../lib/validation";
import { searchMarkets } from "../services/shopify/catalog.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const parsed = searchQuerySchema.safeParse({
    q: url.searchParams.get("q") || "",
  });

  if (!parsed.success) {
    return { nodes: [], error: "Invalid search" };
  }

  return searchMarkets(admin, parsed.data);
};
