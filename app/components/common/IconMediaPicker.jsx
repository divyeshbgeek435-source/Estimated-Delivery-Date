import { useEffect, useRef, useState } from "react";
import { ANIMATED_ICON_OPTIONS, ICON_OPTIONS } from "../../lib/constants";
import {
  createLibraryIcon,
  isAnimatedSrc,
  isCustomImage,
  mergeIconLibraries,
  normalizeIconLibrary,
  resizeImageFile,
} from "../../lib/icon-media";
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
  library = [],
  onLibraryChange,
  onEnabledChange,
  onChange,
  error,
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const current = value || fallback;
  const [urlValue, setUrlValue] = useState(() => remoteUrlValue(current));
  const [tab, setTab] = useState(() =>
    ANIMATED_ICON_OPTIONS.some((item) => item.value === current)
      ? "animated"
      : isCustomImage(current)
        ? "library"
        : "static",
  );
  const active = enabled !== false;
  const saved = normalizeIconLibrary(library);

  useEffect(() => {
    setUrlValue(remoteUrlValue(value || fallback));
  }, [value, fallback]);

  const remember = (src, labelHint) => {
    if (!onLibraryChange || !isCustomImage(src)) return;
    const entry = createLibraryIcon({ src, label: labelHint, kind: isAnimatedSrc(src) ? "animated" : "static" });
    if (!entry) return;
    onLibraryChange(mergeIconLibraries(saved, [entry]));
  };

  const pickFile = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !active) return;
    setBusy(true);
    setMessage("");
    try {
      const src = await resizeImageFile(file);
      onChange(src);
      remember(src, file.name);
      setTab("library");
    } catch (err) {
      setMessage(err?.message || "Could not upload that image.");
    } finally {
      setBusy(false);
    }
  };

  const removeSaved = (id) => {
    if (!onLibraryChange) return;
    onLibraryChange(saved.filter((item) => item.id !== id));
  };

  const options = tab === "animated" ? ANIMATED_ICON_OPTIONS : ICON_OPTIONS;

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
              {busy ? "Uploading…" : isCustomImage(current) ? "Change image" : "Upload icon"}
            </button>
            {isCustomImage(current) ? (
              <button type="button" className="edd-btn" disabled={!active} onClick={() => onChange(fallback)}>
                Use built-in
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
          placeholder="Paste a static or animated image URL"
          disabled={!active}
          onInput={(event) => {
            if (!active) return;
            const typed = event.currentTarget.value;
            setUrlValue(typed);
            const next = typed.trim();
            if (isCustomImage(next)) {
              onChange(next);
              remember(next, "Linked icon");
              setTab("library");
              return;
            }
            if (!next && remoteUrlValue(current)) onChange(fallback);
          }}
        ></s-text-field>

        <div className="edd-icon-tabs" role="tablist" aria-label="Icon type">
          {[
            { id: "static", label: "Static" },
            { id: "animated", label: "Animated" },
            { id: "library", label: `My icons${saved.length ? ` (${saved.length})` : ""}` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={`edd-icon-tab${tab === item.id ? " is-active" : ""}`}
              aria-selected={tab === item.id}
              disabled={!active}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "library" ? (
          saved.length ? (
            <div className="edd-icon-grid edd-icon-grid--library">
              {saved.map((item) => (
                <div key={item.id} className="edd-icon-library-item">
                  <button
                    type="button"
                    className="edd-icon-option"
                    aria-pressed={current === item.src}
                    disabled={!active}
                    onClick={() => onChange(item.src)}
                  >
                    <DeliveryIcon name={item.src} />
                    <span>
                      {item.label}
                      {item.kind === "animated" ? " · animated" : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="edd-icon-library-remove"
                    disabled={!active}
                    aria-label={`Remove ${item.label}`}
                    onClick={() => removeSaved(item.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="edd-icon-empty">Upload or paste an icon to reuse it across every template.</p>
          )
        ) : (
          <div className="edd-icon-grid">
            {options.map((option) => (
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
        )}
      </div>
      {error || message ? <s-banner tone="critical">{error || message}</s-banner> : null}
    </div>
  );
}
