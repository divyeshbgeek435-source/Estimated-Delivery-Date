import { ICON_OPTIONS, MESSAGE_TAGS } from "../../lib/constants";
import { DeliveryIcon } from "../icons/DeliveryIcon";

export function MessageIconsForm({
  message,
  icons,
  onMessageChange,
  onIconsChange,
  errors = {},
  namePrefix = "",
}) {
  const name = (field) => `${namePrefix}${field}`;

  const insertTag = (tag) => {
    onMessageChange({
      ...message,
      template: `${message.template || ""} ${tag}`.trim(),
    });
  };

  return (
    <s-stack gap="large">
      <s-section heading="Message">
        <s-text-field
          label="Heading"
          name={name("heading")}
          value={message.heading}
          onInput={(event) =>
            onMessageChange({ ...message, heading: event.currentTarget.value })
          }
          error={errors.heading}
        ></s-text-field>
        <s-text-area
          label="Message"
          name={name("template")}
          rows={4}
          value={message.template}
          onInput={(event) =>
            onMessageChange({ ...message, template: event.currentTarget.value })
          }
          error={errors.template}
        ></s-text-area>
        <s-stack gap="small-200">
          <s-text color="subdued">Insert a dynamic tag</s-text>
          <div className="edd-tag-row">
            {MESSAGE_TAGS.map((item) => (
              <s-button
                key={item.tag}
                type="button"
                variant="secondary"
                onClick={() => insertTag(item.tag)}
              >
                {item.tag}
              </s-button>
            ))}
          </div>
        </s-stack>
      </s-section>

      <s-section heading="Timeline">
        <IconGroup
          label="Purchased"
          name={name("purchased")}
          value={icons.purchased}
          titleName={name("purchasedTitle")}
          titleValue={icons.purchasedTitle || "Purchased"}
          onChange={(value) => onIconsChange({ ...icons, purchased: value })}
          onTitleChange={(purchasedTitle) => onIconsChange({ ...icons, purchasedTitle })}
          error={errors.purchasedTitle}
        />
        <IconGroup
          label="Processing"
          name={name("processing")}
          value={icons.processing}
          titleName={name("processingTitle")}
          titleValue={icons.processingTitle || "Processing"}
          onChange={(value) => onIconsChange({ ...icons, processing: value })}
          onTitleChange={(processingTitle) => onIconsChange({ ...icons, processingTitle })}
          error={errors.processingTitle}
        />
        <IconGroup
          label="Delivered"
          name={name("delivered")}
          value={icons.delivered}
          titleName={name("deliveredTitle")}
          titleValue={icons.deliveredTitle || "Delivered"}
          onChange={(value) => onIconsChange({ ...icons, delivered: value })}
          onTitleChange={(deliveredTitle) => onIconsChange({ ...icons, deliveredTitle })}
          error={errors.deliveredTitle}
        />
      </s-section>
    </s-stack>
  );
}

function IconGroup({
  label,
  name,
  value,
  titleName,
  titleValue,
  onChange,
  onTitleChange,
  error,
}) {
  return (
    <s-stack gap="small-200">
      <s-text type="strong">{label}</s-text>
      {titleName ? (
        <s-text-field
          label={`${label} title`}
          name={titleName}
          value={titleValue}
          onInput={(event) => onTitleChange?.(event.currentTarget.value)}
          error={error}
        ></s-text-field>
      ) : null}
      <input type="hidden" name={name} value={value} />
      <div className="edd-icon-grid">
        {ICON_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="edd-icon-option"
            aria-pressed={value === option.value}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
          >
            <DeliveryIcon name={option.value} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </s-stack>
  );
}
