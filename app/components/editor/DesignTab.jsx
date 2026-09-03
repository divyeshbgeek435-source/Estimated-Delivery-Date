import { FONT_OPTIONS, GRADIENT_DIRECTIONS, TEMPLATE_COLORS, TEMPLATE_STYLE_PRESETS, TEMPLATE_TITLE_PRESETS, WIDGET_DESIGNS } from "../../lib/constants";
import { widgetProfile } from "../../lib/widget-profiles";
import { HostChoiceList } from "../common/ActionButton";
import { IconMediaPicker } from "../common/IconMediaPicker";

export function DesignTab({ widget, draft, onChange, errors = {} }) {
  const style = draft.styleConfig;
  const icons = draft.iconConfig;
  const setStyle = (patch) => onChange({ ...draft, styleConfig: { ...style, ...patch } });
  const setIcons = (patch) => onChange({ ...draft, iconConfig: { ...icons, ...patch } });
  const backgroundType = style.backgroundType || "SOLID";
  const profile = widgetProfile(widget?.location);
  const design = draft.messageConfig?.designTemplate || "TIMELINE";
  const themeColor = style.themeColor || "#000000";

  const applyTemplate = (value) => {
    const titles = TEMPLATE_TITLE_PRESETS[value];
    const preset = TEMPLATE_STYLE_PRESETS[value] || {};
    const defaultTitles = new Set(["Purchased", "Processing", "Delivered", "Order Confirmed", "Shipped", "At Your Doorstep"]);
    const nextIcons = defaultTitles.has(icons.purchasedTitle)
      ? { ...icons, ...(titles || { purchasedTitle: "Purchased", processingTitle: "Processing", deliveredTitle: "Delivered" }) }
      : icons;
    const namedTemplate = value === "TRACKER" || value === "BANNER" || value === "CARD";
    onChange({
      ...draft,
      iconConfig: nextIcons,
      messageConfig: {
        ...draft.messageConfig,
        designTemplate: value,
        widgetLayout: value === "BANNER" || value === "COMPACT" ? "MINIMAL" : "FULL",
        heading: draft.messageConfig?.heading || (namedTemplate ? "Estimated Delivery Date" : ""),
      },
      styleConfig: { ...style, ...preset },
    });
  };

  const applyTheme = (color) =>
    setStyle({
      themeColor: color,
      progressColor: color,
      textColor: color,
      statusColor: color,
      dateColor: color,
      dynamicColor: color,
    });

  return (
    <s-stack gap="large">
      {profile.showFullDesign ? (
        <s-section heading="Widget templates">
          <s-paragraph color="subdued">Pick a layout, then customize colors and images. The live preview updates immediately.</s-paragraph>
          <div className="edd-design-grid">
            {WIDGET_DESIGNS.map((item) => {
              const selected = design === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={`edd-design-card ${selected ? "edd-design-card--selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => applyTemplate(item.value)}
                >
                  <span className={`edd-design-thumb edd-design-thumb--${item.value.toLowerCase()}`} aria-hidden="true" />
                  <strong>{item.label}</strong>
                  <span>{item.help}</span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="designTemplate" value={design} />
        <s-text type="strong">Template colors</s-text>
        <s-paragraph color="subdued">Choose a preset or pick any color. It updates icons, dates, and the progress line.</s-paragraph>
        <div className="edd-swatches">
          {TEMPLATE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="edd-swatch"
              style={{ background: color }}
              aria-label={`Use ${color}`}
              aria-pressed={themeColor.toLowerCase() === color.toLowerCase()}
              onClick={() => applyTheme(color)}
            />
          ))}
        </div>
        <s-color-field
          label="Custom template color"
          name="themeColor"
          value={themeColor}
          onInput={(event) => applyTheme(event.currentTarget.value)}
        ></s-color-field>
      </s-section>
      ) : (
        <>
          <s-banner heading="Checkout design limits">
            Checkout uses Shopify checkout components. Colors and message still apply; spacing, custom CSS, and timeline styles do not.
          </s-banner>
          <input type="hidden" name="themeColor" value={style.themeColor || "#000000"} />
        </>
      )}

      {profile.showFullDesign ? (
        <s-section heading="Template images">
          <s-paragraph color="subdued">Upload an image, paste a URL, or choose a built-in icon. Changes apply to this widget only.</s-paragraph>
          {(design === "TRACKER" || design === "BANNER" || design === "CARD") ? (
            <>
              <s-text-field
                label="Template title"
                name="heading"
                value={draft.messageConfig?.heading || ""}
                placeholder="Estimated Delivery Date"
                onInput={(event) =>
                  onChange({
                    ...draft,
                    messageConfig: { ...draft.messageConfig, heading: event.currentTarget.value },
                  })
                }
              ></s-text-field>
              <input type="hidden" name="headerIcon" value={icons.headerIcon || "flag"} />
              <input type="hidden" name="headerIconEnabled" value={icons.headerIconEnabled !== false ? "true" : "false"} />
            </>
          ) : (
            <>
              <input type="hidden" name="heading" value={draft.messageConfig?.heading || ""} />
              <input type="hidden" name="headerIcon" value={icons.headerIcon || "flag"} />
              <input type="hidden" name="headerIconEnabled" value={icons.headerIconEnabled !== false ? "true" : "false"} />
            </>
          )}
          <div className="edd-template-images">
            {design === "TRACKER" || design === "BANNER" || design === "CARD" ? (
              <IconMediaPicker
                title="Header image"
                label="Header image"
                value={icons.headerIcon || "flag"}
                fallback="flag"
                color={themeColor}
                enabled={icons.headerIconEnabled !== false}
                onEnabledChange={(headerIconEnabled) => setIcons({ headerIconEnabled })}
                onChange={(headerIcon) => setIcons({ headerIcon })}
              />
            ) : null}
            {design === "BANNER" || design === "CARD" ? null : (
              <>
                <IconMediaPicker
                  title={icons.purchasedTitle || "Purchased"}
                  label={icons.purchasedTitle || "Purchased"}
                  value={icons.purchased}
                  fallback="bag"
                  color={icons.purchasedColor || themeColor}
                  enabled={icons.purchasedEnabled !== false}
                  onEnabledChange={(purchasedEnabled) => setIcons({ purchasedEnabled })}
                  onChange={(purchased) => setIcons({ purchased })}
                />
                <IconMediaPicker
                  title={icons.processingTitle || "Processing"}
                  label={icons.processingTitle || "Processing"}
                  value={icons.processing}
                  fallback="truck"
                  color={icons.processingColor || themeColor}
                  enabled={icons.processingEnabled !== false}
                  onEnabledChange={(processingEnabled) => setIcons({ processingEnabled })}
                  onChange={(processing) => setIcons({ processing })}
                />
                <IconMediaPicker
                  title={icons.deliveredTitle || "Delivered"}
                  label={icons.deliveredTitle || "Delivered"}
                  value={icons.delivered}
                  fallback="pin"
                  color={icons.deliveredColor || themeColor}
                  enabled={icons.deliveredEnabled !== false}
                  onEnabledChange={(deliveredEnabled) => setIcons({ deliveredEnabled })}
                  onChange={(delivered) => setIcons({ delivered })}
                />
              </>
            )}
          </div>
        </s-section>
      ) : null}

      <s-section heading="Card background">
        <input type="hidden" name="backgroundType" value={backgroundType} />
        <HostChoiceList
          label="Card background"
          name="backgroundTypeField"
          onChange={(event) =>
            setStyle({ backgroundType: event.currentTarget.values?.[0] || event.currentTarget.value })
          }
        >
          <s-choice value="TRANSPARENT" selected={backgroundType === "TRANSPARENT"}>
            Transparent background
          </s-choice>
          <s-choice value="SOLID" selected={backgroundType === "SOLID"}>
            Single color background
          </s-choice>
          <s-choice value="GRADIENT" selected={backgroundType === "GRADIENT"}>
            Gradient background
          </s-choice>
        </HostChoiceList>
        {backgroundType === "GRADIENT" ? (
          <s-stack gap="base">
            <s-color-field
              label="Start color"
              name="gradientStart"
              value={style.gradientStart}
              error={errors.gradientStart}
              onInput={(event) => setStyle({ gradientStart: event.currentTarget.value })}
            ></s-color-field>
            <s-color-field
              label="End color"
              name="gradientEnd"
              value={style.gradientEnd}
              error={errors.gradientEnd}
              onInput={(event) => setStyle({ gradientEnd: event.currentTarget.value })}
            ></s-color-field>
            <s-select
              label="Direction"
              name="gradientDirection"
              value={style.gradientDirection}
              onChange={(event) => setStyle({ gradientDirection: event.currentTarget.value })}
            >
              {GRADIENT_DIRECTIONS.map((item) => (
                <s-option key={item.value} value={item.value}>
                  {item.label}
                </s-option>
              ))}
            </s-select>
            <input type="hidden" name="backgroundColor" value={style.backgroundColor} />
          </s-stack>
        ) : backgroundType === "SOLID" ? (
          <s-stack gap="base">
            <s-color-field
              label="Background color"
              name="backgroundColor"
              value={style.backgroundColor}
              error={errors.backgroundColor}
              onInput={(event) => setStyle({ backgroundColor: event.currentTarget.value })}
            ></s-color-field>
            <input type="hidden" name="gradientStart" value={style.gradientStart} />
            <input type="hidden" name="gradientEnd" value={style.gradientEnd} />
            <input type="hidden" name="gradientDirection" value={style.gradientDirection} />
          </s-stack>
        ) : (
          <>
            <input type="hidden" name="backgroundColor" value={style.backgroundColor || "#FFFFFF"} />
            <input type="hidden" name="gradientStart" value={style.gradientStart} />
            <input type="hidden" name="gradientEnd" value={style.gradientEnd} />
            <input type="hidden" name="gradientDirection" value={style.gradientDirection} />
          </>
        )}
      </s-section>

      <s-section heading="Border">
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          <s-number-field
            label="Radius"
            name="borderRadius"
            min={0}
            max={32}
            suffix="px"
            value={String(style.borderRadius ?? 8)}
            error={errors.borderRadius}
            onInput={(event) => setStyle({ borderRadius: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-number-field
            label="Width"
            name="borderWidth"
            min={0}
            max={12}
            suffix="px"
            value={String(style.borderWidth ?? 0)}
            onInput={(event) => setStyle({ borderWidth: Number(event.currentTarget.value) })}
          ></s-number-field>
        </s-grid>
        <s-color-field
          label="Color"
          name="borderColor"
          value={style.borderColor || "#E1E3E5"}
          onInput={(event) => setStyle({ borderColor: event.currentTarget.value })}
        ></s-color-field>
      </s-section>

      {profile.showFullDesign ? (
        <>
      <s-section heading="Outer spacing">
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          <s-number-field
            label="Top"
            name="paddingTop"
            min={0}
            max={64}
            suffix="px"
            value={String(style.paddingTop ?? 16)}
            onInput={(event) => setStyle({ paddingTop: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-number-field
            label="Bottom"
            name="paddingBottom"
            min={0}
            max={64}
            suffix="px"
            value={String(style.paddingBottom ?? 12)}
            onInput={(event) => setStyle({ paddingBottom: Number(event.currentTarget.value) })}
          ></s-number-field>
        </s-grid>
        <s-number-field
          label="Between description and widget"
          name="paddingMiddle"
          min={0}
          max={64}
          suffix="px"
          value={String(style.paddingMiddle ?? 12)}
          onInput={(event) => setStyle({ paddingMiddle: Number(event.currentTarget.value) })}
        ></s-number-field>
      </s-section>

      <s-section heading="Inner spacing">
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          <s-number-field
            label="Top"
            min={0}
            max={64}
            suffix="px"
            value={String(style.paddingTop ?? 16)}
            onInput={(event) => setStyle({ paddingTop: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-number-field
            label="Bottom"
            min={0}
            max={64}
            suffix="px"
            value={String(style.paddingBottom ?? 12)}
            onInput={(event) => setStyle({ paddingBottom: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-number-field
            label="Left"
            name="paddingLeft"
            min={0}
            max={64}
            suffix="px"
            value={String(style.paddingLeft ?? 16)}
            onInput={(event) => setStyle({ paddingLeft: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-number-field
            label="Right"
            name="paddingRight"
            min={0}
            max={64}
            suffix="px"
            value={String(style.paddingRight ?? 16)}
            onInput={(event) => setStyle({ paddingRight: Number(event.currentTarget.value) })}
          ></s-number-field>
        </s-grid>
      </s-section>

      <s-section heading="Icon size">
        <s-number-field
          label="Icon size"
          name="iconSize"
          min={12}
          max={72}
          suffix="px"
          value={String(style.iconSize ?? 22)}
          onInput={(event) => setStyle({ iconSize: Number(event.currentTarget.value) })}
        ></s-number-field>
      </s-section>

      <s-section heading="Progress line color">
        <s-color-field
          label="Progress line"
          name="progressColor"
          value={style.progressColor || style.themeColor || "#000000"}
          onInput={(event) => setStyle({ progressColor: event.currentTarget.value })}
        ></s-color-field>
        <s-number-field
          label="Progress line size"
          name="progressWidth"
          min={1}
          max={8}
          suffix="px"
          value={String(style.progressWidth ?? 3)}
          onInput={(event) => setStyle({ progressWidth: Number(event.currentTarget.value) })}
        ></s-number-field>
      </s-section>
        </>
      ) : null}

      <s-section heading="Typography">
        <s-select
          label="Font"
          name="fontFamily"
          value={style.fontFamily || "inherit"}
          details="Use your theme fonts. Theme fonts are not available in the preview mode. Publish form to preview it in store."
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
            label="Description"
            name="fontSize"
            min={10}
            max={24}
            suffix="px"
            value={String(style.fontSize ?? 14)}
            onInput={(event) => setStyle({ fontSize: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-color-field
            label="Description color"
            name="textColor"
            value={style.textColor || "#202223"}
            onInput={(event) => setStyle({ textColor: event.currentTarget.value })}
          ></s-color-field>
          <s-number-field
            label="Status label"
            name="statusFontSize"
            min={8}
            max={24}
            suffix="px"
            value={String(style.statusFontSize ?? 12)}
            onInput={(event) => setStyle({ statusFontSize: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-color-field
            label="Status color"
            name="statusColor"
            value={style.statusColor || "#202223"}
            onInput={(event) => setStyle({ statusColor: event.currentTarget.value })}
          ></s-color-field>
          <s-number-field
            label="Date label"
            name="dateFontSize"
            min={8}
            max={24}
            suffix="px"
            value={String(style.dateFontSize ?? 11)}
            onInput={(event) => setStyle({ dateFontSize: Number(event.currentTarget.value) })}
          ></s-number-field>
          <s-color-field
            label="Date color"
            name="dateColor"
            value={style.dateColor || "#202223"}
            onInput={(event) => setStyle({ dateColor: event.currentTarget.value })}
          ></s-color-field>
        </s-grid>
        <s-color-field
          label="Dynamic content"
          name="dynamicColor"
          value={style.dynamicColor || "#202223"}
          onInput={(event) => setStyle({ dynamicColor: event.currentTarget.value })}
        ></s-color-field>
      </s-section>

      {profile.showFullDesign ? (
      <s-section heading="Custom Css">
        <s-text-area
          label="Custom CSS"
          name="customCss"
          rows={5}
          value={style.customCss || ""}
          details="/* Add your custom CSS here */"
          onInput={(event) => setStyle({ customCss: event.currentTarget.value })}
        ></s-text-area>
        <s-paragraph color="subdued">Available classes</s-paragraph>
        <ul className="edd-var-list">
          <li>essential-estimated-delivery-widget — Main widget container</li>
          <li>essential-estimated-delivery-description — Description/content text section</li>
          <li>essential-estimated-delivery-card — Widget card</li>
        </ul>
      </s-section>
      ) : null}
    </s-stack>
  );
}
