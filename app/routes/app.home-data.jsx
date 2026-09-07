import { requireAdmin } from "../lib/auth.server";
import { loadDashboardAnalytics } from "../lib/analytics.server";
import { listMerchantDeliveryRequests } from "../services/widgets/delivery-requests.server";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export const loader = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const part = new URL(request.url).searchParams.get("part") || "all";

  if (part === "totals") {
    const totals = await loadDashboardAnalytics(merchant.id);
    return Response.json({ totals }, { headers: NO_STORE });
  }

  if (part === "requests") {
    const deliveryRequests = await listMerchantDeliveryRequests(merchant.id);
    return Response.json({ deliveryRequests }, { headers: NO_STORE });
  }

  const [totals, deliveryRequests] = await Promise.all([
    loadDashboardAnalytics(merchant.id),
    listMerchantDeliveryRequests(merchant.id),
  ]);
  return Response.json({ totals, deliveryRequests }, { headers: NO_STORE });
};
