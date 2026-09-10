import { requireAdmin } from "../lib/auth.server";
import { loadHomeImpressionTotals } from "../lib/analytics.server";
import { listMerchantDeliveryRequests } from "../services/widgets/delivery-requests.server";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export const loader = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const url = new URL(request.url);
  const part = url.searchParams.get("part") || "all";
  const fresh = url.searchParams.get("fresh") === "1";

  if (part === "totals") {
    const totals = await loadHomeImpressionTotals(merchant.id, { fresh });
    return Response.json({ totals, at: Date.now() }, { headers: NO_STORE });
  }

  if (part === "requests") {
    const deliveryRequests = await listMerchantDeliveryRequests(merchant.id);
    return Response.json({ deliveryRequests }, { headers: NO_STORE });
  }

  const [totals, deliveryRequests] = await Promise.all([
    loadHomeImpressionTotals(merchant.id, { fresh }),
    listMerchantDeliveryRequests(merchant.id),
  ]);
  return Response.json({ totals, deliveryRequests, at: Date.now() }, { headers: NO_STORE });
};
