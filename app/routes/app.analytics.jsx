import { useLoaderData } from "react-router";
import { requireAdmin } from "../lib/auth.server";
import { listWidgetSummaries } from "../services/widgets/widget.server";
import { loadDashboardAnalytics, loadWidgetAnalytics } from "../lib/analytics.server";
import { AnalyticsCards, WidgetTable } from "../components/dashboard/WidgetTable";

export const loader = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const widgets = await listWidgetSummaries(merchant.id);
  const [totals, metrics] = await Promise.all([
    loadDashboardAnalytics(merchant.id),
    loadWidgetAnalytics(widgets.map((widget) => widget.id)),
  ]);
  return { widgets, totals, metrics };
};

export default function AnalyticsPage() {
  const { widgets, totals, metrics } = useLoaderData();

  return (
    <s-page heading="Analytics">
      <s-paragraph>
        Widget impressions, clicks, add to cart, and conversion events. Events store no customer names, emails, phones, or addresses.
      </s-paragraph>
      <AnalyticsCards totals={totals} />
      <WidgetTable widgets={widgets} metrics={metrics} />
    </s-page>
  );
}
