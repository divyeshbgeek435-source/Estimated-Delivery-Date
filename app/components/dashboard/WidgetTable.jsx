import { useEffect, useMemo, useState } from "react";
import { locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { HostSearchField } from "../common/ActionButton";
import { AppLink } from "../common/AppLink";
import { compareValues, SortableHeader, TablePagination } from "../common/TableControls";

const PAGE_SIZE = 5;

const COLUMNS = [
  { key: "name", label: "Widget name", listSlot: "primary" },
  { key: "location", label: "Location", listSlot: "labeled" },
  { key: "impressions", label: "Impressions", listSlot: "labeled", format: "numeric" },
  { key: "clicks", label: "Clicks", listSlot: "labeled", format: "numeric" },
  { key: "addToCart", label: "Add to cart", listSlot: "labeled", format: "numeric" },
  { key: "conversionRate", label: "Conversion", listSlot: "labeled", format: "numeric" },
  { key: "status", label: "Status", listSlot: "inline" },
];

const NUMERIC_KEYS = new Set(["impressions", "clicks", "addToCart", "conversionRate"]);

function statusLabel(status) {
  if (status === WIDGET_STATUSES.ACTIVE) return "Live";
  if (status === WIDGET_STATUSES.SCHEDULED) return "Scheduled";
  if (status === WIDGET_STATUSES.DRAFT) return "Not published";
  return "Unpublished";
}

function emptyMetric() {
  return { impressions: 0, clicks: 0, addToCart: 0, conversionRate: 0 };
}

function sortValue(row, key) {
  const { widget, metric } = row;
  switch (key) {
    case "name":
      return String(widget.name || "").toLowerCase();
    case "location":
      return locationLabel(widget.location).toLowerCase();
    case "status":
      return statusLabel(widget.status).toLowerCase();
    case "impressions":
      return Number(metric.impressions || 0);
    case "clicks":
      return Number(metric.clicks || 0);
    case "addToCart":
      return Number(metric.addToCart || 0);
    case "conversionRate":
      return Number(metric.conversionRate || 0);
    default:
      return "";
  }
}

function compareRows(a, b, sortKey, sortDir) {
  return compareValues(sortValue(a, sortKey), sortValue(b, sortKey), sortDir);
}

export function WidgetTable({ widgets = [], metrics = {} }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const mapped = widgets.map((widget) => ({
      widget,
      metric: metrics[widget.id] || emptyMetric(),
    }));

    const filtered = needle
      ? mapped.filter(({ widget, metric }) => {
          const status = statusLabel(widget.status).toLowerCase();
          const statusHit =
            status === needle ||
            status.startsWith(needle) ||
            (widget.status === WIDGET_STATUSES.ACTIVE && ["live", "published", "active"].some((item) => item.startsWith(needle))) ||
            (widget.status === WIDGET_STATUSES.DRAFT && ["draft", "unpublished", "not published"].some((item) => item.startsWith(needle))) ||
            (widget.status === WIDGET_STATUSES.SCHEDULED && ["scheduled"].some((item) => item.startsWith(needle)));
          if (statusHit) return true;
          const haystack = [
            widget.name,
            locationLabel(widget.location),
            metric.impressions,
            metric.clicks,
            metric.addToCart || 0,
            `${metric.conversionRate}%`,
          ]
            .join(" ")
            .toLowerCase();
          return new RegExp(`(?:^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(haystack);
        })
      : mapped;

    return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir));
  }, [widgets, metrics, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, sortKey, sortDir, widgets.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showPagination = rows.length > PAGE_SIZE;

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(NUMERIC_KEYS.has(key) ? "desc" : "asc");
  };

  return (
    <div className="edd-widget-table">
      <s-table variant="auto">
        <HostSearchField
          slot="filters"
          label="Search widgets"
          name="widgetTableQuery"
          value={query}
          placeholder="Search by name, location, or status"
          labelAccessibilityVisibility="exclusive"
          onChange={setQuery}
        />
        <s-table-header-row>
          {COLUMNS.map((column) => (
            <SortableHeader
              key={column.key}
              column={column}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          ))}
        </s-table-header-row>
        <s-table-body>
          {pageRows.length ? (
            pageRows.map(({ widget, metric }) => {
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
                        active
                          ? "success"
                          : widget.status === WIDGET_STATUSES.SCHEDULED
                            ? "info"
                            : "neutral"
                      }
                    >
                      {statusLabel(widget.status)}
                    </s-badge>
                  </s-table-cell>
                </s-table-row>
              );
            })
          ) : (
            <s-table-row>
              <s-table-cell>
                {query.trim() ? "No widgets match your search." : "No widgets yet."}
              </s-table-cell>
              <s-table-cell>-</s-table-cell>
              <s-table-cell>-</s-table-cell>
              <s-table-cell>-</s-table-cell>
              <s-table-cell>-</s-table-cell>
              <s-table-cell>-</s-table-cell>
              <s-table-cell>-</s-table-cell>
            </s-table-row>
          )}
        </s-table-body>
      </s-table>

      {showPagination ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          label="Widget table pagination"
        />
      ) : null}
    </div>
  );
}
