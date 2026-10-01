import { FONT_OPTIONS, HEADING_WEIGHT_OPTIONS } from "../../lib/constants";
import {
  patchElementStyle,
  resolveElementStyle,
  TEXT_ALIGN_OPTIONS,
} from "../../lib/element-styles";
import { HostChoiceList } from "../common/ActionButton";

function patchEl(style, onStyleChange, elementId, patch) {
  onStyleChange(patchElementStyle(style, elementId, patch));
}

/**
 * Full Check Delivery section customization - label, input, button, spacing, alignment.
 */
export function CheckDeliveryCustomization({ style, onStyleChange, tracker, commitTracker }) {
  const settings = tracker?.settings || {};
  const section = resolveElementStyle("checkSection", style);
  const label = resolveElementStyle("checkLabel", style);
  const input = resolveElementStyle("checkInput", style);
  const button = resolveElementStyle("checkButton", style);

  const updateSettings = (patch) => {
    commitTracker({
      ...tracker,
      settings: { ...settings, ...patch },
    });
  };

  const setSection = (patch) => patchEl(style, onStyleChange, "checkSection", patch);
  const setLabel = (patch) => patchEl(style, onStyleChange, "checkLabel", patch);
  const setInput = (patch) => patchEl(style, onStyleChange, "checkInput", patch);
  const setButton = (patch) => patchEl(style, onStyleChange, "checkButton", patch);

  const num = (event) => {
    const value = event.currentTarget.value;
    if (value === "" || value == null) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  };

  return (
    <section className="edd-customize-block">
      <h3>Check delivery</h3>
      <p>Customize the label, input, button, spacing, and alignment for the check-delivery block.</p>

      <s-stack gap="large">
          <div className="edd-check-customize">
            <h4>Section layout</h4>
            <HostChoiceList
              label="Alignment"
              labelAccessibilityVisibility="exclusive"
              onChange={(event) => {
                const value = event.currentTarget.values?.[0] || event.currentTarget.value || "center";
                const map = { left: "flex-start", center: "center", right: "flex-end" };
                let next = patchElementStyle(style, "checkSection", {
                  textAlign: value,
                  justifyContent: map[value] || "center",
                });
                next = patchElementStyle(next, "checkLabel", { textAlign: value });
                onStyleChange(next);
              }}
            >
              {TEXT_ALIGN_OPTIONS.map((item) => (
                <s-choice key={item.value} value={item.value} selected={(section.textAlign || "center") === item.value}>
                  {item.label}
                </s-choice>
              ))}
            </HostChoiceList>
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-number-field
                label="Space above section"
                min={0}
                max={48}
                step={1}
                suffix="px"
                value={String(section.marginTop ?? 14)}
                onInput={(event) => setSection({ marginTop: num(event) ?? 14 })}
              ></s-number-field>
              <s-number-field
                label="Section padding"
                min={0}
                max={48}
                step={1}
                suffix="px"
                value={String(section.paddingY ?? 14)}
                onInput={(event) => setSection({ paddingY: num(event) ?? 14 })}
              ></s-number-field>
              <s-number-field
                label="Gap label → row"
                min={0}
                max={32}
                step={1}
                suffix="px"
                value={String(label.marginBottom ?? 8)}
                onInput={(event) => setLabel({ marginBottom: num(event) ?? 8 })}
              ></s-number-field>
              <s-number-field
                label="Gap input → button"
                min={0}
                max={32}
                step={1}
                suffix="px"
                value={String(section.gap ?? 8)}
                onInput={(event) => setSection({ gap: num(event) ?? 8 })}
              ></s-number-field>
            </s-grid>
          </div>

          <div className="edd-check-customize">
            <h4>Label</h4>
            <s-text-field
              label="Label text"
              value={settings.checkDeliveryLabel || "Check delivery"}
              onInput={(event) => updateSettings({ checkDeliveryLabel: event.currentTarget.value })}
            ></s-text-field>
            <s-select
              label="Font"
              value={label.fontFamily || style.fontFamily || "inherit"}
              onChange={(event) => setLabel({ fontFamily: event.currentTarget.value })}
            >
              {FONT_OPTIONS.map((item) => (
                <s-option key={item.value} value={item.value}>
                  {item.label === "Theme default" ? "Use your theme fonts" : item.label}
                </s-option>
              ))}
            </s-select>
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-number-field
                label="Font size"
                min={10}
                max={28}
                step={1}
                suffix="px"
                value={String(label.fontSize ?? 13)}
                onInput={(event) => setLabel({ fontSize: num(event) ?? 13 })}
              ></s-number-field>
              <s-select
                label="Font weight"
                value={String(label.fontWeight ?? 700)}
                onChange={(event) => setLabel({ fontWeight: Number(event.currentTarget.value) || 700 })}
              >
                {HEADING_WEIGHT_OPTIONS.map((item) => (
                  <s-option key={item.value} value={String(item.value)}>
                    {item.label}
                  </s-option>
                ))}
              </s-select>
            </s-grid>
            <s-color-field
              label="Label color"
              value={label.color || style.textColor || "#202223"}
              onInput={(event) => setLabel({ color: event.currentTarget.value })}
            ></s-color-field>
          </div>

          <div className="edd-check-customize">
            <h4>Input field</h4>
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-number-field
                label="Width"
                min={80}
                max={480}
                step={1}
                suffix="px"
                value={input.width == null ? "" : String(input.width)}
                placeholder="Auto"
                onInput={(event) => setInput({ width: num(event) })}
              ></s-number-field>
              <s-number-field
                label="Height"
                min={28}
                max={72}
                step={1}
                suffix="px"
                value={String(input.height ?? 40)}
                onInput={(event) => setInput({ height: num(event) ?? 40 })}
              ></s-number-field>
              <s-number-field
                label="Border width"
                min={0}
                max={8}
                step={1}
                suffix="px"
                value={String(input.borderWidth ?? 1)}
                onInput={(event) => setInput({ borderWidth: num(event) ?? 1 })}
              ></s-number-field>
              <s-number-field
                label="Radius"
                min={0}
                max={32}
                step={1}
                suffix="px"
                value={String(input.borderRadius ?? 8)}
                onInput={(event) => setInput({ borderRadius: num(event) ?? 8 })}
              ></s-number-field>
              <s-number-field
                label="Horizontal padding"
                min={0}
                max={32}
                step={1}
                suffix="px"
                value={String(input.paddingX ?? 14)}
                onInput={(event) => setInput({ paddingX: num(event) ?? 14 })}
              ></s-number-field>
              <s-number-field
                label="Font size"
                min={10}
                max={24}
                step={1}
                suffix="px"
                value={String(input.fontSize ?? 14)}
                onInput={(event) => setInput({ fontSize: num(event) ?? 14 })}
              ></s-number-field>
            </s-grid>
            <s-color-field
              label="Background"
              value={input.backgroundColor || "#FFFFFF"}
              onInput={(event) => setInput({ backgroundColor: event.currentTarget.value })}
            ></s-color-field>
            <s-color-field
              label="Text color"
              value={input.color || "#202223"}
              onInput={(event) => setInput({ color: event.currentTarget.value })}
            ></s-color-field>
            <s-color-field
              label="Border color"
              value={input.borderColor || "#c9cccf"}
              onInput={(event) => setInput({ borderColor: event.currentTarget.value })}
            ></s-color-field>
          </div>

          <div className="edd-check-customize">
            <h4>Check button</h4>
            <s-text-field
              label="Button text"
              value={settings.checkDeliveryButtonLabel || "Check"}
              onInput={(event) => updateSettings({ checkDeliveryButtonLabel: event.currentTarget.value })}
            ></s-text-field>
            <HostChoiceList
              label="Button text alignment"
              labelAccessibilityVisibility="exclusive"
              onChange={(event) => {
                const value = event.currentTarget.values?.[0] || event.currentTarget.value;
                setButton({ textAlign: value || "center" });
              }}
            >
              {TEXT_ALIGN_OPTIONS.map((item) => (
                <s-choice key={item.value} value={item.value} selected={(button.textAlign || "center") === item.value}>
                  {item.label}
                </s-choice>
              ))}
            </HostChoiceList>
            <s-select
              label="Font"
              value={button.fontFamily || style.fontFamily || "inherit"}
              onChange={(event) => setButton({ fontFamily: event.currentTarget.value })}
            >
              {FONT_OPTIONS.map((item) => (
                <s-option key={item.value} value={item.value}>
                  {item.label === "Theme default" ? "Use your theme fonts" : item.label}
                </s-option>
              ))}
            </s-select>
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-number-field
                label="Width"
                min={48}
                max={280}
                step={1}
                suffix="px"
                value={button.width == null ? "" : String(button.width)}
                placeholder="Auto"
                onInput={(event) => setButton({ width: num(event) })}
              ></s-number-field>
              <s-number-field
                label="Height"
                min={28}
                max={72}
                step={1}
                suffix="px"
                value={String(button.height ?? 40)}
                onInput={(event) => setButton({ height: num(event) ?? 40 })}
              ></s-number-field>
              <s-number-field
                label="Min width"
                min={0}
                max={200}
                step={1}
                suffix="px"
                value={String(button.minWidth ?? 76)}
                onInput={(event) => setButton({ minWidth: num(event) ?? 76 })}
              ></s-number-field>
              <s-number-field
                label="Radius"
                min={0}
                max={32}
                step={1}
                suffix="px"
                value={String(button.borderRadius ?? 8)}
                onInput={(event) => setButton({ borderRadius: num(event) ?? 8 })}
              ></s-number-field>
              <s-number-field
                label="Border width"
                min={0}
                max={8}
                step={1}
                suffix="px"
                value={String(button.borderWidth ?? 0)}
                onInput={(event) => setButton({ borderWidth: num(event) ?? 0 })}
              ></s-number-field>
              <s-number-field
                label="Font size"
                min={10}
                max={24}
                step={1}
                suffix="px"
                value={String(button.fontSize ?? 14)}
                onInput={(event) => setButton({ fontSize: num(event) ?? 14 })}
              ></s-number-field>
              <s-select
                label="Font weight"
                value={String(button.fontWeight ?? 650)}
                onChange={(event) => setButton({ fontWeight: Number(event.currentTarget.value) || 650 })}
              >
                {HEADING_WEIGHT_OPTIONS.map((item) => (
                  <s-option key={item.value} value={String(item.value)}>
                    {item.label}
                  </s-option>
                ))}
              </s-select>
              <s-number-field
                label="Horizontal padding"
                min={0}
                max={40}
                step={1}
                suffix="px"
                value={String(button.paddingX ?? 16)}
                onInput={(event) => setButton({ paddingX: num(event) ?? 16 })}
              ></s-number-field>
            </s-grid>
            <s-color-field
              label="Text color"
              value={button.color || "#FFFFFF"}
              onInput={(event) => setButton({ color: event.currentTarget.value })}
            ></s-color-field>
            <s-color-field
              label="Background"
              value={button.backgroundColor || style.themeColor || "#111827"}
              onInput={(event) => setButton({ backgroundColor: event.currentTarget.value })}
            ></s-color-field>
            <s-color-field
              label="Border color"
              value={button.borderColor || button.backgroundColor || "#111827"}
              onInput={(event) => setButton({ borderColor: event.currentTarget.value })}
            ></s-color-field>
          </div>
        </s-stack>
    </section>
  );
}
