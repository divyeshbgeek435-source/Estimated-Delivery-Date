import { useState } from "react";
import { PINCODE_COUNTRIES, parsePincodeList, normalizePincode } from "../../lib/pincode";

export function PincodeRulesEditor({ shipping, onChange, errors = {} }) {
  const pincode = shipping.pincodeRules || { enabled: false, country: "IN", pincodes: [] };
  const [code, setCode] = useState("");
  const [minDays, setMinDays] = useState(String(shipping.transitMinDays ?? 1));
  const [maxDays, setMaxDays] = useState(String(shipping.transitMaxDays ?? 2));
  const [lookupError, setLookupError] = useState("");

  const setPincode = (patch) => onChange({ pincodeRules: { ...pincode, ...patch } });

  const addCodes = async (rawCodes) => {
    const codes = parsePincodeList(rawCodes);
    if (!codes.length) {
      setLookupError("Enter a pincode first.");
      return;
    }
    setLookupError("");
    const next = [...(pincode.pincodes || [])];
    const existing = new Set(next.map((item) => String(item.code || "").toUpperCase()));
    const min = Number(minDays) || 0;
    const max = Math.max(min, Number(maxDays) || min);

    for (const item of codes) {
      const normalized = normalizePincode(item);
      if (!normalized || existing.has(normalized)) continue;
      let label = "";
      try {
        const params = new URLSearchParams({ country: pincode.country || "IN", code: normalized });
        const response = await fetch(`/app/pincode-lookup?${params.toString()}`);
        const payload = await response.json();
        if (payload?.ok) label = payload.label || "";
      } catch {
        // Merchants can still save pincodes if the lookup API is down.
      }
      existing.add(normalized);
      next.push({ code: normalized, minDays: min, maxDays: max, label });
    }

    if (next.length === (pincode.pincodes || []).length) {
      setLookupError("This pincode is already added.");
      return;
    }
    setPincode({ pincodes: next });
    setCode("");
  };

  const addFromInput = () => {
    const range = code.match(/^\s*([A-Za-z0-9]+)\s*[-–]\s*([A-Za-z0-9]+)\s*$/);
    if (range) {
      const min = Number(minDays) || 0;
      const max = Math.max(min, Number(maxDays) || min);
      setPincode({
        pincodes: [
          ...(pincode.pincodes || []),
          {
            from: normalizePincode(range[1]),
            to: normalizePincode(range[2]),
            minDays: min,
            maxDays: max,
            label: "",
          },
        ],
      });
      setCode("");
      setLookupError("");
      return;
    }
    addCodes(code);
  };

  return (
    <s-section heading="Pincode / delivery">
      <s-paragraph>
        Optional. Customers enter a pincode on the product page to see if you deliver there and when.
      </s-paragraph>

      <label className="edd-switch">
        <input
          type="checkbox"
          checked={Boolean(pincode.enabled)}
          onChange={(event) => setPincode({ enabled: event.currentTarget.checked })}
        />
        <span>Enable pincode check on the product page</span>
      </label>

      {pincode.enabled ? (
        <div className="edd-pin-editor">
          <label className="edd-field">
            <span>Country</span>
            <select
              className="edd-input"
              value={pincode.country || "IN"}
              onChange={(event) => setPincode({ country: event.currentTarget.value })}
            >
              {PINCODE_COUNTRIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="edd-pin-form">
            <p className="edd-pin-form__title">Add a serviceable pincode</p>
            <label className="edd-field">
              <span>Pincode</span>
              <input
                className="edd-input"
                value={code}
                placeholder="395010, or a range 110001-110099"
                onChange={(event) => setCode(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addFromInput();
                  }
                }}
              />
            </label>
            <div className="edd-pin-days">
              <label className="edd-field">
                <span>Min days</span>
                <input
                  className="edd-input"
                  type="number"
                  min={0}
                  max={60}
                  value={minDays}
                  onChange={(event) => setMinDays(event.currentTarget.value)}
                />
              </label>
              <label className="edd-field">
                <span>Max days</span>
                <input
                  className="edd-input"
                  type="number"
                  min={0}
                  max={90}
                  value={maxDays}
                  onChange={(event) => setMaxDays(event.currentTarget.value)}
                />
              </label>
            </div>
            <button type="button" className="edd-btn edd-btn--primary edd-pin-form__add" onClick={addFromInput}>
              Add pincode
            </button>
            {lookupError || errors.pincodeRules ? (
              <p className="edd-field-error">{lookupError || errors.pincodeRules}</p>
            ) : null}
          </div>

          {(pincode.pincodes || []).length ? (
            <ul className="edd-pin-list">
              {pincode.pincodes.map((item, index) => (
                <li key={`${item.code || item.from}-${index}`} className="edd-pin-list__item">
                  <div className="edd-pin-list__copy">
                    <strong>{item.code || `${item.from} – ${item.to}`}</strong>
                    <span>
                      {item.label ? `${item.label} · ` : ""}
                      {item.minDays}–{item.maxDays} days
                    </span>
                  </div>
                  <button type="button" className="edd-pin-list__remove" onClick={() => setPincode({ pincodes: pincode.pincodes.filter((_, current) => current !== index) })}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="edd-help">No pincodes yet. Customers will see “Delivery not available” until you add some.</p>
          )}
        </div>
      ) : null}
    </s-section>
  );
}
