import { useEffect, useRef, useState } from "react";
import { ICON_OPTIONS } from "../../lib/constants";
import { isCustomImage, resizeImageFile } from "../../lib/icon-media";
import { DeliveryIcon } from "../icons/DeliveryIcon";

function remoteUrlValue(value) {
  const current = String(value || "");
  return isCustomImage(current) && !current.startsWith("data:") && !current.startsWith("blob:") ? current : "";
}

export function IconMediaPicker({
  label = "Icon",
  title,
  name,
  value,
  color,
  fallback = "bag",
  enabled = true,
  onEnabledChange,
  onChange,
  error,
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const current = value || fallback;
  const [urlValue, setUrlValue] = useState(() => remoteUrlValue(current));
  const active = enabled !== false;

  useEffect(() => {
    setUrlValue(remoteUrlValue(value || fallback));
  }, [value, fallback]);

  const pickFile = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !active) return;
    setBusy(true);
    setMessage("");
    try {
      onChange(await resizeImageFile(file));
    } catch (error) {
      setMessage(error?.message || "Could not upload that image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`edd-icon-card ${active ? "" : "edd-icon-card--off"}`}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      {title || onEnabledChange ? (
        <div className="edd-icon-card__head">
          {title ? <p className="edd-icon-card__title">{title}</p> : <span />}
          {onEnabledChange ? (
            <s-switch
              label={active ? "Enabled" : "Disabled"}
              checked={active}
              onChange={(event) => onEnabledChange(Boolean(event.currentTarget.checked))}
            ></s-switch>
          ) : null}
        </div>
      ) : null}
      <div className="edd-icon-slot" aria-disabled={active ? undefined : "true"}>
        <div className="edd-icon-change">
          <span className="edd-icon-change__preview">
            <DeliveryIcon name={current} color={color || "#202223"} />
          </span>
          <div className="edd-icon-change__actions">
            <button
              type="button"
              className="edd-btn"
              disabled={!active || busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? "Uploading…" : isCustomImage(current) ? "Change image" : "Upload image"}
            </button>
            {isCustomImage(current) ? (
              <button type="button" className="edd-btn" disabled={!active} onClick={() => onChange(fallback)}>
                Use icon
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            hidden
            disabled={!active}
            onChange={pickFile}
          />
        </div>
        <s-text-field
          label={`${label} URL`}
          labelAccessibilityVisibility="exclusive"
          value={urlValue}
          placeholder="Paste an image URL"
          disabled={!active}
          onInput={(event) => {
            if (!active) return;
            const typed = event.currentTarget.value;
            setUrlValue(typed);
            const next = typed.trim();
            if (isCustomImage(next)) {
              onChange(next);
              return;
            }
            if (!next && remoteUrlValue(current)) onChange(fallback);
          }}
        ></s-text-field>
        <details className="edd-icon-change__picker" open={active ? undefined : false}>
          <summary>Choose an icon</summary>
          <div className="edd-icon-grid">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="edd-icon-option"
                aria-pressed={current === option.value}
                disabled={!active}
                onClick={() => onChange(option.value)}
              >
                <DeliveryIcon name={option.value} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
      {error || message ? <s-banner tone="critical">{error || message}</s-banner> : null}
    </div>
  );
}
