import { authenticate } from "../shopify.server";
import { searchQuerySchema } from "../lib/validation";
import { searchProducts } from "../services/shopify/catalog.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const parsed = searchQuerySchema.safeParse({
    q: url.searchParams.get("q") || "",
    cursor: url.searchParams.get("cursor") || undefined,
  });

  if (!parsed.success) {
    return { nodes: [], error: "Invalid search" };
  }

  try {
    return await searchProducts(admin, parsed.data);
  } catch (error) {
    return { nodes: [], error: error.message || "Product search failed" };
  }
};
