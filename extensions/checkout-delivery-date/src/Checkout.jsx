import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { DeliveryBanner } from "./DeliveryBanner.jsx";

export default function extension() {
  render(<DeliveryBanner slot="checkout" />, document.body);
}
