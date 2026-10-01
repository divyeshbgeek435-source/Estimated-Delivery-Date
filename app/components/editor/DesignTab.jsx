import { useEffect, useId, useRef, useState } from "react";
import {
  ANIMATED_DESIGNS,
  DATE_FORMATS,
  DEFAULT_ICONS,
  DEFAULT_MESSAGE,
  DEFAULT_SHIPPING,
  DEFAULT_STYLE,
  TEMPLATE_CONTENT_PRESETS,
  TEMPLATE_STYLE_PRESETS,
  TEMPLATE_TITLE_PRESETS,
  WIDGET_DESIGNS,
} from "../../lib/constants";
import { widgetProfile } from "../../lib/widget-profiles";
import { DeliveryWidgetPreview } from "../widgets/DeliveryWidgetPreview";
import { TextEditorField } from "./TextEditorField";
import { TemplateCustomizationModal } from "./TemplateCustomizationModal";
import { syncLegacyIconsFromTracker, trackerConfigFromLegacyIcons, DEFAULT_TRACKER_CONFIG, normalizeTrackerConfig, resolveTrackerConfig } from "../../lib/tracker-config";

/** Featured defaults shown on the Design tab before opening the full gallery. */
const FEATURED_TEMPLATE_VALUES = ["EXPRESS", "TIMELINE", "TRACKER", "CARD"];

function templateContent(design) {
  return TEMPLATE_CONTENT_PRESETS[design] || {};
}

function templateHeading(design) {
  return templateContent(design).heading || "Estimated delivery";
}

function getFeaturedTemplates(selectedValue) {
  const byValue = new Map(WIDGET_DESIGNS.map((item) => [item.value, item]));
  const featured = FEATURED_TEMPLATE_VALUES.map((value) => byValue.get(value)).filter(Boolean);
  if (!selectedValue || FEATURED_TEMPLATE_VALUES.includes(selectedValue)) return featured;
  const selected = byValue.get(selectedValue);
  if (!selected) return featured;
  return [selected, ...featured.filter((item) => item.value !== selectedValue)].slice(0, 4);
}

const DEFAULT_STEP_TITLES = new Set([
      "Purchased",
      "Processing",
      "Delivered",
      "Order Confirmed",
      "Shipped",
      "At Your Doorstep",
      "At your Doorstep",
      "Order On",
      "Production",
      "Ordered",
      "Delivery",
      "Order Now",
      "Ready to Ship",
  "Order by",
  "Dispatch",
  "Crafting",
  "Ships",
  "You order",
  "We ship",
  "You receive",
  "Confirmed",
  "In transit",
  "Packed",
  "On the road",
  "At your door",
  "Shipping",
  "Arrives",
  "Order",
  "Ship",
  "Arrive",
  "Placed",
  "Out for delivery",
  "Delivered today",
  "Yours",
  "With you",
  "Ready",
  "Reserved",
  "Order placed",
  "Prepared",
  "Producing",
  "Fulfilled",
  "Order day",
  "Ship day",
  "Arrive day",
]);

/** Apply a template preset onto a draft without mutating the original. */
export function buildTemplateDraft(draft, value) {
  const style = draft.styleConfig || {};
  const icons = draft.iconConfig || {};
  const titles = TEMPLATE_TITLE_PRESETS[value];
  const preset = TEMPLATE_STYLE_PRESETS[value] || {};
  const content = templateContent(value);
    const nextIcons =
    DEFAULT_STEP_TITLES.has(icons.purchasedTitle) || ANIMATED_DESIGNS.has(value) || Boolean(titles)
        ? { ...icons, ...(titles || { purchasedTitle: "Purchased", processingTitle: "Processing", deliveredTitle: "Delivered" }) }
        : icons;
  const withTitles = value === "JOURNEY" ? { ...nextIcons, headerIconEnabled: false } : nextIcons;
  const trackerSeed =
    value === "EXPRESS"
      ? {
          ...DEFAULT_TRACKER_CONFIG,
          steps: trackerConfigFromLegacyIcons(withTitles).steps,
          settings: {
            ...DEFAULT_TRACKER_CONFIG.settings,
            showHeaderIcon: withTitles.headerIconEnabled !== false,
          },
        }
      : titles
        ? trackerConfigFromLegacyIcons(withTitles)
        : withTitles.trackerConfig || trackerConfigFromLegacyIcons(withTitles);

  return {
      ...draft,
    iconConfig: syncLegacyIconsFromTracker(trackerSeed, withTitles),
      messageConfig: {
        ...draft.messageConfig,
        designTemplate: value,
        widgetLayout: value === "BANNER" || value === "COMPACT" ? "MINIMAL" : "FULL",
      heading: content.heading || templateHeading(value),
      descriptionEnabled: content.descriptionEnabled !== false,
      headingEnabled: content.headingEnabled !== false,
      template: content.template || draft.messageConfig?.template || DEFAULT_MESSAGE.template,
      },
      styleConfig: { ...style, ...preset },
  };
}

function DesignThumb({ design, selected = false }) {
  const frameRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(0.42);
  const preset = TEMPLATE_STYLE_PRESETS[design] || {};
  const titlePreset = TEMPLATE_TITLE_PRESETS[design] || {};
  const content = templateContent(design);
  const layout = design === "BANNER" ? "MINIMAL" : "FULL";
  const previewStyle = { ...DEFAULT_STYLE, ...preset };
  const previewIcons = { ...DEFAULT_ICONS, ...titlePreset };
  const previewMessage = {
    ...DEFAULT_MESSAGE,
    heading: content.heading || templateHeading(design),
    template: content.template || DEFAULT_MESSAGE.template,
    descriptionEnabled: content.descriptionEnabled !== false,
    headingEnabled: content.headingEnabled !== false,
    widgetLayout: layout,
    designTemplate: design,
  };

  useEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return undefined;

    let animationFrame = 0;
    const fitPreview = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const pad = 4;
        const availableWidth = Math.max(1, frame.clientWidth - pad);
        const availableHeight = Math.max(1, frame.clientHeight - pad);
        const contentWidth = Math.max(1, content.offsetWidth);
        const contentHeight = Math.max(1, content.offsetHeight);
        const nextScale = Math.min(
          1,
          availableWidth / contentWidth,
          availableHeight / contentHeight,
        );
        setScale((current) => (Math.abs(current - nextScale) < 0.002 ? current : nextScale));
    });
  };

    fitPreview();
    const observer = new ResizeObserver(fitPreview);
    observer.observe(frame);
    observer.observe(content);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [design]);

  return (
    <div
      ref={frameRef}
      className={`edd-design-thumb edd-design-thumb--actual${selected ? " is-selected" : ""}`}
      aria-hidden="true"
    >
      <div
        ref={contentRef}
        className="edd-design-thumb__actual-scale"
        style={{ "--edd-template-preview-scale": scale }}
      >
        <DeliveryWidgetPreview
          heading={previewMessage.heading}
          template={previewMessage.template}
          icons={previewIcons}
          style={previewStyle}
          shipping={DEFAULT_SHIPPING}
          timezone="UTC"
          dateSettings={previewMessage}
          layout={layout}
          design={design}
          showDescription={previewMessage.descriptionEnabled !== false}
          showHeading={previewMessage.headingEnabled !== false}
          staticPreview
        />
      </div>
    </div>
  );
}

function TemplateCard({ item, selected, onSelect, size = "default" }) {
  return (
    <div
      className={`edd-design-card${selected ? " edd-design-card--selected" : ""}${
        size === "compact" ? " edd-design-card--compact" : ""
      }`}
    >
      <div className="edd-design-card__preview">
        <DesignThumb
          key={`thumb-${item.value}-${selected ? "on" : "off"}-${size}`}
          design={item.value}
          selected={selected}
        />
      </div>
      <div className="edd-design-card__content">
        <strong className="edd-design-card__title">{item.label}</strong>
        <span className="edd-design-card__description">{item.help}</span>
      </div>
      {selected ? <span className="edd-design-card__badge">Selected</span> : null}
      <button
        type="button"
        className="edd-design-card__action"
        aria-label={`Use ${item.label} template`}
        aria-pressed={selected}
        onClick={() => onSelect(item.value)}
      />
    </div>
  );
}

function TemplateGalleryModal({ open, selected, onSelect, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);

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

  if (!open) return null;

  return (
    <div
      className="edd-dialog-overlay edd-template-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="edd-template-modal">
        <header className="edd-template-modal__header">
          <div className="edd-template-modal__heading">
            <h2 id={titleId}>All templates</h2>
            <p>Browse layouts built for real shipping scenarios and pick the one that fits your store.</p>
          </div>
          <div className="edd-template-modal__meta">
            <span className="edd-template-gallery__count">{WIDGET_DESIGNS.length} templates</span>
            <button
              ref={closeRef}
              type="button"
              className="edd-template-modal__close"
              aria-label="Close template gallery"
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
        <div className="edd-template-modal__body">
          <div className="edd-design-grid edd-design-grid--modal">
            {WIDGET_DESIGNS.map((item) => (
              <TemplateCard
                key={item.value}
                item={item}
                selected={selected === item.value}
                size="compact"
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignTab({ widget, draft, onChange }) {
  const style = draft.styleConfig || {};
  const icons = draft.iconConfig || {};
  const message = draft.messageConfig || {};
  const setStyle = (patch) => onChange({ ...draft, styleConfig: { ...style, ...patch } });
  const setMessage = (patch) => onChange({ ...draft, messageConfig: { ...message, ...patch } });
  const profile = widgetProfile(widget?.location);
  const design = message.designTemplate || "TIMELINE";
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const featuredTemplates = getFeaturedTemplates(design);
  const moreCount = Math.max(0, WIDGET_DESIGNS.length - featuredTemplates.length);

  const commitDraft = (next) => {
    const iconsNext = next?.iconConfig || {};
    const tracker = normalizeTrackerConfig(resolveTrackerConfig(iconsNext));
    onChange({
      ...next,
      iconConfig: syncLegacyIconsFromTracker(tracker, iconsNext),
    });
  };

  const openCustomize = (value, { applyPreset = true } = {}) => {
    if (applyPreset) {
      // Selecting a template writes into the editor draft immediately (Unsaved + Save/Discard).
      commitDraft(buildTemplateDraft(draft, value));
    }
    setCustomizeOpen(true);
    setTemplatesOpen(false);
  };

  const selectTemplate = (value) => openCustomize(value, { applyPreset: true });

  return (
    <s-stack gap="large">
      {profile.showFullDesign ? (
        <s-section heading="Widget templates">
          <div className="edd-template-gallery">
            <div className="edd-template-gallery__intro">
              <s-paragraph color="subdued">
                Choose a template to open Customization - every option lives there in one place. Use Customize anytime
                to edit the selected template.
              </s-paragraph>
              <span className="edd-template-gallery__count">Popular</span>
            </div>
            <div className="edd-design-grid edd-design-grid--featured">
              {featuredTemplates.map((item) => (
                <TemplateCard
                  key={item.value}
                  item={item}
                  selected={design === item.value}
                  onSelect={selectTemplate}
                />
              ))}
            </div>
            <div className="edd-template-gallery__more">
              <button
                type="button"
                className="edd-template-gallery__customize"
                onClick={() => openCustomize(design, { applyPreset: false })}
              >
                Customize selected template
              </button>
              <button
                  type="button"
                className="edd-template-gallery__view-more"
                onClick={() => setTemplatesOpen(true)}
                >
                View more templates
                {moreCount > 0 ? <span>{moreCount} more</span> : null}
                </button>
            </div>
          </div>
          <TemplateGalleryModal
            open={templatesOpen}
            selected={design}
            onSelect={selectTemplate}
            onClose={() => setTemplatesOpen(false)}
          />
          <TemplateCustomizationModal
            open={customizeOpen}
            draft={draft}
            shipping={draft.shippingRules || DEFAULT_SHIPPING}
            timezone={draft.timezone || widget?.timezone || "UTC"}
            onChange={commitDraft}
            onClose={() => setCustomizeOpen(false)}
          />
          <DesignHiddenFields draft={draft} />
      </s-section>
      ) : (
        <s-stack gap="large">
          <s-banner heading="Checkout design limits">
            Checkout uses Shopify checkout components. Colors and message still apply; spacing, custom CSS, and timeline
            styles do not.
          </s-banner>
          <s-section heading="Checkout message">
          <s-checkbox
            label="Enable title"
            name="headingEnabled"
              checked={message.headingEnabled !== false}
            onChange={(event) => setMessage({ headingEnabled: Boolean(event.currentTarget.checked) })}
          ></s-checkbox>
            <TextEditorField
              label="Title"
                name="heading"
              value={message.heading || ""}
              maxLength={120}
              onChange={(heading) => setMessage({ heading })}
            />
        <s-checkbox
          label="Enable description"
          name="descriptionEnabled"
              checked={message.descriptionEnabled !== false}
          onChange={(event) => setMessage({ descriptionEnabled: Boolean(event.currentTarget.checked) })}
        ></s-checkbox>
            <TextEditorField
            label="Description"
            name="template"
              multiline
            rows={3}
              value={message.template || ""}
              maxLength={500}
              onChange={(template) => setMessage({ template })}
            />
            <s-color-field
              label="Theme color"
              name="themeColor"
              value={style.themeColor || "#000000"}
              onInput={(event) =>
                setStyle({
                  themeColor: event.currentTarget.value,
                  progressColor: event.currentTarget.value,
                  textColor: event.currentTarget.value,
                  statusColor: event.currentTarget.value,
                  dateColor: event.currentTarget.value,
                  dynamicColor: event.currentTarget.value,
                })
              }
            ></s-color-field>
            <s-color-field
              label="Background color"
              name="backgroundColor"
              value={style.backgroundColor || "#FFFFFF"}
              onInput={(event) => setStyle({ backgroundType: "SOLID", backgroundColor: event.currentTarget.value })}
            ></s-color-field>
      </s-section>
          <DesignHiddenFields
            draft={draft}
            omitNames={[
              "heading",
              "template",
              "headingEnabled",
              "descriptionEnabled",
              "themeColor",
              "backgroundColor",
            ]}
          />
        </s-stack>
      )}
    </s-stack>
  );
}

/** Persist customization values for form save without showing duplicate UI on Design. */
function DesignHiddenFields({ draft, omitNames = [] }) {
  const omit = new Set(omitNames);
  const style = draft.styleConfig || {};
  const icons = draft.iconConfig || {};
  const message = draft.messageConfig || {};
  const field = (name, value) =>
    omit.has(name) ? null : <input key={name} type="hidden" name={name} value={value == null ? "" : String(value)} />;

  return (
    <>
      {field("designTemplate", message.designTemplate || "TIMELINE")}
      {field("widgetLayout", message.widgetLayout || "FULL")}
      {field("heading", message.heading || "")}
      {field("headingEnabled", message.headingEnabled !== false ? "true" : "false")}
      {field("descriptionEnabled", message.descriptionEnabled !== false ? "true" : "false")}
      {field("template", message.template || "")}
      {field("dateFormat", message.dateFormat || DATE_FORMATS.LONG)}
      {field("dateSeparator", message.dateSeparator || "/")}
      {field("includeYear", message.includeYear ? "true" : "false")}
      {field("backgroundType", style.backgroundType || "SOLID")}
      {field("backgroundColor", style.backgroundColor || "#FFFFFF")}
      {field("gradientStart", style.gradientStart || "")}
      {field("gradientEnd", style.gradientEnd || "")}
      {field("gradientDirection", style.gradientDirection || "TO_BOTTOM")}
      {field("borderRadius", style.borderRadius ?? 8)}
      {field("themeColor", style.themeColor || "#000000")}
      {field("borderWidth", style.borderWidth ?? 0)}
      {field("borderColor", style.borderColor || "#E1E3E5")}
      {field("paddingTop", style.paddingTop ?? 16)}
      {field("paddingMiddle", style.paddingMiddle ?? 12)}
      {field("paddingBottom", style.paddingBottom ?? 12)}
      {field("paddingLeft", style.paddingLeft ?? 16)}
      {field("paddingRight", style.paddingRight ?? 16)}
      {field("iconSize", style.iconSize ?? 22)}
      {field("progressWidth", style.progressWidth ?? 2)}
      {field("progressColor", style.progressColor || style.themeColor || "#000000")}
      {field("fontFamily", style.fontFamily || "inherit")}
      {field("fontSize", style.fontSize ?? 14)}
      {field("textColor", style.textColor || "#202223")}
      {field("statusFontSize", style.statusFontSize ?? 12)}
      {field("statusColor", style.statusColor || "#202223")}
      {field("dateFontSize", style.dateFontSize ?? 11)}
      {field("dateColor", style.dateColor || "#202223")}
      {field("dynamicColor", style.dynamicColor || "#202223")}
      {field("headingFontWeight", style.headingFontWeight || 600)}
      {field("customCss", style.customCss || "")}
      {field("elementStyles", JSON.stringify(style.elementStyles || {}))}
      {field("headerIcon", icons.headerIcon || "flag")}
      {field("headerIconEnabled", icons.headerIconEnabled !== false ? "true" : "false")}
      {field("purchased", icons.purchased || "bag")}
      {field("processing", icons.processing || "truck")}
      {field("delivered", icons.delivered || "pin")}
      {field("purchasedTitle", icons.purchasedTitle || "Purchased")}
      {field("processingTitle", icons.processingTitle || "Processing")}
      {field("deliveredTitle", icons.deliveredTitle || "Delivered")}
      {field("purchasedEnabled", icons.purchasedEnabled !== false ? "true" : "false")}
      {field("processingEnabled", icons.processingEnabled !== false ? "true" : "false")}
      {field("deliveredEnabled", icons.deliveredEnabled !== false ? "true" : "false")}
      {field("purchasedColor", icons.purchasedColor || "")}
      {field("processingColor", icons.processingColor || "")}
      {field("deliveredColor", icons.deliveredColor || "")}
      {field("trackerConfig", JSON.stringify(icons.trackerConfig || null))}
      {field("savedIcons", JSON.stringify(icons.savedIcons || []))}
    </>
  );
}
