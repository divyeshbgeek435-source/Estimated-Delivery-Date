import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

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

export function DeliveryRequestsPanel({ requests = [], onAccepted }) {
  const fetcher = useFetcher();
  const [items, setItems] = useState(requests);

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

  const pending = items.filter((item) => item.status === "PENDING");
  const others = items.filter((item) => item.status !== "PENDING");
  if (!items.length) return null;

  const act = (requestId, intent) => {
    fetcher.submit({ intent, requestId }, { method: "post" });
  };
  const busy = fetcher.state !== "idle";

  const renderCard = (item) => {
    const status = String(item.status || "PENDING").toLowerCase();
    const isPending = item.status === "PENDING";
    const place = [item.city, item.state].filter(Boolean).join(", ");
    return (
      <li
        key={item.id}
        className={`edd-request-card edd-request-card--${status}${isPending ? " edd-request-card--pending" : ""}`}
      >
        <div className="edd-request-card__accent" aria-hidden="true" />
        <div className="edd-request-card__main">
          <div className="edd-request-card__title-row">
            <span className="edd-request-card__pin">{item.pincode}</span>
            <span className={`edd-request-status edd-request-status--${status}`}>
              {statusLabel(item.status)}
            </span>
          </div>
          <div className="edd-request-card__meta-row">
            {item.country ? <span className="edd-request-chip">{item.country}</span> : null}
            {place ? <span className="edd-request-chip">{place}</span> : null}
            {item.productTitle ? <span className="edd-request-chip">{item.productTitle}</span> : null}
            {!item.country && !place && !item.productTitle ? (
              <span className="edd-request-chip edd-request-chip--muted">Storefront request</span>
            ) : null}
          </div>
          {item.createdAt ? <p className="edd-request-card__when">{formatWhen(item.createdAt)}</p> : null}
        </div>
        {isPending ? (
          <div className="edd-request-actions">
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
              Reject
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <s-section heading="Delivery requests">
      <s-paragraph>
        Customers asked for delivery to these pincodes. Accepting a request adds it as an eligible delivery location so you can set weight and transit time.
      </s-paragraph>
      {pending.length ? (
        <ul className="edd-request-list">{pending.map(renderCard)}</ul>
      ) : (
        <p className="edd-help">No pending delivery requests.</p>
      )}
      {others.length ? (
        <>
          <p className="edd-request-history-label">Recent decisions</p>
          <ul className="edd-request-list">{others.map(renderCard)}</ul>
        </>
      ) : null}
    </s-section>
  );
}
