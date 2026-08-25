import { useEffect, useState } from "preact/hooks";

function applyTags(template, delivery) {
  return String(template || "").replace(/\{([a-z_]+)\}/gi, (match, key) =>
    Object.prototype.hasOwnProperty.call(delivery || {}, key)
      ? String(delivery[key] ?? "")
      : match,
  );
}

function slotForPosition(position) {
  if (position === "AFTER_SHIPPING") return "shipping";
  if (position === "THANK_YOU") return "thankyou";
  return "checkout";
}

export function DeliveryBanner({ slot, trackConversion = false }) {
  const [heading, setHeading] = useState("Estimated Delivery");
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const metafields = shopify.appMetafields?.value || [];
      const field = metafields.find((item) => item.key === "checkout_widget");
      let widget = null;
      if (field?.value) {
        try {
          widget = typeof field.value === "string" ? JSON.parse(field.value) : field.value;
        } catch {
          widget = null;
        }
      }

      try {
        const token = await shopify.sessionToken.get();
        const country = shopify.billingAddress?.value?.countryCode || shopify.shippingAddress?.value?.countryCode || "";
        const params = country ? `?country=${encodeURIComponent(country)}` : "";
        const response = await fetch(`/api/widget/checkout-config${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          widget = data.widget || null;
        }
      } catch {
        // Fall back to the shop metafield when the live config request fails.
      }

      if (trackConversion && widget?.id) {
        try {
          const token = await shopify.sessionToken.get();
          await fetch("/api/widget/events", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              widgetId: widget.id,
              type: "CONVERSION",
              eventKey: shopify.checkoutToken
                ? `${shopify.shop.myshopifyDomain}:${shopify.checkoutToken}:${widget.id}:conversion`
                : undefined,
            }),
          });
        } catch {
          // Conversion tracking is best-effort.
        }
      }

      if (!active) return;
      const position = widget?.placement?.position || "CHECKOUT_BLOCK";
      if (slotForPosition(position) !== slot) {
        setReady(true);
        return;
      }
      if (!widget) {
        setReady(true);
        return;
      }
      const template =
        widget.checkout?.message ||
        widget.message ||
        "You'll receive your package between {delivery_from} to {delivery_to}";
      setHeading(widget.checkout?.heading || widget.heading || "Estimated Delivery");
      setText(applyTags(template, widget.delivery));
      setReady(true);
    }

    load();
    return () => {
      active = false;
    };
  }, [slot, trackConversion]);

  if (!ready) {
    return <s-spinner accessibilityLabel="Loading estimated delivery"></s-spinner>;
  }
  if (!text) return null;

  return (
    <s-banner heading={heading}>
      <s-text>{text}</s-text>
    </s-banner>
  );
}
