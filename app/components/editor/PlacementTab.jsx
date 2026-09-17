import { PlacementForm } from "../placement/PlacementForm";
import { normalizePosition, widgetProfile } from "../../lib/widget-profiles";
import { HostChoiceList } from "../common/ActionButton";

export function PlacementTab({ widget, draft, onChange, errors = {}, liveProductWidgets = [] }) {
  const profile = widgetProfile(widget.location);
  const position = normalizePosition(widget.location, draft.placementConfig.position);

  return (
    <s-stack gap="large">
      {widget.location === "PRODUCT" ? (
        <PlacementForm
          placement={draft.placementConfig}
          onChange={(placement) => onChange({ ...draft, placementConfig: placement })}
          errors={errors}
          liveProductWidgets={liveProductWidgets}
        />
      ) : (
        <>
          <input type="hidden" name="mode" value={draft.placementConfig.mode || "ALL_PRODUCTS"} />
          <input type="hidden" name="productIds" value={JSON.stringify(draft.placementConfig.productIds || [])} />
          <input type="hidden" name="collectionIds" value={JSON.stringify(draft.placementConfig.collectionIds || [])} />
          <input type="hidden" name="products" value={JSON.stringify(draft.placementConfig.products || [])} />
          <input type="hidden" name="collections" value={JSON.stringify(draft.placementConfig.collections || [])} />
        </>
      )}

      <s-section heading={profile.placementTitle}>
        <s-paragraph color="subdued">Choose where this widget appears on the page.</s-paragraph>
        <input type="hidden" name="position" value={position} />
        <HostChoiceList
          label={profile.placementTitle}
          name="positionField"
          labelAccessibilityVisibility="exclusive"
          onChange={(event) =>
            onChange({
              ...draft,
              placementConfig: {
                ...draft.placementConfig,
                position: event.currentTarget.values?.[0] || event.currentTarget.value,
              },
            })
          }
        >
          {profile.positions.map((option) => (
            <s-choice key={option.value} value={option.value} selected={position === option.value}>
              {option.label}
            </s-choice>
          ))}
        </HostChoiceList>
        <s-paragraph color="subdued">
          {profile.positions.find((option) => option.value === position)?.help}
        </s-paragraph>
      </s-section>

      {widget.location === "CHECKOUT" ? (
        <s-banner tone="warning" heading="Checkout placement is no longer available">
          Shopify only supports checkout UI extensions on Plus. Unpublish or delete this widget. Product and cart widgets still work on all plans.
        </s-banner>
      ) : widget.location === "CART" && position !== "CUSTOM" ? (
        <s-banner>
          Publishing adds this widget to the cart page automatically, above the checkout button.
        </s-banner>
      ) : null}
    </s-stack>
  );
}
