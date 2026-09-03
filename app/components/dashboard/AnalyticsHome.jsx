import { locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { AppLink } from "../common/AppLink";
import { WidgetTable } from "./WidgetTable";

const METRICS = [
  { key: "impressions", label: "Impressions", help: "Total widget views" },
  { key: "clicks", label: "Clicks", help: "Total widget interactions" },
  { key: "addToCart", label: "Add to cart", help: "Adds after seeing the widget" },
  { key: "conversionRate", label: "Conversion rate", help: "Orders after widget interaction" },
];

function percent(value) {
  return `${Number(value || 0)}%`;
}

function buildInsights(totals, widgets, metrics, pendingRequests) {
  const ranked = widgets
    .map((widget) => ({
      widget,
      metric: metrics[widget.id] || { impressions: 0 },
    }))
    .sort((a, b) => (b.metric.impressions || 0) - (a.metric.impressions || 0));
  const top = ranked[0];
  const live = widgets.filter((widget) => widget.status === WIDGET_STATUSES.ACTIVE).length;

  return [
    {
      label: "Click-through rate",
      value: percent(totals.clickThroughRate),
      help: "Clicks ÷ impressions, last 30 days",
    },
    {
      label: "Add-to-cart rate",
      value: percent(totals.addToCartRate),
      help: "Adds ÷ impressions, last 30 days",
    },
    {
      label: "Top widget",
      value: top?.widget?.name || "—",
      help: top?.metric?.impressions
        ? `${top.metric.impressions} impressions · ${locationLabel(top.widget.location)}`
        : "No events yet",
    },
    {
      label: "Live widgets",
      value: live,
      help: `${widgets.length} total widget${widgets.length === 1 ? "" : "s"}`,
    },
    {
      label: "Pending requests",
      value: pendingRequests,
      help: "Pincode delivery requests waiting",
    },
  ];
}

function MetricCard({ label, value, help }) {
  return (
    <div className="edd-card edd-metric-card">
      <p className="edd-impressions__label">{label}</p>
      <p className="edd-impressions__value">{value}</p>
      <p className="edd-impressions__help">{help}</p>
    </div>
  );
}

export function AnalyticsHome({ widgets, totals, metrics, pendingRequests = 0 }) {
  const insights = buildInsights(totals, widgets, metrics, pendingRequests);
  const conversionHelp =
    totals.conversions > 0
      ? `${totals.conversions} order${totals.conversions === 1 ? "" : "s"} after widget interaction`
      : METRICS[3].help;

  return (
    <s-page heading="Analytics">
      <s-paragraph>
        Impressions, clicks, add to cart, and conversions from the last 30 days. Events store no
        customer names, emails, phones, or addresses.
      </s-paragraph>

      <div className="edd-page edd-page--wide">
        <section className="edd-widget-list">
          <h2 className="edd-widget-list__heading">Store performance</h2>
          <div className="edd-metrics">
            {METRICS.map((card) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={card.key === "conversionRate" ? percent(totals[card.key]) : totals[card.key] || 0}
                help={card.key === "conversionRate" ? conversionHelp : card.help}
              />
            ))}
          </div>
        </section>

        <section className="edd-widget-list">
          <h2 className="edd-widget-list__heading">Insights</h2>
          <div className="edd-insights">
            {insights.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} help={card.help} />
            ))}
          </div>
        </section>

        <section className="edd-widget-list">
          <div className="edd-widget-list__heading-row">
            <h2 className="edd-widget-list__heading">Widget performance</h2>
            <AppLink to="/app/widgets/new">{widgets.length ? "Create widget" : "Create new widget"}</AppLink>
          </div>
          {widgets.length ? (
            <WidgetTable widgets={widgets} metrics={metrics} />
          ) : (
            <div className="edd-card edd-widget-list__table">
              <div className="edd-widget-row edd-widget-row--empty">
                <span>No widgets yet. Create one to start collecting delivery analytics.</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </s-page>
  );
}
