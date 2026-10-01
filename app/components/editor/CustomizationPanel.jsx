import { startTransition, useEffect, useRef, useState } from "react";
import {
  DATE_FORMATS,
  FONT_OPTIONS,
  GRADIENT_DIRECTIONS,
  HEADING_WEIGHT_OPTIONS,
  MESSAGE_TAGS,
} from "../../lib/constants";
import { boundedIntFromEvent, STYLE_NUMBER_LIMITS } from "../../lib/number-input";
import { HostChoiceList } from "../common/ActionButton";
import { IconMediaPicker } from "../common/IconMediaPicker";
import { TextEditorField } from "./TextEditorField";
import { CheckDeliveryCustomization } from "./CheckDeliveryCustomization";
import { ConnectorCustomization } from "./ConnectorCustomization";
import {
  createTrackerStep,
  DEFAULT_TRACKER_STEPS,
  normalizeTrackerConfig,
  resolveTrackerConfig,
  syncLegacyIconsFromTracker,
  TRACKER_DATE_SOURCES,
} from "../../lib/tracker-config";

/** Keep CSS typing local so each keystroke does not rebuild the live preview. */
function CustomCssField({ value = "", onChange }) {
  const [local, setLocal] = useState(() => String(value || ""));
  const focusedRef = useRef(false);
  const timerRef = useRef(0);
  const latestRef = useRef(local);
  latestRef.current = local;

  useEffect(() => {
    if (focusedRef.current) return;
    setLocal(String(value || ""));
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const commit = (next) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
    startTransition(() => onChange(next));
  };

  return (
    <s-text-area
      label="Custom CSS"
      rows={5}
      value={local}
      spellcheck="false"
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit(latestRef.current);
      }}
      onInput={(event) => {
        const next = event.currentTarget.value;
        setLocal(next);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          timerRef.current = 0;
          startTransition(() => onChange(next));
        }, 300);
      }}
    ></s-text-area>
  );
}

const DEFAULT_ICON_SLOTS = [
  { title: "Purchased", icon: "bag", fallbackIndex: 0 },
  { title: "Processing", icon: "truck", fallbackIndex: 1 },
  { title: "Delivered", icon: "pin", fallbackIndex: 2 },
];

function ensureThreeIconSteps(steps = []) {
  const list = Array.isArray(steps) ? [...steps] : [];
  while (list.length < 3) {
    const fallback = DEFAULT_TRACKER_STEPS[list.length] || DEFAULT_ICON_SLOTS[list.length];
    list.push(
      createTrackerStep({
        title: fallback.title || DEFAULT_ICON_SLOTS[list.length]?.title || `Step ${list.length + 1}`,
        icon: fallback.icon || "bag",
        status: fallback.status || "pending",
        dateSource: fallback.dateSource || "delivered",
        enabled: true,
      }),
    );
  }
  return list;
}

const DATE_FORMAT_SAMPLES = {
  [DATE_FORMATS.LONG]: "Aug 21, 2026",
  [DATE_FORMATS.NUMERIC_DMY]: "21/08/2026",
  [DATE_FORMATS.NUMERIC_MDY]: "08/21/2026",
};

function onStyleNumber(event, key, bounds, setStyle) {
  const next = boundedIntFromEvent(event, bounds, bounds.min);
  if (next == null) return;
  setStyle({ [key]: next });
}

function variableHelp(tag) {
  const help = {
    "{counter}": "Countdown until processing cutoff",
    "{ordered_date}": "Order date",
    "{processing_from}": "Processing from date",
    "{processing_to}": "Processing to date",
    "{delivery_from}": "Delivery from date",
    "{delivery_to}": "Delivery to date",
    "{delivery_date}": "Full delivery date range",
    "{product_name}": "Product name",
  };
  return help[tag] || "";
}

const TYPOGRAPHY_STEP_TABS = [
  { id: "purchased", label: "Purchased", index: 0 },
  { id: "processing", label: "Processing", index: 1 },
  { id: "delivered", label: "Delivered", index: 2 },
];

/**
 * Full customization controls in one list.
 * Each option appears exactly once.
 */
export function CustomizationPanel({
  style,
  message,
  icons,
  onStyleChange,
  onMessageChange,
  onIconsChange,
  library = [],
  onLibraryChange,
  showCheckDeliveryOptions = false,
}) {
  const [typographyTab, setTypographyTab] = useState("purchased");
  const themeColor = style.themeColor || "#000000";
  const backgroundType = style.backgroundType || "SOLID";
  const headingEnabled = message.headingEnabled !== false;
  const descriptionEnabled = message.descriptionEnabled !== false;
  const headingWeight = Number(style.headingFontWeight) || 600;

  const setStyle = (patch) => onStyleChange({ ...style, ...patch });
  const tracker = resolveTrackerConfig(icons);
  const iconSteps = ensureThreeIconSteps(tracker.steps).slice(0, 3);

  const commitTracker = (nextTracker) => {
    onIconsChange(syncLegacyIconsFromTracker(normalizeTrackerConfig(nextTracker), icons));
  };

  const updateIconStep = (index, patch) => {
    const nextSteps = ensureThreeIconSteps(tracker.steps).map((step, i) =>
      i === index ? { ...step, ...patch } : step,
    );
    commitTracker({ ...tracker, steps: nextSteps });
  };

  const renderStepTabPanel = (index, { includeTypography = false, includeMeta = false } = {}) => {
    const slot = DEFAULT_ICON_SLOTS[index] || DEFAULT_ICON_SLOTS[0];
    const step = iconSteps[index] || {};
    const statusFallback = style.statusColor || "#202223";
    const dateFallback = style.dateColor || "#202223";
    return (
      <div className="edd-typo-tabs__panel edd-step-tab-panel" role="tabpanel">
        <IconMediaPicker
          title="Icon"
          value={step.icon || slot.icon}
          fallback={slot.icon}
          color={step.color || themeColor || "#202223"}
          enabled={step.enabled !== false}
          library={library}
          onLibraryChange={onLibraryChange}
          onEnabledChange={(enabled) => updateIconStep(index, { enabled })}
          onChange={(icon) => updateIconStep(index, { icon })}
        />
        <s-color-field
          label="Step color (optional)"
          value={step.color || themeColor || "#000000"}
          onInput={(event) => updateIconStep(index, { color: event.currentTarget.value })}
        ></s-color-field>
        <button type="button" className="edd-btn" onClick={() => updateIconStep(index, { color: "" })}>
          Use theme color
        </button>

        {includeMeta ? (
          <>
            <s-text-field
              label="Label"
              value={step.title || slot.title}
              onInput={(event) => updateIconStep(index, { title: event.currentTarget.value })}
            ></s-text-field>
            <s-select
              label="Date source"
              value={step.dateSource || "delivered"}
              onChange={(event) => {
                const next = event.currentTarget.values?.[0] || event.currentTarget.value;
                if (next) updateIconStep(index, { dateSource: next });
              }}
            >
              {TRACKER_DATE_SOURCES.map((item) => (
                <s-option key={item.value} value={item.value}>
                  {item.label}
                </s-option>
              ))}
            </s-select>
            {step.dateSource === "custom" ? (
              <s-text-field
                label="Custom date text"
                value={step.customDate || ""}
                onInput={(event) => updateIconStep(index, { customDate: event.currentTarget.value })}
              ></s-text-field>
            ) : null}
          </>
        ) : null}

        {includeTypography ? (
          <s-grid gridTemplateColumns="1fr auto" gap="base">
            <s-number-field
              label="Status size"
              min={STYLE_NUMBER_LIMITS.statusFontSize.min}
              max={STYLE_NUMBER_LIMITS.statusFontSize.max}
              step={1}
              suffix="px"
              value={String(step.labelFontSize ?? style.statusFontSize ?? 12)}
              onInput={(event) =>
                updateIconStep(index, {
                  labelFontSize: Number(event.currentTarget.value) || style.statusFontSize || 12,
                })
              }
            ></s-number-field>
            <s-color-field
              label="Status color"
              value={step.labelColor || statusFallback}
              onInput={(event) => updateIconStep(index, { labelColor: event.currentTarget.value })}
            ></s-color-field>
            <s-number-field
              label="Date size"
              min={STYLE_NUMBER_LIMITS.dateFontSize.min}
              max={STYLE_NUMBER_LIMITS.dateFontSize.max}
              step={1}
              suffix="px"
              value={String(step.dateFontSize ?? style.dateFontSize ?? 11)}
              onInput={(event) =>
                updateIconStep(index, {
                  dateFontSize: Number(event.currentTarget.value) || style.dateFontSize || 11,
                })
              }
            ></s-number-field>
            <s-color-field
              label="Date color"
              value={step.dateColor || dateFallback}
              onInput={(event) => updateIconStep(index, { dateColor: event.currentTarget.value })}
            ></s-color-field>
          </s-grid>
        ) : null}
      </div>
    );
  };

  const stepTabsShell = ({ includeTypography = false, includeMeta = false, ariaLabel = "Step settings" } = {}) => (
    <div className="edd-typo-tabs-shell">
      <div className="edd-typo-tabs" role="tablist" aria-label={ariaLabel}>
        {TYPOGRAPHY_STEP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={typographyTab === tab.id}
            className={`edd-typo-tabs__tab${typographyTab === tab.id ? " is-active" : ""}`}
            onClick={() => setTypographyTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderStepTabPanel(
        (TYPOGRAPHY_STEP_TABS.find((tab) => tab.id === typographyTab) || TYPOGRAPHY_STEP_TABS[0]).index,
        { includeTypography, includeMeta },
      )}
    </div>
  );

  const checkDeliverySection = showCheckDeliveryOptions ? (
    <CheckDeliveryCustomization
      style={style}
      onStyleChange={onStyleChange}
      tracker={tracker}
      commitTracker={commitTracker}
    />
  ) : null;

  return (
    <s-stack gap="large">
      <section className="edd-customize-block">
        <h3>Title & header</h3>
        <s-checkbox
          label="Show title"
          checked={headingEnabled}
          onChange={(event) => onMessageChange({ headingEnabled: Boolean(event.currentTarget.checked) })}
        ></s-checkbox>
        {headingEnabled ? (
          <>
            <TextEditorField
              label="Title text"
              value={message.heading || ""}
              placeholder="Estimated Delivery Date"
              maxLength={120}
              onChange={(heading) => onMessageChange({ heading })}
            />
            <s-select
              label="Title widget"
              value={String(headingWeight)}
              onChange={(event) => setStyle({ headingFontWeight: Number(event.currentTarget.value) || 600 })}
            >
              {HEADING_WEIGHT_OPTIONS.map((item) => (
                <s-option key={item.value} value={String(item.value)}>
                  {item.label}
                </s-option>
              ))}
            </s-select>
          </>
        ) : null}
        <IconMediaPicker
          title="Header icon"
          label="Header icon"
          value={icons.headerIcon || "flag"}
          fallback="flag"
          color={themeColor}
          enabled={icons.headerIconEnabled !== false}
          library={library}
          onLibraryChange={onLibraryChange}
          onEnabledChange={(headerIconEnabled) => {
            const nextTracker = {
              ...tracker,
              settings: { ...tracker.settings, showHeaderIcon: headerIconEnabled !== false },
            };
            onIconsChange(
              syncLegacyIconsFromTracker(normalizeTrackerConfig(nextTracker), {
                ...icons,
                headerIconEnabled,
              }),
            );
          }}
          onChange={(headerIcon) => onIconsChange({ ...icons, headerIcon })}
        />
      </section>

      <section className="edd-customize-block">
        <h3>Description / countdown</h3>
        <s-checkbox
          label="Show description"
          checked={descriptionEnabled}
          onChange={(event) => onMessageChange({ descriptionEnabled: Boolean(event.currentTarget.checked) })}
        ></s-checkbox>
        {descriptionEnabled ? (
          <>
            <TextEditorField
              label="Description"
              multiline
              rows={3}
              value={message.template || ""}
              maxLength={500}
              onChange={(template) => onMessageChange({ template })}
            />
            <ul className="edd-var-list">
              {MESSAGE_TAGS.map((item) => (
                <li key={item.tag}>
                  <button
                    type="button"
                    onClick={() => onMessageChange({ template: `${message.template || ""} ${item.tag}`.trim() })}
                  >
                    {item.tag}
                  </button>
                  {" - "}
                  {variableHelp(item.tag)}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="edd-customize-block">
        <h3>Date format</h3>
        <s-select
          label="Date format"
          value={message.dateFormat || DATE_FORMATS.LONG}
          onChange={(event) => onMessageChange({ dateFormat: event.currentTarget.value })}
        >
          {Object.entries(DATE_FORMAT_SAMPLES).map(([value, sample]) => (
            <s-option key={value} value={value}>
              {sample}
            </s-option>
          ))}
        </s-select>
        <s-select
          label="Date separator"
          value={message.dateSeparator || "/"}
          onChange={(event) => onMessageChange({ dateSeparator: event.currentTarget.value })}
        >
          <s-option value="/">/</s-option>
          <s-option value="-">-</s-option>
          <s-option value=".">.</s-option>
        </s-select>
        <s-checkbox
          label="Include year"
          checked={Boolean(message.includeYear)}
          onChange={(event) => onMessageChange({ includeYear: Boolean(event.currentTarget.checked) })}
        ></s-checkbox>
      </section>

      <section className="edd-customize-block edd-icons-panel">
        <h3>Icons & steps</h3>
        <p>Icon, color, label, date, and type size for Purchased, Processing, and Delivered.</p>
        {stepTabsShell({
          includeTypography: true,
          includeMeta: true,
          ariaLabel: "Step icons and text",
        })}
      </section>

      <section className="edd-customize-block">
        <h3>Card background type</h3>
        <HostChoiceList
          label="Card background"
          labelAccessibilityVisibility="exclusive"
          onChange={(event) =>
            setStyle({
              backgroundType: event.currentTarget.values?.[0] || event.currentTarget.value,
            })
          }
        >
          <s-choice value="TRANSPARENT" selected={backgroundType === "TRANSPARENT"}>
            Transparent
          </s-choice>
          <s-choice value="SOLID" selected={backgroundType === "SOLID"}>
            Solid color
          </s-choice>
          <s-choice value="GRADIENT" selected={backgroundType === "GRADIENT"}>
            Gradient
          </s-choice>
        </HostChoiceList>
        {backgroundType === "GRADIENT" ? (
          <s-stack gap="base">
            <s-color-field
              label="Start color"
              value={style.gradientStart}
              onInput={(event) => setStyle({ gradientStart: event.currentTarget.value })}
            ></s-color-field>
            <s-color-field
              label="End color"
              value={style.gradientEnd}
              onInput={(event) => setStyle({ gradientEnd: event.currentTarget.value })}
            ></s-color-field>
            <s-select
              label="Direction"
              value={style.gradientDirection || "TO_BOTTOM"}
              onChange={(event) => {
                const next = event.currentTarget.values?.[0] || event.currentTarget.value;
                if (next) setStyle({ gradientDirection: next });
              }}
            >
              {GRADIENT_DIRECTIONS.map((item) => (
                <s-option key={item.value} value={item.value}>
                  {item.label}
                </s-option>
              ))}
            </s-select>
          </s-stack>
        ) : null}
      </section>

      <section className="edd-customize-block">
        <h3>Spacing & size</h3>
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          <s-number-field
            label="Padding top"
            min={STYLE_NUMBER_LIMITS.padding.min}
            max={STYLE_NUMBER_LIMITS.padding.max}
            step={1}
            suffix="px"
            value={String(style.paddingTop ?? 16)}
            onInput={(event) => onStyleNumber(event, "paddingTop", STYLE_NUMBER_LIMITS.padding, setStyle)}
          ></s-number-field>
          <s-number-field
            label="Padding bottom"
            min={STYLE_NUMBER_LIMITS.padding.min}
            max={STYLE_NUMBER_LIMITS.padding.max}
            step={1}
            suffix="px"
            value={String(style.paddingBottom ?? 12)}
            onInput={(event) => onStyleNumber(event, "paddingBottom", STYLE_NUMBER_LIMITS.padding, setStyle)}
          ></s-number-field>
          <s-number-field
            label="Padding left"
            min={STYLE_NUMBER_LIMITS.padding.min}
            max={STYLE_NUMBER_LIMITS.padding.max}
            step={1}
            suffix="px"
            value={String(style.paddingLeft ?? 16)}
            onInput={(event) => onStyleNumber(event, "paddingLeft", STYLE_NUMBER_LIMITS.padding, setStyle)}
          ></s-number-field>
          <s-number-field
            label="Padding right"
            min={STYLE_NUMBER_LIMITS.padding.min}
            max={STYLE_NUMBER_LIMITS.padding.max}
            step={1}
            suffix="px"
            value={String(style.paddingRight ?? 16)}
            onInput={(event) => onStyleNumber(event, "paddingRight", STYLE_NUMBER_LIMITS.padding, setStyle)}
          ></s-number-field>
        </s-grid>
        <s-number-field
          label="Gap under description"
          min={STYLE_NUMBER_LIMITS.padding.min}
          max={STYLE_NUMBER_LIMITS.padding.max}
          step={1}
          suffix="px"
          value={String(style.paddingMiddle ?? 12)}
          onInput={(event) => onStyleNumber(event, "paddingMiddle", STYLE_NUMBER_LIMITS.padding, setStyle)}
        ></s-number-field>
        <s-number-field
          label="Icon size"
          min={STYLE_NUMBER_LIMITS.iconSize.min}
          max={STYLE_NUMBER_LIMITS.iconSize.max}
          step={1}
          suffix="px"
          value={String(style.iconSize ?? 22)}
          onInput={(event) => onStyleNumber(event, "iconSize", STYLE_NUMBER_LIMITS.iconSize, setStyle)}
        ></s-number-field>
      </section>

      <section className="edd-customize-block">
        <h3>Progress bar</h3>
        <s-color-field
          label="Progress color"
          value={style.progressColor || style.themeColor || "#000000"}
          onInput={(event) => setStyle({ progressColor: event.currentTarget.value })}
        ></s-color-field>
        <s-number-field
          label="Progress thickness"
          min={STYLE_NUMBER_LIMITS.progressWidth.min}
          max={STYLE_NUMBER_LIMITS.progressWidth.max}
          step={1}
          suffix="px"
          value={String(style.progressWidth ?? 3)}
          onInput={(event) => onStyleNumber(event, "progressWidth", STYLE_NUMBER_LIMITS.progressWidth, setStyle)}
        ></s-number-field>
      </section>

      <section className="edd-customize-block">
        <h3>Typography</h3>
        <p>Shared font, description size, and accent color. Step text sizes are in Icons & steps.</p>
        <s-select
          label="Font"
          value={style.fontFamily || "inherit"}
          onChange={(event) => setStyle({ fontFamily: event.currentTarget.value })}
        >
          {FONT_OPTIONS.map((item) => (
            <s-option key={item.value} value={item.value}>
              {item.label === "Theme default" ? "Use your theme fonts" : item.label}
            </s-option>
          ))}
        </s-select>
        <s-grid gridTemplateColumns="1fr auto" gap="base">
          <s-number-field
            label="Description size"
            min={STYLE_NUMBER_LIMITS.fontSize.min}
            max={STYLE_NUMBER_LIMITS.fontSize.max}
            step={1}
            suffix="px"
            value={String(style.fontSize ?? 14)}
            onInput={(event) => onStyleNumber(event, "fontSize", STYLE_NUMBER_LIMITS.fontSize, setStyle)}
          ></s-number-field>
          <s-color-field
            label="Description color"
            value={style.textColor || "#202223"}
            onInput={(event) => setStyle({ textColor: event.currentTarget.value })}
          ></s-color-field>
        </s-grid>
        <s-color-field
          label="Dynamic / accent text"
          value={style.dynamicColor || "#202223"}
          onInput={(event) => setStyle({ dynamicColor: event.currentTarget.value })}
        ></s-color-field>
      </section>

      <ConnectorCustomization tracker={tracker} commitTracker={commitTracker} />

      {checkDeliverySection}

      <section className="edd-customize-block">
        <h3>Custom CSS</h3>
        <p>Optional storefront-only CSS. The live preview does not apply these rules. Save, then open Preview in store.</p>
        <p className="edd-css-note__label">Classes you can use</p>
        <ul className="edd-css-note">
          <li><code>.edd-widget</code> - whole card. Start rules with this.</li>
          <li><code>.edd-widget__heading</code> - title</li>
          <li><code>.edd-widget__message</code> - description and countdown</li>
          <li><code>.edd-widget__timeline</code> - step row</li>
          <li><code>.edd-widget__icon</code> - step icon</li>
          <li><code>.edd-widget__date</code> - date under the icon</li>
          <li><code>.edd-widget__label</code> - label under the icon</li>
          <li><code>.edd-widget__connector</code> - line between steps</li>
          <li><code>.edd-check</code> - check delivery block</li>
          <li><code>.edd-check__input</code> - pincode field</li>
          <li><code>.edd-check__button</code> - check button</li>
        </ul>
        <CustomCssField value={style.customCss || ""} onChange={(customCss) => setStyle({ customCss })} />
      </section>
    </s-stack>
  );
}
