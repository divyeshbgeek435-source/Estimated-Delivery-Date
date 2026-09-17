import { useEffect, useMemo, useState } from "react";
import { compareValues, SortableHeader, TablePagination } from "./TableControls";

const PAGE_SIZE = 5;

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

function requestName(item, nameKey) {
  if (nameKey === "widget") {
    return String(item.widgetName || "").trim() || "Untitled widget";
  }
  return String(item.productTitle || item.widgetName || "").trim() || "Storefront request";
}

function sortValue(item, key, nameKey) {
  switch (key) {
    case nameKey:
      return requestName(item, nameKey).toLowerCase();
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

export function DeliveryRequestsTable({
  items = [],
  nameKey = "product",
  busy = false,
  onAccept,
  onDecline,
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const nameLabel = nameKey === "widget" ? "Widget" : "Product";
  const columns = [
    { key: nameKey, label: nameLabel, listSlot: "primary" },
    { key: "pincode", label: "Pincode", listSlot: "labeled" },
    { key: "requested", label: "Requested", listSlot: "labeled" },
    { key: "status", label: "Status", listSlot: "kicker" },
  ];

  const sorted = useMemo(() => {
    const rows = [...items];
    if (!sortKey) {
      return rows.sort((a, b) => {
        const byStatus = statusRank(a.status) - statusRank(b.status);
        if (byStatus) return byStatus;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }
    return rows.sort((a, b) =>
      compareValues(sortValue(a, sortKey, nameKey), sortValue(b, sortKey, nameKey), sortDir),
    );
  }, [items, nameKey, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [items.length, sortKey, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
    <div className="edd-request-panel">
      <s-table variant="auto" className="edd-request-table">
        <s-table-header-row>
          {columns.map((column) => (
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
            const name = requestName(item, nameKey);
            return (
              <s-table-row key={item.id} className="edd-request-row">
                <s-table-cell>
                  <span className="edd-request-card__widget" title={name}>
                    {name}
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
                    <span className="edd-request-muted">-</span>
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
                          onClick={() => onAccept?.(item)}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="edd-btn"
                          disabled={busy}
                          onClick={() => onDecline?.(item)}
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
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          label="Delivery requests pagination"
        />
      ) : null}
    </div>
  );
}
