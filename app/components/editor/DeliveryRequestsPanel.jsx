import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";

const PAGE_SIZE = 5;

const COLUMNS = [
  { key: "product", label: "Product", listSlot: "primary" },
  { key: "pincode", label: "Pincode", listSlot: "labeled" },
  { key: "requested", label: "Requested", listSlot: "labeled" },
  { key: "status", label: "Status", listSlot: "kicker" },
];

function formatWhen(value) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function statusRank(status) {
  if (status === "PENDING") return 0;
  if (status === "ACCEPTED") return 1;
  if (status === "REJECTED") return 2;
  return 3;
}

function productLabel(item) {
  return String(item.productTitle || item.widgetName || "").trim() || "Storefront request";
}

function sortValue(item, key) {
  switch (key) {
    case "product":
      return productLabel(item).toLowerCase();
    case "pincode":
      return String(item.pincode || "");
    case "requested":
      return new Date(item.createdAt || 0).getTime() || 0;
    case "status":
      return statusRank(item.status);
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
    result = String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    });
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
  return (
    <s-table-header listSlot={column.listSlot} aria-sort={ariaSort}>
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

export function DeliveryRequestsPanel({ requests = [], onAccepted }) {
  const fetcher = useFetcher();
  const [items, setItems] = useState(requests);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const seen = useRef("");
  const onAcceptedRef = useRef(onAccepted);
  onAcceptedRef.current = onAccepted;

  useEffect(() => {
    setItems(requests);
  }, [requests]);

  useEffect(() => {
    if (!fetcher.data?.deliveryRequests) return;
    const key = `${fetcher.data.toast || ""}:${fetcher.data.widget?.updatedAt || ""}`;
    if (seen.current === key) return;
    seen.current = key;
    setItems(fetcher.data.deliveryRequests);
    if (fetcher.data.widget?.shippingRules) onAcceptedRef.current?.(fetcher.data.widget);
  }, [fetcher.data]);

  const pendingCount = items.filter((item) => item.status === "PENDING").length;

  const sorted = useMemo(() => {
    const rows = [...items];
    if (!sortKey) {
      return rows.sort((a, b) => {
        const byStatus = statusRank(a.status) - statusRank(b.status);
        if (byStatus) return byStatus;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }
    return rows.sort((a, b) => compareRows(a, b, sortKey, sortDir));
  }, [items, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [items.length, sortKey, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (!items.length) return null;

  const act = (requestId, intent) => {
    fetcher.submit({ intent, requestId }, { method: "post" });
  };
  const busy = fetcher.state !== "idle";
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = pageList(totalPages, page);
  const showPagination = totalPages > 1;

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <s-section heading="Delivery requests">
      {pendingCount > 0 ? (
        <s-badge tone="warning" color="base" size="base">
          {pendingCount} pending
        </s-badge>
      ) : null}
      <p className="edd-section-help">
        Customers asked for delivery to these pincodes. Accepting a request adds it as an eligible
        delivery location so you can set weight and transit time.
      </p>

      <div className="edd-request-panel">
        <s-table variant="auto" className="edd-request-table">
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
            {pageRows.map((item) => {
              const pending = item.status === "PENDING";
              const status = String(item.status || "PENDING").toLowerCase();
              const when = formatWhen(item.createdAt);
              const product = productLabel(item);
              return (
                <s-table-row
                  key={item.id}
                  className={`edd-request-row edd-request-row--${status}`}
                >
                  <s-table-cell>
                    <span className="edd-request-card__widget" title={product}>
                      {product}
                    </span>
                  </s-table-cell>
                  <s-table-cell>
                    <span className="edd-request-card__pin">{item.pincode}</span>
                  </s-table-cell>
                  <s-table-cell>
                    {when ? (
                      <span className="edd-request-card__when">
                        <s-icon type="clock" />
                        {when}
                      </span>
                    ) : (
                      <span className="edd-request-muted">—</span>
                    )}
                  </s-table-cell>
                  <s-table-cell className="edd-table-actions-cell">
                    <div className="edd-request-status-cell">
                      {pending ? (
                        <div className="edd-table-actions edd-request-actions">
                          <button
                            type="button"
                            className="edd-btn edd-btn--primary"
                            disabled={busy}
                            onClick={() => act(item.id, "accept-delivery-request")}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="edd-btn"
                            disabled={busy}
                            onClick={() => act(item.id, "reject-delivery-request")}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className={`edd-request-status edd-request-status--${status}`}>
                          <s-icon type={status === "accepted" ? "check-circle" : "x-circle"} />
                          {statusLabel(item.status)}
                        </span>
                      )}
                    </div>
                  </s-table-cell>
                </s-table-row>
              );
            })}
          </s-table-body>
        </s-table>

        {showPagination ? (
          <nav className="edd-table-pagination" aria-label="Delivery requests pagination">
            <button
              type="button"
              className="edd-btn edd-table-pagination__nav"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                      onClick={() => setPage(pageNumber)}
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
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </nav>
        ) : null}
      </div>
    </s-section>
  );
}
