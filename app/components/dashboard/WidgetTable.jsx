import { locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { AppLink } from "../common/AppLink";

function statusLabel(status) {
  if (status === WIDGET_STATUSES.ACTIVE) return "Live";
  if (status === WIDGET_STATUSES.SCHEDULED) return "Scheduled";
  if (status === WIDGET_STATUSES.DRAFT) return "Not published";
  return "Unpublished";
}

export function WidgetTable({ widgets, metrics }) {
  return (
    <s-table variant="auto">
      <s-table-header-row>
        <s-table-header listSlot="primary">Widget name</s-table-header>
        <s-table-header listSlot="labeled">Location</s-table-header>
        <s-table-header listSlot="labeled" format="numeric">
          Impressions
        </s-table-header>
        <s-table-header listSlot="labeled" format="numeric">
          Clicks
        </s-table-header>
        <s-table-header listSlot="labeled" format="numeric">
          Add to cart
        </s-table-header>
        <s-table-header listSlot="labeled" format="numeric">
          Conversion
        </s-table-header>
        <s-table-header listSlot="inline">Status</s-table-header>
      </s-table-header-row>
      <s-table-body>
        {widgets.map((widget) => {
          const metric = metrics[widget.id] || {
            impressions: 0,
            clicks: 0,
            addToCart: 0,
            conversionRate: 0,
          };
          const active = widget.status === WIDGET_STATUSES.ACTIVE;
          return (
            <s-table-row key={widget.id}>
              <s-table-cell>
                <AppLink to={`/app/widgets/${widget.id}?tab=conditions`}>{widget.name}</AppLink>
              </s-table-cell>
              <s-table-cell>{locationLabel(widget.location)}</s-table-cell>
              <s-table-cell>{metric.impressions}</s-table-cell>
              <s-table-cell>{metric.clicks}</s-table-cell>
              <s-table-cell>{metric.addToCart || 0}</s-table-cell>
              <s-table-cell>{metric.conversionRate}%</s-table-cell>
              <s-table-cell>
                <s-badge
                  tone={
                    active ? "success" : widget.status === WIDGET_STATUSES.SCHEDULED ? "info" : "neutral"
                  }
                >
                  {statusLabel(widget.status)}
                </s-badge>
              </s-table-cell>
            </s-table-row>
          );
        })}
      </s-table-body>
    </s-table>
  );
}
