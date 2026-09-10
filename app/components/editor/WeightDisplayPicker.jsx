import { useEffect, useState } from "react";
import { WEIGHT_DISPLAY_MODES, WEIGHT_UNITS } from "../../lib/pincode";

const OPTIONS = [
  {
    value: WEIGHT_DISPLAY_MODES.PINCODE,
    title: "Enter pincode and show weight",
    description: "Customers enter a pincode first. If you deliver there, show availability, weight, and delivery dates.",
  },
  {
    value: WEIGHT_DISPLAY_MODES.DIRECT,
    title: "Show weight directly",
    description: "Show the configured weight on the product page without asking for a pincode.",
  },
];

function promptKey(widgetId) {
  return `edd.weight-display-prompted:${widgetId}`;
}

function wasPrompted(widgetId) {
  if (!widgetId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(promptKey(widgetId)) === "1";
  } catch {
    return false;
  }
}

function markPrompted(widgetId) {
  if (!widgetId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(promptKey(widgetId), "1");
  } catch {
    // Ignore private-mode / storage failures.
  }
}

/** True when the merchant already picked (or effectively configured) a weight display mode. */
export function hasWeightDisplayChoice(shipping = {}) {
  const mode = shipping?.weightRules?.displayMode;
  if (mode === WEIGHT_DISPLAY_MODES.PINCODE || mode === WEIGHT_DISPLAY_MODES.DIRECT) return true;
  if (shipping?.pincodeRules?.enabled) return true;
  if (shipping?.weightRules?.value || shipping?.weightRules?.useProductWeight) return true;
  return false;
}

export function inferredWeightDisplayMode(shipping = {}) {
  const mode = shipping?.weightRules?.displayMode;
  if (mode === WEIGHT_DISPLAY_MODES.PINCODE || mode === WEIGHT_DISPLAY_MODES.DIRECT) return mode;
  if (shipping?.pincodeRules?.enabled) return WEIGHT_DISPLAY_MODES.PINCODE;
  if (shipping?.weightRules?.value || shipping?.weightRules?.useProductWeight) {
    return WEIGHT_DISPLAY_MODES.DIRECT;
  }
  return "";
}

export function WeightDisplayPicker({ shipping, onChange, autoOpen = false, widgetId }) {
  const weight = shipping.weightRules || {};
  const effectiveMode = inferredWeightDisplayMode(shipping);
  const [open, setOpen] = useState(() => {
    if (!autoOpen) return false;
    if (hasWeightDisplayChoice(shipping) || wasPrompted(widgetId)) return false;
    markPrompted(widgetId);
    return true;
  });

  const setWeight = (patch) => onChange({ weightRules: { ...weight, ...patch } });
  const selected = OPTIONS.find((item) => item.value === (weight.displayMode || effectiveMode));

  const choose = (displayMode) => {
    const pincode = shipping.pincodeRules || {};
    markPrompted(widgetId);
    onChange({
      weightRules: { ...weight, displayMode },
      pincodeRules:
        displayMode === WEIGHT_DISPLAY_MODES.PINCODE
          ? { ...pincode, enabled: true }
          : { ...pincode, enabled: false },
    });
    setOpen(false);
  };

  // Persist an inferred mode once so later edits never treat it as "unset".
  useEffect(() => {
    if (weight.displayMode || !effectiveMode) return;
    onChange({ weightRules: { ...weight, displayMode: effectiveMode } });
    markPrompted(widgetId);
    // Intentionally run once per mount for backfill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <s-section heading="Weight display">
      <s-paragraph>
        Choose how product weight appears on the storefront. This also controls whether customers must check a pincode first.
      </s-paragraph>
      <div className="edd-weight-choice">
        <div>
          <s-text type="strong">{selected?.title || "Not selected yet"}</s-text>
          <s-paragraph color="subdued">
            {selected?.description || "Select a weight display option to continue."}
          </s-paragraph>
        </div>
        <button type="button" className="edd-btn edd-btn--secondary" onClick={() => setOpen(true)}>
          {selected ? "Change" : "Select option"}
        </button>
      </div>

      <s-grid gridTemplateColumns="1fr 8rem" gap="base">
        <s-text-field
          label="Default weight"
          name="weightValue"
          value={weight.value || ""}
          details="Used when a location has no specific weight. Ignored if the product-weight checkbox below is on."
          onInput={(event) => setWeight({ value: event.currentTarget.value })}
        ></s-text-field>
        <s-text-field
          label="Unit"
          name="weightUnit"
          value={weight.unit || ""}
          placeholder="kg"
          list="edd-weight-units"
          details="Type any unit, such as kg, g, lb, or pcs."
          onInput={(event) => setWeight({ unit: event.currentTarget.value })}
        ></s-text-field>
      </s-grid>
      <datalist id="edd-weight-units">
        {WEIGHT_UNITS.map((item) => (
          <option key={item.value} value={item.value}></option>
        ))}
      </datalist>
      <label className="edd-switch">
        <input
          type="checkbox"
          checked={Boolean(weight.useProductWeight)}
          onChange={(event) => setWeight({ useProductWeight: event.currentTarget.checked })}
        />
        <span>Use the product variant weight instead of the default weight</span>
      </label>
      <s-paragraph color="subdued">
        {weight.useProductWeight
          ? "The availability line uses the Shopify product weight. Default weight is ignored."
          : `The availability line uses Default weight and Unit${
              weight.value ? ` (${weight.value} ${weight.unit || "kg"})` : ""
            }. Turn this on to use each product's own weight.`}
      </s-paragraph>

      {open ? (
        <div className="edd-live-overlay" role="dialog" aria-modal="true" aria-labelledby="edd-weight-title">
          <div className="edd-live-dialog edd-weight-dialog">
            <p id="edd-weight-title" className="edd-weight-dialog__title">
              How should weight appear?
            </p>
            <p className="edd-help">This controls the product page widget for customers and the live preview.</p>
            <div className="edd-weight-dialog__grid">
              {OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`edd-weight-option ${(weight.displayMode || effectiveMode) === option.value ? "is-selected" : ""}`}
                  onClick={() => choose(option.value)}
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </s-section>
  );
}
