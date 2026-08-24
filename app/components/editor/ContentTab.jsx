import { DATE_FORMATS, ICON_OPTIONS, MESSAGE_TAGS, TRANSLATION_LOCALES, WIDGET_LOCATIONS } from "../../lib/constants";
import { DeliveryIcon } from "../icons/DeliveryIcon";
import { widgetProfile } from "../../lib/widget-profiles";

const DATE_FORMAT_SAMPLES = {
  [DATE_FORMATS.LONG]: "Aug 21, 2026",
  [DATE_FORMATS.NUMERIC_DMY]: "21/08/2026",
  [DATE_FORMATS.NUMERIC_MDY]: "08/21/2026",
};

export function ContentTab({ widget, draft, onChange, errors = {} }) {
  const message = draft.messageConfig;
  const icons = draft.iconConfig;
  const translations = message.translations || {};
  const adding = Boolean(draft.addingTranslation);
  const locale = draft.translationLocale || TRANSLATION_LOCALES[0].value;
  const current = translations[locale] || {
    template: message.template,
    purchasedTitle: icons.purchasedTitle,
    processingTitle: icons.processingTitle,
    deliveredTitle: icons.deliveredTitle,
  };
  const enabled = message.descriptionEnabled !== false;
  const layout = message.widgetLayout || "FULL";
  const profile = widgetProfile(widget?.location);
  const isCheckout = widget?.location === WIDGET_LOCATIONS.CHECKOUT;

  const setMessage = (patch) => onChange({ ...draft, messageConfig: { ...message, ...patch } });
  const setIcons = (patch) => onChange({ ...draft, iconConfig: { ...icons, ...patch } });

  return (
    <s-stack gap="large">
      {profile.showLayout ? (
        <s-section heading="Widget Layout">
          <s-paragraph color="subdued">You'll further customize your widget's layout and appearance in the Design tab.</s-paragraph>
          <input type="hidden" name="widgetLayout" value={layout} />
          <div className="edd-layout-picker">
            <button
              type="button"
              className="edd-layout-card"
              aria-pressed={layout === "FULL"}
              onClick={() => setMessage({ widgetLayout: "FULL", designTemplate: "TIMELINE" })}
            >
              <span className="edd-layout-card__visual edd-layout-card__visual--full" />
              Full bar
            </button>
            <button
              type="button"
              className="edd-layout-card"
              aria-pressed={layout === "MINIMAL"}
              onClick={() => setMessage({ widgetLayout: "MINIMAL", designTemplate: "COMPACT" })}
            >
              <span className="edd-layout-card__visual edd-layout-card__visual--minimal" />
              Minimal
            </button>
          </div>
        </s-section>
      ) : (
        <input type="hidden" name="widgetLayout" value={layout} />
      )}

      <s-section heading="Content">
        {isCheckout ? (
          <s-text-field
            label="Heading"
            name="heading"
            value={message.heading || "Estimated Delivery"}
            onInput={(event) => setMessage({ heading: event.currentTarget.value })}
          ></s-text-field>
        ) : (
          <input type="hidden" name="heading" value={message.heading || ""} />
        )}
        <s-checkbox
          label="Enable description"
          name="descriptionEnabled"
          checked={enabled}
          onChange={(event) => setMessage({ descriptionEnabled: Boolean(event.currentTarget.checked) })}
        ></s-checkbox>
        {enabled ? (
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
              <button type="button" onClick={() => enabled && setMessage({ template: `${message.template || ""} ${item.tag}`.trim() })}>
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
        <s-section heading="Icons">
        <IconEditor
          heading={'"Order purchased" element'}
          titleName="purchasedTitle"
          titleValue={icons.purchasedTitle || "Purchased"}
          iconName="purchased"
          iconValue={icons.purchased}
          colorName="purchasedColor"
          colorValue={icons.purchasedColor}
          error={errors.purchasedTitle}
          onTitle={(purchasedTitle) => setIcons({ purchasedTitle })}
          onIcon={(purchased) => setIcons({ purchased })}
          onColor={(purchasedColor) => setIcons({ purchasedColor })}
        />
        <IconEditor
          heading={'"Order processing" element'}
          titleName="processingTitle"
          titleValue={icons.processingTitle || "Processing"}
          iconName="processing"
          iconValue={icons.processing}
          colorName="processingColor"
          colorValue={icons.processingColor}
          error={errors.processingTitle}
          onTitle={(processingTitle) => setIcons({ processingTitle })}
          onIcon={(processing) => setIcons({ processing })}
          onColor={(processingColor) => setIcons({ processingColor })}
        />
        <IconEditor
          heading={'"Order delivered" element'}
          titleName="deliveredTitle"
          titleValue={icons.deliveredTitle || "Delivered"}
          iconName="delivered"
          iconValue={icons.delivered}
          colorName="deliveredColor"
          colorValue={icons.deliveredColor}
          error={errors.deliveredTitle}
          onTitle={(deliveredTitle) => setIcons({ deliveredTitle })}
          onIcon={(delivered) => setIcons({ delivered })}
          onColor={(deliveredColor) => setIcons({ deliveredColor })}
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
          <s-button type="button" onClick={() => onChange({ ...draft, addingTranslation: true })}>
            Add Translation
          </s-button>
        )}
        <input type="hidden" name="translations" value={JSON.stringify(translations)} />
      </s-section>
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
    "{stock_left}": "Number of items left in stock",
    "{product_name}": "Name of the product",
  };
  return help[tag] || "";
}

function IconEditor({
  heading,
  titleName,
  titleValue,
  iconName,
  iconValue,
  colorName,
  colorValue,
  error,
  onTitle,
  onIcon,
  onColor,
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
      <s-text type="strong">Icon</s-text>
      <input type="hidden" name={iconName} value={iconValue} />
      <div className="edd-icon-change">
        <span className="edd-icon-change__preview">
          <DeliveryIcon name={iconValue} color={colorValue || "#202223"} />
        </span>
        <details className="edd-icon-change__picker">
          <summary>Change icon</summary>
          <div className="edd-icon-grid">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="edd-icon-option"
                aria-pressed={iconValue === option.value}
                onClick={() => onIcon(option.value)}
              >
                <DeliveryIcon name={option.value} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
      <s-checkbox
        label="Apply color filter"
        checked={filtered}
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
