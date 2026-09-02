import { format } from "date-fns";
import { useNavigate } from "react-router";
import { locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { ActionButton } from "../common/ActionButton";

export function AnalyticsCards({ totals }) {
  const cards = [
    { label: "Impressions", value: totals.impressions, help: "Total widget views" },
    { label: "Clicks", value: totals.clicks, help: "Total widget interactions" },
    {
      label: "Conversion rate",
      value: `${totals.conversionRate}%`,
      help: "Orders after widget interaction",
    },
    { label: "Add to cart", value: totals.addToCart, help: "Adds after seeing the widget" },
  ];

  return (
    <s-grid gridTemplateColumns="repeat(4, minmax(0, 1fr))" gap="base">
      {cards.map((card) => (
        <s-section key={card.label} heading={card.label}>
          <s-heading>{card.value}</s-heading>
          <s-paragraph color="subdued">{card.help}</s-paragraph>
        </s-section>
      ))}
    </s-grid>
  );
}

export function WidgetTable({ widgets, metrics }) {
  const navigate = useNavigate();

  if (!widgets.length) {
    return (
      <s-section accessibilityLabel="Empty state section">
        <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
          <s-box maxInlineSize="200px">
            <s-image
              aspectRatio="1/0.5"
              src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
              alt="Illustration of adding a delivery widget"
            ></s-image>
          </s-box>
          <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
            <s-stack alignItems="center">
              <s-heading>Create your first delivery widget</s-heading>
              <s-paragraph>
                Show customers when they can expect their order on product and cart pages.
              </s-paragraph>
            </s-stack>
            <ActionButton variant="primary" onClick={() => navigate("/app/widgets/new")}>
              Create delivery widget
            </ActionButton>
          </s-grid>
        </s-grid>
      </s-section>
    );
  }

  return (
    <s-section padding="none" accessibilityLabel="Widgets table">
      <s-table>
        <s-table-header-row>
          <s-table-header listSlot="primary">Widget name</s-table-header>
          <s-table-header>Location</s-table-header>
          <s-table-header>Impressions</s-table-header>
          <s-table-header>Clicks</s-table-header>
          <s-table-header>Conversion rate</s-table-header>
          <s-table-header>Status</s-table-header>
          <s-table-header>Updated</s-table-header>
          <s-table-header>Actions</s-table-header>
        </s-table-header-row>
        <s-table-body>
          {widgets.map((widget) => {
            const metric = metrics[widget.id] || {
              impressions: 0,
              clicks: 0,
              conversionRate: 0,
            };
            const active = widget.status === WIDGET_STATUSES.ACTIVE;
            return (
              <s-table-row key={widget.id}>
                <s-table-cell>
                  <button
                    type="button"
                    className="edd-widget-name"
                    onClick={() => navigate(`/app/widgets/${widget.id}?tab=conditions`)}
                  >
                    {widget.name}
                  </button>
                </s-table-cell>
                <s-table-cell>{locationLabel(widget.location)}</s-table-cell>
                <s-table-cell>{metric.impressions}</s-table-cell>
                <s-table-cell>{metric.clicks}</s-table-cell>
                <s-table-cell>{metric.conversionRate}%</s-table-cell>
                <s-table-cell>
                  <s-badge tone={active ? "success" : "neutral"}>
                    {active ? "Active" : widget.status === "SCHEDULED" ? "Scheduled" : widget.status === "DRAFT" ? "Draft" : "Inactive"}
                  </s-badge>
                </s-table-cell>
                <s-table-cell>
                  {format(new Date(widget.updatedAt), "MMM d, yyyy")}
                </s-table-cell>
                <s-table-cell>
                  <button
                    type="button"
                    className="edd-widget-name"
                    onClick={() => navigate(`/app/widgets/${widget.id}?tab=conditions`)}
                  >
                    View
                  </button>
                </s-table-cell>
              </s-table-row>
            );
          })}
        </s-table-body>
      </s-table>
    </s-section>
  );
}

