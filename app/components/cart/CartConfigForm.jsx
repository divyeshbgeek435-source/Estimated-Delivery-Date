import { CART_DISPLAY_MODES } from "../../lib/constants";
import {
  formatCutoffDisplay,
  formatDisplayDate,
  summarizeWorkingDays,
} from "../../lib/delivery-calculator";
import { AppLink } from "../common/AppLink";
import { HostChoiceList } from "../common/ActionButton";

export function ShippingSummary({ shipping, widgetId }) {
  const holidays = (shipping.blockedDates || [])
    .map((item) => `${formatDisplayDate(item.date, "MMMM d")} — ${item.name}`)
    .join(", ");

  return (
    <s-section heading="Conditions inherited from the main configuration">
      <s-unordered-list>
        <s-list-item>
          Processing: {shipping.processingMinDays}–{shipping.processingMaxDays} business days
        </s-list-item>
        <s-list-item>
          Transit: {shipping.transitMinDays ?? 0}–{shipping.transitMaxDays ?? 0} business days
        </s-list-item>
        <s-list-item>Cutoff: {formatCutoffDisplay(shipping.cutoffTime)}</s-list-item>
        <s-list-item>Processing days: {summarizeWorkingDays(shipping.workingDays)}</s-list-item>
        <s-list-item>
          Transit days: {summarizeWorkingDays(shipping.transitWorkingDays || shipping.workingDays)}
        </s-list-item>
        <s-list-item>Blocked dates: {holidays || "None"}</s-list-item>
      </s-unordered-list>
      <AppLink to={`/app/widgets/${widgetId}?tab=conditions`}>Edit conditions</AppLink>
    </s-section>
  );
}

export function CartConfigForm({ cart, onChange }) {
  return (
    <s-section heading="Cart delivery display">
      <input type="hidden" name="displayMode" value={cart.displayMode} />
        <HostChoiceList
        label="Display mode"
        name="displayModeField"
        onChange={(event) =>
          onChange({
            ...cart,
            displayMode: event.currentTarget.values?.[0] || event.currentTarget.value,
          })
        }
      >
        <s-choice
          value={CART_DISPLAY_MODES.PER_PRODUCT}
          selected={cart.displayMode === CART_DISPLAY_MODES.PER_PRODUCT}
        >
          Per product
        </s-choice>
        <s-choice
          value={CART_DISPLAY_MODES.GENERAL}
          selected={cart.displayMode === CART_DISPLAY_MODES.GENERAL}
        >
          General
        </s-choice>
      </HostChoiceList>
      <s-box padding="base" background="subdued" borderRadius="base">
        {cart.displayMode === CART_DISPLAY_MODES.PER_PRODUCT ? (
          <s-stack gap="small-200">
            <s-text>Product A — Delivery: Aug 25</s-text>
            <s-text>Product B — Delivery: Aug 27</s-text>
          </s-stack>
        ) : (
          <s-text>Estimated delivery: Aug 27</s-text>
        )}
      </s-box>
    </s-section>
  );
}
