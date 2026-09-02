import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

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

  return (
    <s-section heading="Delivery requests">
      <s-paragraph>
        Customers asked for delivery to these pincodes. Accepting a request adds it as an eligible delivery location so you can set weight and transit time.
      </s-paragraph>
      {pending.length ? (
        <ul className="edd-pin-list">
          {pending.map((item) => (
            <li key={item.id} className="edd-pin-list__item edd-request-item">
              <div className="edd-pin-list__copy">
                <strong>{item.pincode}</strong>
                <span>
                  {[item.city, item.state, item.productTitle].filter(Boolean).join(" · ") || "Storefront request"}
                </span>
              </div>
              <div className="edd-request-actions">
                <button
                  type="button"
                  className="edd-btn edd-btn--primary"
                  disabled={fetcher.state !== "idle"}
                  onClick={() => act(item.id, "accept-delivery-request")}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="edd-pin-list__remove"
                  disabled={fetcher.state !== "idle"}
                  onClick={() => act(item.id, "reject-delivery-request")}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="edd-help">No pending delivery requests.</p>
      )}
      {others.length ? (
        <ul className="edd-pin-list">
          {others.map((item) => (
            <li key={item.id} className="edd-pin-list__item">
              <div className="edd-pin-list__copy">
                <strong>{item.pincode}</strong>
                <span>
                  {item.status === "ACCEPTED" ? "Accepted" : "Rejected"}
                  {item.productTitle ? ` · ${item.productTitle}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </s-section>
  );
}
