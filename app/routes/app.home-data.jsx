import { requireAdmin } from "../lib/auth.server";
import { loadDashboardAnalytics } from "../lib/analytics.server";
import { listMerchantDeliveryRequests } from "../services/widgets/delivery-requests.server";

export const loader = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const [totals, deliveryRequests] = await Promise.all([
    loadDashboardAnalytics(merchant.id),
    listMerchantDeliveryRequests(merchant.id),
  ]);
  return { totals, deliveryRequests };
};
