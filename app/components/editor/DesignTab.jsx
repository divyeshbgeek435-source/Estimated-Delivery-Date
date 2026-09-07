import { ANIMATED_DESIGNS, DATE_FORMATS, FONT_OPTIONS, GRADIENT_DIRECTIONS, HEADING_WEIGHT_OPTIONS, MESSAGE_TAGS, TEMPLATE_COLORS, TEMPLATE_STYLE_PRESETS, TEMPLATE_TITLE_PRESETS, TRANSLATION_LOCALES, WIDGET_DESIGNS } from "../../lib/constants";
import { widgetProfile } from "../../lib/widget-profiles";
import { ActionButton, HostChoiceList } from "../common/ActionButton";
import { IconMediaPicker } from "../common/IconMediaPicker";

const DATE_FORMAT_SAMPLES = {
  [DATE_FORMATS.LONG]: "Aug 21, 2026",
  [DATE_FORMATS.NUMERIC_DMY]: "21/08/2026",
  [DATE_FORMATS.NUMERIC_MDY]: "08/21/2026",
};

function DesignThumb({ design, selected = false }) {
  if (design === "MOMENT") {
    return (
      <span className={`edd-design-thumb edd-design-thumb--moment${selected ? " is-selected" : ""}`} aria-hidden="true">
        <span className="edd-design-thumb__head">Moment Meter</span>
        <span className="edd-design-thumb__moment-rail" />
        <span className="edd-design-thumb__steps">
          <span className="edd-design-thumb__step"><i /><em>Order On</em></span>
          <span className="edd-design-thumb__step"><i /><em>Production</em></span>
          <span className="edd-design-thumb__step"><i /><em>Delivered</em></span>
        </span>
      </span>
    );
  }
  if (design === "BUBBLE") {
    return (
      <span className={`edd-design-thumb edd-design-thumb--bubble${selected ? " is-selected" : ""}`} aria-hidden="true">
        <span className="edd-design-thumb__banner-line" />
        <span className="edd-design-thumb__steps">
          <span className="edd-design-thumb__bubble" />
          <span className="edd-design-thumb__bubble" />
          <span className="edd-design-thumb__bubble" />
        </span>
      </span>
    );
  }
  if (design === "EXPRESS") {
    return (
      <span className={`edd-design-thumb edd-design-thumb--express${selected ? " is-selected" : ""}`} aria-hidden="true">
        <span className="edd-design-thumb__head">FREE & FAST</span>
        <span className="edd-design-thumb__steps">
          <span className="edd-design-thumb__circle" />
          <span className="edd-design-thumb__circle" />
          <span className="edd-design-thumb__circle" />
        </span>
      </span>
    );
  }
  if (design === "SEGMENTS") {
    return (
      <span className={`edd-design-thumb edd-design-thumb--segments${selected ? " is-selected" : ""}`} aria-hidden="true">
        <span /><span /><span />
      </span>
    );
  }
  if (design === "METER") {
    return (
      <span className={`edd-design-thumb edd-design-thumb--meter${selected ? " is-selected" : ""}`} aria-hidden="true">
        <span className="edd-design-thumb__meter-fill" />
        <span className="edd-design-thumb__steps">
          <span className="edd-design-thumb__circle" />
          <span className="edd-design-thumb__circle" />
          <span className="edd-design-thumb__circle" />
        </span>
      </span>
    );
  }
  if (design === "BAND") {
    return (
      <span className={`edd-design-thumb edd-design-thumb--band${selected ? " is-selected" : ""}`} aria-hidden="true">
        <span /><span /><span />
      </span>
    );
  }
  if (design === "JOURNEY") {
    return (
      <span className={`edd-design-thumb edd-design-thumb--journey${selected ? " is-selected" : ""}`} aria-hidden="true">
        <span className="edd-design-thumb__head">Estimated Delivery Date <b>Sep 5 to Sep 8</b></span>
        <span className="edd-design-thumb__shell">
          <span className="edd-design-thumb__rail" />
          <span className="edd-design-thumb__steps">
            <span className="edd-design-thumb__step">
              <i className="edd-design-thumb__icon edd-design-thumb__icon--box" />
              <em>Order Confirmed</em>
              <b>Sep 3</b>
            </span>
            <span className="edd-design-thumb__step">
              <i className="edd-design-thumb__icon edd-design-thumb__icon--truck" />
              <em>Shipped</em>
              <b>Sep 5</b>
            </span>
            <span className="edd-design-thumb__step">
              <i className="edd-design-thumb__icon edd-design-thumb__icon--home" />
              <em>At Your Doorstep</em>
              <b>Sep 8</b>
            </span>
          </span>
        </span>
      </span>
    );
  }

  if (design === "TRACKER") {
    return (
      <span className="edd-design-thumb edd-design-thumb--tracker" aria-hidden="true">
        <span className="edd-design-thumb__head edd-design-thumb__head--tracker">
          <i className="edd-design-thumb__flag" />
          Estimated Delivery Date <b>Sep 7 to Sep 8</b>
        </span>
        <span className="edd-design-thumb__steps edd-design-thumb__steps--tracker">
          <span className="edd-design-thumb__step">
            <i className="edd-design-thumb__dot" />
            <em>Order Confirmed</em>
            <b>Sep 3</b>
          </span>
          <span className="edd-design-thumb__dots" />
          <span className="edd-design-thumb__step">
            <i className="edd-design-thumb__dot" />
            <em>Shipped</em>
            <b>Sep 5</b>
          </span>
          <span className="edd-design-thumb__dots" />
          <span className="edd-design-thumb__step">
            <i className="edd-design-thumb__dot" />
            <em>Doorstep</em>
            <b>Sep 8</b>
          </span>
        </span>
      </span>
    );
  }

  return <span className={`edd-design-thumb edd-design-thumb--${design.toLowerCase()}`} aria-hidden="true" />;
}

export function DesignTab({ widget, draft, onChange, errors = {} }) {
  const style = draft.styleConfig;
  const icons = draft.iconConfig;
  const message = draft.messageConfig;
  const setStyle = (patch) => onChange({ ...draft, styleConfig: { ...style, ...patch } });
  const setIcons = (patch) => onChange({ ...draft, iconConfig: { ...icons, ...patch } });
  const setMessage = (patch) => onChange({ ...draft, messageConfig: { ...message, ...patch } });
  const setSavedIcons = (savedIcons) => setIcons({ savedIcons });
  const iconLibrary = icons.savedIcons || [];
  const backgroundType = style.backgroundType || "SOLID";
  const profile = widgetProfile(widget?.location);
  const design = draft.messageConfig?.designTemplate || "TIMELINE";
  const themeColor = style.themeColor || "#000000";
  const descriptionEnabled = message.descriptionEnabled !== false;
  const headingEnabled = message.headingEnabled !== false;
  const headingWeight = Number(style.headingFontWeight) || 600;
  const translations = message.translations || {};
  const adding = Boolean(draft.addingTranslation);
  const locale = draft.translationLocale || TRANSLATION_LOCALES[0].value;
  const current = translations[locale] || {
    template: message.template,
    purchasedTitle: icons.purchasedTitle,
    processingTitle: icons.processingTitle,
    deliveredTitle: icons.deliveredTitle,
  };

  const applyTemplate = (value) => {
    const titles = TEMPLATE_TITLE_PRESETS[value];
    const preset = TEMPLATE_STYLE_PRESETS[value] || {};
    const defaultTitles = new Set([
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
    ]);
    const namedTemplate = value === "TRACKER" || value === "BANNER" || value === "CARD" || ANIMATED_DESIGNS.has(value);
    const nextIcons =
      defaultTitles.has(icons.purchasedTitle) || ANIMATED_DESIGNS.has(value)
        ? { ...icons, ...(titles || { purchasedTitle: "Purchased", processingTitle: "Processing", deliveredTitle: "Delivered" }) }
        : icons;
    const headingDefault =
      value === "MOMENT"
        ? "Moment Meter. Time is Ticking"
        : value === "EXPRESS"
          ? "FREE & FAST DELIVERY"
          : namedTemplate
            ? "Estimated Delivery Date"
            : "";
    const wasDescriptionOff = draft.messageConfig?.descriptionEnabled === false;
    const momentTemplate = "Order today to get delivery between {delivery_from} to {delivery_to}";
    const expressTemplate = "Estimated Delivery Date {delivery_date}";
    let nextTemplate = draft.messageConfig?.template;
    let nextDescriptionEnabled = draft.messageConfig?.descriptionEnabled !== false;
    if (value === "MOMENT" && (wasDescriptionOff || !nextTemplate)) {
      nextTemplate = momentTemplate;
      nextDescriptionEnabled = true;
    } else if (value === "EXPRESS" && wasDescriptionOff) {
      nextTemplate = expressTemplate;
      nextDescriptionEnabled = true;
    }
    onChange({
      ...draft,
      iconConfig: value === "JOURNEY" ? { ...nextIcons, headerIconEnabled: false } : nextIcons,
      messageConfig: {
        ...draft.messageConfig,
        designTemplate: value,
        widgetLayout: value === "BANNER" || value === "COMPACT" ? "MINIMAL" : "FULL",
        heading: namedTemplate ? draft.messageConfig?.heading || headingDefault : draft.messageConfig?.heading || "",
        descriptionEnabled: nextDescriptionEnabled,
        template: nextTemplate,
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
                  <DesignThumb key={`thumb-${item.value}-${selected ? "on" : "off"}`} design={item.value} selected={selected} />
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
        <s-section heading="Template title & header">
          <s-paragraph color="subdued">
            Turn the title and header icon on or off for any template. Weight controls how bold the title looks.
          </s-paragraph>
          <s-checkbox
            label="Enable title"
            name="headingEnabled"
            checked={headingEnabled}
            onChange={(event) => setMessage({ headingEnabled: Boolean(event.currentTarget.checked) })}
          ></s-checkbox>
          {headingEnabled ? (
            <>
              <s-text-field
                label="Template title"
                name="heading"
                value={draft.messageConfig?.heading || ""}
                placeholder="Estimated Delivery Date"
                onInput={(event) => setMessage({ heading: event.currentTarget.value })}
              ></s-text-field>
              <s-select
                label="Title weight"
                name="headingFontWeight"
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
          ) : (
            <>
              <input type="hidden" name="heading" value={draft.messageConfig?.heading || ""} />
              <input type="hidden" name="headingFontWeight" value={String(headingWeight)} />
            </>
          )}
          <input type="hidden" name="widgetLayout" value={message.widgetLayout || "FULL"} />
          <IconMediaPicker
            title="Header icon"
            label="Header icon"
            name="headerIcon"
            value={icons.headerIcon || "flag"}
            fallback="flag"
            color={themeColor}
            enabled={icons.headerIconEnabled !== false}
            library={iconLibrary}
            onLibraryChange={setSavedIcons}
            onEnabledChange={(headerIconEnabled) => setIcons({ headerIconEnabled })}
            onChange={(headerIcon) => setIcons({ headerIcon })}
          />
          <input type="hidden" name="headerIconEnabled" value={icons.headerIconEnabled !== false ? "true" : "false"} />
        </s-section>
      ) : (
        <>
          <input type="hidden" name="heading" value={message.heading || "Estimated Delivery"} />
          <input type="hidden" name="headingEnabled" value={message.headingEnabled !== false ? "true" : "false"} />
          <input type="hidden" name="headingFontWeight" value={String(style.headingFontWeight || 600)} />
          <input type="hidden" name="headerIcon" value={icons.headerIcon || "flag"} />
          <input type="hidden" name="headerIconEnabled" value={icons.headerIconEnabled !== false ? "true" : "false"} />
          <input type="hidden" name="widgetLayout" value={message.widgetLayout || "FULL"} />
        </>
      )}

      <s-section heading="Description">
        <s-checkbox
          label="Enable description"
          name="descriptionEnabled"
          checked={descriptionEnabled}
          onChange={(event) => setMessage({ descriptionEnabled: Boolean(event.currentTarget.checked) })}
        ></s-checkbox>
        {descriptionEnabled ? (
          <s-text-area
            label="Description"
            name="template"
            rows={3}
            value={message.template}
            error={errors.template}
            onInput={(event) => setMessage({ template: event.currentTarget.value })}
          ></s-text-area>
        ) : (
          <input type="hidden" name="template" value={message.template} />
        )}
        <s-paragraph color="subdued">Available variables</s-paragraph>
        <ul className="edd-var-list">
          {MESSAGE_TAGS.map((item) => (
            <li key={item.tag}>
              <button
                type="button"
                onClick={() =>
                  descriptionEnabled && setMessage({ template: `${message.template || ""} ${item.tag}`.trim() })
                }
              >
                {item.tag}
              </button>
              {" — "}
              {variableHelp(item.tag)}
            </li>
          ))}
        </ul>
      </s-section>

      <s-section heading="Date format">
        <input type="hidden" name="dateFormat" value={message.dateFormat || DATE_FORMATS.LONG} />
        <s-select
          label="Date format"
          value={message.dateFormat || DATE_FORMATS.LONG}
          onChange={(event) => setMessage({ dateFormat: event.currentTarget.value })}
        >
          {Object.entries(DATE_FORMAT_SAMPLES).map(([value, sample]) => (
            <s-option key={value} value={value}>
              {sample}
            </s-option>
          ))}
        </s-select>
        <s-select
          label="Date separator"
          name="dateSeparator"
          value={message.dateSeparator || "/"}
          onChange={(event) => setMessage({ dateSeparator: event.currentTarget.value })}
        >
          <s-option value="/">/</s-option>
          <s-option value="-">-</s-option>
          <s-option value=".">.</s-option>
        </s-select>
        <s-checkbox
          label="Include year"
          name="includeYear"
          checked={Boolean(message.includeYear)}
          onChange={(event) => setMessage({ includeYear: Boolean(event.currentTarget.checked) })}
        ></s-checkbox>
      </s-section>

      {profile.showIcons ? (
        <s-section heading="Milestone labels & icons">
          <s-paragraph color="subdued">Titles, icons, and colors for each delivery step.</s-paragraph>
          <IconEditor
            heading="First step"
            titleName="purchasedTitle"
            titleValue={icons.purchasedTitle || "Purchased"}
            iconName="purchased"
            iconValue={icons.purchased}
            iconEnabled={icons.purchasedEnabled !== false}
            colorName="purchasedColor"
            colorValue={icons.purchasedColor}
            error={errors.purchasedTitle}
            onTitle={(purchasedTitle) => setIcons({ purchasedTitle })}
            onIcon={(purchased) => setIcons({ purchased })}
            onEnabled={(purchasedEnabled) => setIcons({ purchasedEnabled })}
            onColor={(purchasedColor) => setIcons({ purchasedColor })}
            library={iconLibrary}
            onLibraryChange={setSavedIcons}
          />
          <IconEditor
            heading="Second step"
            titleName="processingTitle"
            titleValue={icons.processingTitle || "Processing"}
            iconName="processing"
            iconValue={icons.processing}
            iconEnabled={icons.processingEnabled !== false}
            colorName="processingColor"
            colorValue={icons.processingColor}
            error={errors.processingTitle}
            onTitle={(processingTitle) => setIcons({ processingTitle })}
            onIcon={(processing) => setIcons({ processing })}
            onEnabled={(processingEnabled) => setIcons({ processingEnabled })}
            onColor={(processingColor) => setIcons({ processingColor })}
            library={iconLibrary}
            onLibraryChange={setSavedIcons}
          />
          <IconEditor
            heading="Third step"
            titleName="deliveredTitle"
            titleValue={icons.deliveredTitle || "Delivered"}
            iconName="delivered"
            iconValue={icons.delivered}
            iconEnabled={icons.deliveredEnabled !== false}
            colorName="deliveredColor"
            colorValue={icons.deliveredColor}
            error={errors.deliveredTitle}
            onTitle={(deliveredTitle) => setIcons({ deliveredTitle })}
            onIcon={(delivered) => setIcons({ delivered })}
            onEnabled={(deliveredEnabled) => setIcons({ deliveredEnabled })}
            onColor={(deliveredColor) => setIcons({ deliveredColor })}
            library={iconLibrary}
            onLibraryChange={setSavedIcons}
          />
        </s-section>
      ) : (
        <>
          <input type="hidden" name="purchased" value={icons.purchased} />
          <input type="hidden" name="processing" value={icons.processing} />
          <input type="hidden" name="delivered" value={icons.delivered} />
          <input type="hidden" name="purchasedTitle" value={icons.purchasedTitle || "Purchased"} />
          <input type="hidden" name="processingTitle" value={icons.processingTitle || "Processing"} />
          <input type="hidden" name="deliveredTitle" value={icons.deliveredTitle || "Delivered"} />
        </>
      )}

      <s-section heading="Translations">
        {adding ? (
          <>
            <s-select
              label="Language"
              name="translationLocale"
              value={locale}
              onChange={(event) => onChange({ ...draft, translationLocale: event.currentTarget.value })}
            >
              {TRANSLATION_LOCALES.map((item) => (
                <s-option key={item.value} value={item.value}>
                  {item.label}
                </s-option>
              ))}
            </s-select>
            <s-text-area
              label="Translated description"
              rows={3}
              value={current.template || ""}
              onInput={(event) =>
                setMessage({
                  translations: {
                    ...translations,
                    [locale]: { ...current, template: event.currentTarget.value },
                  },
                })
              }
            ></s-text-area>
            <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
              <s-text-field
                label="Purchased title"
                value={current.purchasedTitle || ""}
                onInput={(event) =>
                  setMessage({
                    translations: {
                      ...translations,
                      [locale]: { ...current, purchasedTitle: event.currentTarget.value },
                    },
                  })
                }
              ></s-text-field>
              <s-text-field
                label="Processing title"
                value={current.processingTitle || ""}
                onInput={(event) =>
                  setMessage({
                    translations: {
                      ...translations,
                      [locale]: { ...current, processingTitle: event.currentTarget.value },
                    },
                  })
                }
              ></s-text-field>
              <s-text-field
                label="Delivered title"
                value={current.deliveredTitle || ""}
                onInput={(event) =>
                  setMessage({
                    translations: {
                      ...translations,
                      [locale]: { ...current, deliveredTitle: event.currentTarget.value },
                    },
                  })
                }
              ></s-text-field>
            </s-grid>
          </>
        ) : (
          <ActionButton type="button" onClick={() => onChange({ ...draft, addingTranslation: true })}>
            Add Translation
          </ActionButton>
        )}
        <input type="hidden" name="translations" value={JSON.stringify(translations)} />
      </s-section>

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

function variableHelp(tag) {
  const help = {
    "{counter}": "Displays time counter, which runs until processing cutoff time.",
    "{ordered_date}": "Date when order was placed",
    "{processing_from}": "Estimated processing from date",
    "{processing_to}": "Estimated processing to date",
    "{delivery_from}": "Estimated delivery from date",
    "{delivery_to}": "Estimated delivery to date",
    "{delivery_date}": "Full delivery date range (from–to)",
    "{stock_left}": "Number of items left in stock",
    "{product_name}": "Name of the product",
    "{image}": "Inserts the header image inline in the description",
  };
  return help[tag] || "";
}

function IconEditor({
  heading,
  titleName,
  titleValue,
  iconName,
  iconValue,
  iconEnabled = true,
  colorName,
  colorValue,
  error,
  onTitle,
  onIcon,
  onEnabled,
  onColor,
  library = [],
  onLibraryChange,
}) {
  const filtered = Boolean(colorValue);
  return (
    <s-stack gap="small-200">
      <s-text type="strong">{heading}</s-text>
      <s-text-field
        label="Title"
        name={titleName}
        value={titleValue}
        error={error}
        onInput={(event) => onTitle(event.currentTarget.value)}
      ></s-text-field>
      <IconMediaPicker
        title="Icon"
        name={iconName}
        value={iconValue}
        fallback={iconName === "processing" ? "truck" : iconName === "delivered" ? "pin" : "bag"}
        color={colorValue || "#202223"}
        error={error}
        enabled={iconEnabled}
        library={library}
        onLibraryChange={onLibraryChange}
        onEnabledChange={onEnabled}
        onChange={onIcon}
      />
      <s-checkbox
        label="Apply color filter"
        checked={filtered}
        disabled={!iconEnabled}
        onChange={(event) => onColor(event.currentTarget.checked ? colorValue || "#000000" : "")}
      ></s-checkbox>
      {filtered ? (
        <s-color-field
          label="Icon color"
          name={colorName}
          value={colorValue || "#000000"}
          onInput={(event) => onColor(event.currentTarget.value)}
        ></s-color-field>
      ) : (
        <input type="hidden" name={colorName} value="" />
      )}
    </s-stack>
  );
}
