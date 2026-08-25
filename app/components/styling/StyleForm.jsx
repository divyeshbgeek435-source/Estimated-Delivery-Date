import { GRADIENT_DIRECTIONS } from "../../lib/constants";
import { HostChoiceList } from "../common/ActionButton";

export function StyleForm({ style, onChange, errors = {} }) {
  return (
    <s-stack gap="large">
      <s-section heading="Background">
        <input type="hidden" name="backgroundType" value={style.backgroundType} />
        <HostChoiceList
          label="Background type"
          name="backgroundTypeField"
          onChange={(event) =>
            onChange({
              ...style,
              backgroundType: event.currentTarget.values?.[0] || event.currentTarget.value,
            })
          }
        >
          <s-choice value="SOLID" selected={style.backgroundType === "SOLID"}>
            Solid
          </s-choice>
          <s-choice value="GRADIENT" selected={style.backgroundType === "GRADIENT"}>
            Gradient
          </s-choice>
        </HostChoiceList>
        {style.backgroundType === "GRADIENT" ? (
          <s-stack gap="base">
            <s-color-field
              label="Start color"
              name="gradientStart"
              value={style.gradientStart}
              onInput={(event) =>
                onChange({ ...style, gradientStart: event.currentTarget.value })
              }
              error={errors.gradientStart}
            ></s-color-field>
            <s-color-field
              label="End color"
              name="gradientEnd"
              value={style.gradientEnd}
              onInput={(event) =>
                onChange({ ...style, gradientEnd: event.currentTarget.value })
              }
              error={errors.gradientEnd}
            ></s-color-field>
            <s-select
              label="Direction"
              name="gradientDirection"
              value={style.gradientDirection}
              onChange={(event) =>
                onChange({ ...style, gradientDirection: event.currentTarget.value })
              }
            >
              {GRADIENT_DIRECTIONS.map((item) => (
                <s-option key={item.value} value={item.value}>
                  {item.label}
                </s-option>
              ))}
            </s-select>
            <input type="hidden" name="backgroundColor" value={style.backgroundColor} />
          </s-stack>
        ) : (
          <s-stack gap="base">
            <s-color-field
              label="Background color"
              name="backgroundColor"
              value={style.backgroundColor}
              onInput={(event) =>
                onChange({ ...style, backgroundColor: event.currentTarget.value })
              }
              error={errors.backgroundColor}
            ></s-color-field>
            <input type="hidden" name="gradientStart" value={style.gradientStart} />
            <input type="hidden" name="gradientEnd" value={style.gradientEnd} />
            <input type="hidden" name="gradientDirection" value={style.gradientDirection} />
          </s-stack>
        )}
      </s-section>

      <s-section heading="Shape">
        <s-number-field
          label="Border radius"
          name="borderRadius"
          min={0}
          max={32}
          suffix="px"
          value={String(style.borderRadius)}
          onInput={(event) =>
            onChange({ ...style, borderRadius: Number(event.currentTarget.value) })
          }
          error={errors.borderRadius}
        ></s-number-field>
      </s-section>

      <s-section heading="Theme color">
        <s-paragraph color="subdued">
          Used for icons, highlighted text, progress, accents, and buttons.
        </s-paragraph>
        <s-color-field
          label="Theme color"
          name="themeColor"
          value={style.themeColor}
          onInput={(event) =>
            onChange({ ...style, themeColor: event.currentTarget.value })
          }
          error={errors.themeColor}
        ></s-color-field>
      </s-section>
    </s-stack>
  );
}
