import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_SHIPPING, WIDGET_DESIGNS } from "../../lib/constants";
import { WEIGHT_DISPLAY_MODES } from "../../lib/pincode";
import { DeliveryWidgetPreview } from "../widgets/DeliveryWidgetPreview";
import { CustomizationPanel } from "./CustomizationPanel";
import { explicitWidgetDisplayMode } from "./WidgetDisplayPicker";

function templateLabel(value) {
  return WIDGET_DESIGNS.find((item) => item.value === value)?.label || value;
}

/**
 * Template customization popup with live preview.
 * Edits write straight into the editor draft (same as Widget) so Unsaved + Save/Discard appear.
 */
export function TemplateCustomizationModal({
  open,
  draft,
  shipping = DEFAULT_SHIPPING,
  timezone = "UTC",
  onChange,
  onClose,
}) {
  const titleId = useId();
  const closeRef = useRef(null);
  const [previewDevice, setPreviewDevice] = useState("desktop");

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open || !draft) return null;

  const style = draft.styleConfig || {};
  const icons = draft.iconConfig || {};
  const message = draft.messageConfig || {};
  const design = message.designTemplate || "TIMELINE";
  const layout = message.widgetLayout || "FULL";
  const headingEnabled = message.headingEnabled !== false;
  const descriptionEnabled = message.descriptionEnabled !== false;
  const iconLibrary = icons.savedIcons || [];
  const showCheckDeliveryOptions = explicitWidgetDisplayMode(shipping) === WEIGHT_DISPLAY_MODES.PINCODE;

  const commit = (next) => onChange?.(next);

  return (
    <div
      className="edd-dialog-overlay edd-customize-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="edd-customize-modal">
        <header className="edd-customize-modal__header">
          <div className="edd-customize-modal__heading">
            <h2 id={titleId}>Customize {templateLabel(design)}</h2>
            <p>
              Edits update the live preview immediately. Use Save / Discard in the bar above when you are ready same as
              widget and other settings.
            </p>
          </div>
          <div className="edd-customize-modal__meta">
            {/* <div className="edd-customize-modal__tabs" role="tablist" aria-label="Customization">
              <span className="edd-customize-modal__tab is-active" role="tab" aria-selected="true">
                Customization
              </span>
            </div> */}
            <button
              ref={closeRef}
              type="button"
              className="edd-customize-modal__close"
              aria-label="Close customization"
              onClick={onClose}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="edd-customize-modal__layout">
          <aside className="edd-customize-modal__preview" aria-label="Live template preview">
            <div className="edd-customize-modal__preview-toolbar">
              <s-badge tone="success">Live preview</s-badge>
              <div className="edd-preview-devices" role="group" aria-label="Preview size">
                <button
                  type="button"
                  className="edd-preview-device"
                  aria-pressed={previewDevice === "desktop"}
                  aria-label="Desktop preview"
                  onClick={() => setPreviewDevice("desktop")}
                >
                  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                    <rect x="2" y="4" width="16" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M7 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  className="edd-preview-device"
                  aria-pressed={previewDevice === "mobile"}
                  aria-label="Mobile preview"
                  onClick={() => setPreviewDevice("mobile")}
                >
                  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                    <rect x="6" y="2" width="8" height="16" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="10" cy="15.2" r="0.7" fill="currentColor" />
                  </svg>
                  <span>Mobile</span>
                </button>
              </div>
            </div>
            <div
              className={`edd-customize-modal__preview-frame edd-preview-frame edd-preview-frame--${previewDevice}`}
            >
              <DeliveryWidgetPreview
                heading={message.heading || ""}
                template={message.template}
                icons={icons}
                style={style}
                shipping={shipping}
                timezone={timezone}
                dateSettings={message}
                layout={layout}
                design={design}
                showDescription={descriptionEnabled}
                showHeading={headingEnabled}
                location="PRODUCT"
                preferMobileStyles={previewDevice === "mobile"}
              />
            </div>
          </aside>

          <div className="edd-customize-modal__controls">
            <CustomizationPanel
              style={style}
              message={message}
              icons={icons}
              library={iconLibrary}
              showCheckDeliveryOptions={showCheckDeliveryOptions}
              onLibraryChange={(savedIcons) =>
                commit({ ...draft, iconConfig: { ...icons, savedIcons } })
              }
              onStyleChange={(nextStyle) => commit({ ...draft, styleConfig: nextStyle })}
              onMessageChange={(patch) =>
                commit({ ...draft, messageConfig: { ...message, ...patch } })
              }
              onIconsChange={(nextIcons) => commit({ ...draft, iconConfig: nextIcons })}
            />
          </div>
        </div>

        <footer className="edd-customize-modal__footer">
          <button type="button" className="edd-btn edd-btn--primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
