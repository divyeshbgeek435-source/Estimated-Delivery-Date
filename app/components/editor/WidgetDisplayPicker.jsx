import { WEIGHT_DISPLAY_MODES } from "../../lib/pincode";

const OPTIONS = [
  {
    value: WEIGHT_DISPLAY_MODES.PINCODE,
    title: "Enter pincode and show widget",
    description: "Customers enter a pincode first. If you deliver there, show availability, widget, and delivery dates.",
  },
  {
    value: WEIGHT_DISPLAY_MODES.DIRECT,
    title: "Show widget directly",
    description: "Show the configured widget on the product page without asking for a pincode.",
  },
];

/** True only after the merchant explicitly picks Enter pincode or Show widget. */
export function hasWidgetDisplayChoice(shipping = {}) {
  return Boolean(explicitWidgetDisplayMode(shipping));
}

export function explicitWidgetDisplayMode(shipping = {}) {
  const mode = shipping?.weightRules?.displayMode;
  if (mode === WEIGHT_DISPLAY_MODES.PINCODE || mode === WEIGHT_DISPLAY_MODES.DIRECT) return mode;
  return "";
}

function WidgetOptions({ selectedMode, onChoose }) {
  return (
    <div className="edd-weight-dialog__grid">
      {OPTIONS.map((option) => {
        const selected = option.value === selectedMode;
        return (
          <button
            key={option.value}
            type="button"
            className={`edd-weight-option${selected ? " is-selected" : ""}`}
            aria-pressed={selected}
            onClick={() => onChoose(option.value)}
          >
            <strong>{option.title}</strong>
            <span>{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}

export function WidgetDisplayPicker({ shipping, onChange }) {
  const weight = shipping.weightRules || {};
  const selectedMode = explicitWidgetDisplayMode(shipping);

  const choose = (displayMode) => {
    if (displayMode === selectedMode) return;
    const pincode = shipping.pincodeRules || {};
    onChange({
      weightRules: { ...weight, displayMode },
      pincodeRules:
        displayMode === WEIGHT_DISPLAY_MODES.PINCODE
          ? { ...pincode, enabled: true }
          : { ...pincode, enabled: false },
    });
  };

  if (!selectedMode) {
    return (
      <div
        className="edd-live-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edd-weight-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="edd-live-dialog edd-weight-dialog">
          <p id="edd-weight-title" className="edd-weight-dialog__title">
            How should widget appear?
          </p>
          <p className="edd-help">
            Select one option to continue. This choice is required before the widget can be saved.
          </p>
          <WidgetOptions selectedMode={selectedMode} onChoose={choose} />
        </div>
      </div>
    );
  }

  return (
    <s-section aria-label="How should widget appear?">
      <p className="edd-section-heading">How should widget appear?</p>
      <p className="edd-help">Change this any time. The product page follows the option you select.</p>
      <WidgetOptions selectedMode={selectedMode} onChoose={choose} />
    </s-section>
  );
}
