import { locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { ActionButton } from "../common/ActionButton";
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

const METRIC_ICONS = {
  impressions: { type: "data-presentation", tone: "teal" },
  clicks: { type: "cursor", tone: "blue" },
  addToCart: { type: "cart", tone: "green" },
  conversionRate: { type: "order", tone: "amber" },
  "Click-through rate": { type: "data-presentation", tone: "teal" },
  "Add-to-cart rate": { type: "cart", tone: "green" },
  "Top widget": { type: "product", tone: "amber" },
  "Live widgets": { type: "product", tone: "green" },
  "Pending requests": { type: "delivery", tone: "amber" },
};

function MetricTile({ label, value, help, iconType = "data-presentation", iconTone = "green" }) {
  return (
    <article className="edd-metric-card">
      <div className="edd-metric-card__head">
        <h3 className="edd-metric-card__label">{label}</h3>
        <span className={`edd-metric-card__icon edd-metric-card__icon--${iconTone}`} aria-hidden="true">
          <s-icon type={iconType} />
        </span>
      </div>
      <p className="edd-metric-card__value">{value}</p>
      <p className="edd-metric-card__help">{help}</p>
    </article>
  );
}

function MetricsRow({ items }) {
  if (!items.length) return null;
  const countClass =
    items.length === 3 ? " edd-metrics-grid--3" : items.length === 5 ? " edd-metrics-grid--5" : "";

  return (
    <div className={`edd-metrics-grid${countClass}`}>
      {items.map((item) => {
        const icon = METRIC_ICONS[item.key] || METRIC_ICONS[item.label] || { type: "data-presentation", tone: "green" };
        return (
          <MetricTile
            key={item.label}
            label={item.label}
            value={item.value}
            help={item.help}
            iconType={icon.type}
            iconTone={icon.tone}
          />
        );
      })}
    </div>
  );
}

export function AnalyticsHome({ widgets, totals, metrics, pendingRequests = 0 }) {
  const insights = buildInsights(totals, widgets, metrics, pendingRequests);
  const conversionHelp =
    totals.conversions > 0
      ? `${totals.conversions} order${totals.conversions === 1 ? "" : "s"} after widget interaction`
      : METRICS[3].help;

  const performance = METRICS.map((card) => ({
    key: card.key,
    label: card.label,
    value: card.key === "conversionRate" ? percent(totals[card.key]) : totals[card.key] || 0,
    help: card.key === "conversionRate" ? conversionHelp : card.help,
  }));

  return (
    <s-page heading="Analytics">
      <s-paragraph color="subdued">
        Impressions, clicks, add to cart, and conversions from the last 30 days. Events store no customer names,
        emails, phones, or addresses.
      </s-paragraph>

      <div className="edd-page edd-page--wide">
      <s-stack gap="large">
        <s-section heading="Store performance" padding="base">
          <MetricsRow items={performance} />
        </s-section>

        <s-section heading="Insights" padding="base">
          <MetricsRow items={insights} />
        </s-section>

        <s-section heading="Widget performance" padding="none">
          <ActionButton slot="primary-action" variant="secondary" icon="plus" to="/app/widgets/new">
            {widgets.length ? "Create widget" : "Create new widget"}
          </ActionButton>
          {widgets.length ? (
            <WidgetTable widgets={widgets} metrics={metrics} />
          ) : (
            <s-box padding="base">
              <s-empty-state heading="No widgets yet">
                <s-text slot="subheading">
                  Create one to start collecting delivery analytics.
                </s-text>
                <ActionButton slot="primary-action" variant="primary" icon="plus" to="/app/widgets/new">
                  Create widget
                </ActionButton>
              </s-empty-state>
            </s-box>
          )}
        </s-section>
      </s-stack>
      </div>
    </s-page>
  );
}
