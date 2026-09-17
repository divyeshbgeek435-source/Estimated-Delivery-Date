import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { DeliveryRequestsTable } from "../common/DeliveryRequestsTable";

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

  const pendingCount = items.filter((item) => item.status === "PENDING").length;
  if (!items.length) return null;

  const act = (requestId, intent) => {
    fetcher.submit({ intent, requestId }, { method: "post" });
  };
  const busy = fetcher.state !== "idle";

  return (
    <s-section heading="Delivery requests">
      <s-paragraph color="subdued">
        Customers asked for delivery to these pincodes. Accepting a request adds it as an eligible delivery location so you
        can set weight and transit time.
      </s-paragraph>
      {pendingCount > 0 ? (
        <s-badge tone="warning" color="base" size="base">
          {pendingCount} pending
        </s-badge>
      ) : null}
      <DeliveryRequestsTable
        items={items}
        nameKey="product"
        busy={busy}
        onAccept={(item) => act(item.id, "accept-delivery-request")}
        onDecline={(item) => act(item.id, "reject-delivery-request")}
      />
    </s-section>
  );
}
