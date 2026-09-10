import { useEffect, useMemo, useState } from "react";
import { locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { AppLink } from "../common/AppLink";

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
  const left = sortValue(a, sortKey);
  const right = sortValue(b, sortKey);
  let result = 0;
  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  }
  return sortDir === "asc" ? result : -result;
}

function pageList(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

function SortableHeader({ column, sortKey, sortDir, onSort }) {
  const active = sortKey === column.key;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  const headerProps = {
    listSlot: column.listSlot,
    ...(column.format ? { format: column.format } : {}),
    "aria-sort": ariaSort,
  };
  return (
    <s-table-header {...headerProps}>
      <button
        type="button"
        className={`edd-table-sort${active ? " edd-table-sort--active" : ""}`}
        onClick={() => onSort(column.key)}
        aria-label={`Sort by ${column.label}${active ? `, ${sortDir === "asc" ? "ascending" : "descending"}` : ""}`}
      >
        <span>{column.label}</span>
        <span className="edd-table-sort__icon" aria-hidden="true">
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </s-table-header>
  );
}

function TablePagination({ page, totalPages, pages, onPageChange }) {
  return (
    <nav className="edd-table-pagination" aria-label="Widget table pagination">
      <button
        type="button"
        className="edd-btn edd-table-pagination__nav"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </button>
      <div className="edd-table-pagination__pages">
        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1];
          const gap = previous != null && pageNumber - previous > 1;
          return (
            <span key={pageNumber} className="edd-table-pagination__page-wrap">
              {gap ? <span className="edd-table-pagination__ellipsis">…</span> : null}
              <button
                type="button"
                className={`edd-table-pagination__page${
                  pageNumber === page ? " edd-table-pagination__page--active" : ""
                }`}
                aria-current={pageNumber === page ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
      </div>
      <button
        type="button"
        className="edd-btn edd-table-pagination__nav"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        Next
      </button>
    </nav>
  );
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
          const haystack = [
            widget.name,
            locationLabel(widget.location),
            statusLabel(widget.status),
            metric.impressions,
            metric.clicks,
            metric.addToCart || 0,
            `${metric.conversionRate}%`,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(needle);
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
  const pages = pageList(totalPages, page);
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
        <s-search-field
          slot="filters"
          label="Search widgets"
          name="widgetTableQuery"
          value={query}
          placeholder="Search by name, location, or status"
          labelAccessibilityVisibility="exclusive"
          onInput={(event) => setQuery(event.currentTarget.value || "")}
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
              <s-table-cell>—</s-table-cell>
              <s-table-cell>—</s-table-cell>
              <s-table-cell>—</s-table-cell>
              <s-table-cell>—</s-table-cell>
              <s-table-cell>—</s-table-cell>
              <s-table-cell>—</s-table-cell>
            </s-table-row>
          )}
        </s-table-body>
      </s-table>

      {showPagination ? (
        <TablePagination page={page} totalPages={totalPages} pages={pages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}
