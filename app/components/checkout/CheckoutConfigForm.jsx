import { MessageIconsForm } from "../message/MessageIconsForm";
import { StyleForm } from "../styling/StyleForm";
import { ShippingSummary } from "../cart/CartConfigForm";

export function CheckoutConfigForm({
  widget,
  checkout,
  onMessageChange,
  onStyleChange,
  errors,
}) {
  return (
    <s-stack gap="large">
      <ShippingSummary shipping={widget.shippingRules} widgetId={widget.id} />
      <s-banner tone="info">
        Checkout uses Shopify Checkout Extensibility. Processing and transit rules stay shared. Message, icons, and design can be unique to checkout.
      </s-banner>
      <MessageIconsForm
        message={{ heading: checkout.heading, template: checkout.template }}
        icons={{
          purchased: checkout.purchasedIcon,
          processing: checkout.processingIcon,
          delivered: checkout.deliveredIcon,
        }}
        onMessageChange={(message) => onMessageChange(message)}
        onIconsChange={(icons) => onMessageChange(undefined, icons)}
        errors={errors}
      />
      <StyleForm style={checkout} onChange={onStyleChange} errors={errors} />
    </s-stack>
  );
}
