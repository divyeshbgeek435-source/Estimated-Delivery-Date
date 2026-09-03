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
    <div className="edd-card edd-widget-list__table edd-analytics-table">
      <div className="edd-widget-row edd-analytics-row edd-widget-row--head">
        <span>Widget name</span>
        <span>Location</span>
        <span>Impressions</span>
        <span>Clicks</span>
        <span>Add to cart</span>
        <span>Conversion</span>
        <span>Status</span>
      </div>
      {widgets.map((widget) => {
        const metric = metrics[widget.id] || {
          impressions: 0,
          clicks: 0,
          addToCart: 0,
          conversionRate: 0,
        };
        const active = widget.status === WIDGET_STATUSES.ACTIVE;
        return (
          <div key={widget.id} className="edd-widget-row edd-analytics-row">
            <AppLink to={`/app/widgets/${widget.id}?tab=conditions`}>{widget.name}</AppLink>
            <span>{locationLabel(widget.location)}</span>
            <span>{metric.impressions}</span>
            <span>{metric.clicks}</span>
            <span>{metric.addToCart || 0}</span>
            <span>{metric.conversionRate}%</span>
            <span>
              <s-badge tone={active ? "success" : widget.status === WIDGET_STATUSES.SCHEDULED ? "info" : "neutral"}>
                {statusLabel(widget.status)}
              </s-badge>
            </span>
          </div>
        );
      })}
    </div>
  );
}
