import { PlacementForm } from "../placement/PlacementForm";
import { widgetSnippet } from "../../lib/constants";
import { normalizePosition, widgetProfile } from "../../lib/widget-profiles";
import { HostChoiceList } from "../common/ActionButton";

export function PlacementTab({ widget, draft, onChange, errors = {} }) {
  const profile = widgetProfile(widget.location);
  const position = normalizePosition(widget.location, draft.placementConfig.position);
  const snippet = widgetSnippet(widget.location, draft.cartConfig?.displayMode);

  return (
    <s-stack gap="large">
      {widget.location === "PRODUCT" ? (
        <PlacementForm
          placement={draft.placementConfig}
          onChange={(placement) => onChange({ ...draft, placementConfig: placement })}
          errors={errors}
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
        <input type="hidden" name="position" value={position} />
        <HostChoiceList
          label={profile.placementTitle}
          name="positionField"
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
        <s-banner heading="Checkout display">
          Once published, this widget appears once on checkout at the selected location. Draft and scheduled widgets stay hidden until they go live.
        </s-banner>
      ) : (
        <s-section heading="Code snippet">
          <s-paragraph color="subdued">
            Use this only if you chose a custom theme placement.
          </s-paragraph>
          <s-text-field label="Snippet" name="snippet" value={snippet} readOnly></s-text-field>
        </s-section>
      )}
    </s-stack>
  );
}
