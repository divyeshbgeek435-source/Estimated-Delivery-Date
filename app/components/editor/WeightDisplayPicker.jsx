import { useState } from "react";
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

export function WeightDisplayPicker({ shipping, onChange, autoOpen = false }) {
  const weight = shipping.weightRules || {};
  const [open, setOpen] = useState(Boolean(autoOpen && !weight.displayMode));

  const setWeight = (patch) => onChange({ weightRules: { ...weight, ...patch } });
  const selected = OPTIONS.find((item) => item.value === weight.displayMode);

  const choose = (displayMode) => {
    const pincode = shipping.pincodeRules || {};
    onChange({
      weightRules: { ...weight, displayMode },
      pincodeRules:
        displayMode === WEIGHT_DISPLAY_MODES.PINCODE
          ? { ...pincode, enabled: true }
          : { ...pincode, enabled: false },
    });
    setOpen(false);
  };

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
          details="Used when a location has no specific weight, and for Show weight directly."
          onInput={(event) => setWeight({ value: event.currentTarget.value })}
        ></s-text-field>
        <label className="edd-field">
          <span>Unit</span>
          <select
            className="edd-input"
            value={weight.unit || "kg"}
            onChange={(event) => setWeight({ unit: event.currentTarget.value })}
          >
            {WEIGHT_UNITS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </s-grid>
      <label className="edd-switch">
        <input
          type="checkbox"
          checked={Boolean(weight.useProductWeight)}
          onChange={(event) => setWeight({ useProductWeight: event.currentTarget.checked })}
        />
        <span>Fall back to the product variant weight when no weight is set</span>
      </label>

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
                  className={`edd-weight-option ${weight.displayMode === option.value ? "is-selected" : ""}`}
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
