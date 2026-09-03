import { useLoaderData } from "react-router";
import { requireAdmin } from "../lib/auth.server";
import { loadDashboardAnalytics, loadWidgetAnalytics } from "../lib/analytics.server";
import { listWidgetSummaries } from "../services/widgets/widget.server";
import { countPendingDeliveryRequests } from "../services/widgets/delivery-requests.server";
import { AnalyticsHome } from "../components/dashboard/AnalyticsHome";

export const loader = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const [widgets, totals, pendingRequests] = await Promise.all([
    listWidgetSummaries(merchant.id),
    loadDashboardAnalytics(merchant.id),
    countPendingDeliveryRequests(merchant.id),
  ]);
  const metrics = await loadWidgetAnalytics(widgets.map((widget) => widget.id));

  return { widgets, totals, metrics, pendingRequests };
};

export default function AnalyticsPage() {
  const { widgets, totals, metrics, pendingRequests } = useLoaderData();

  return (
    <AnalyticsHome
      widgets={widgets}
      totals={totals}
      metrics={metrics}
      pendingRequests={pendingRequests}
    />
  );
}
