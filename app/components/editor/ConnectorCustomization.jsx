import {
  CONNECTOR_ARROW_STYLES,
  CONNECTOR_DIRECTIONS,
  isAnimatedConnectorStyle,
  normalizeConnectorStyle,
} from "../../lib/connector-styles";
import { HostChoiceList } from "../common/ActionButton";
import { ConnectorStylePreview } from "../widgets/TimelineConnector";

/**
 * Customize timeline connectors / arrows between steps.
 */
export function ConnectorCustomization({ tracker, commitTracker }) {
  const settings = tracker?.settings || {};
  const connector = normalizeConnectorStyle(settings.connector);
  const isDefault = connector.arrowStyle === "default";
  const animated = isAnimatedConnectorStyle(connector.arrowStyle);

  const update = (patch) => {
    commitTracker({
      ...tracker,
      settings: {
        ...settings,
        connector: normalizeConnectorStyle({ ...connector, ...patch }),
      },
    });
  };

  const num = (event) => {
    const value = event.currentTarget.value;
    if (value === "" || value == null) return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  };

  const showLineControls = !["arrow", "chevron", "bold", "default"].includes(connector.arrowStyle);
  const selectedMeta = CONNECTOR_ARROW_STYLES.find((item) => item.value === connector.arrowStyle);

  return (
    <section className="edd-customize-block">
      <h3>Timeline connectors</h3>
      <p>
        Pick a connector for every template. Default keeps each template’s original look. Animated styles stay subtle and
        follow completed / active / upcoming progress.
      </p>

      <div className="edd-connector-customize">
        <h4>Style</h4>
        <div className="edd-connector-picker" role="listbox" aria-label="Connector style">
          {CONNECTOR_ARROW_STYLES.map((item) => {
            const selected = connector.arrowStyle === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`edd-connector-picker__item${selected ? " is-selected" : ""}${item.animated ? " is-animated" : ""}`}
                onClick={() => update({ arrowStyle: item.value })}
              >
                <ConnectorStylePreview arrowStyle={item.value} selected={selected} />
                <span className="edd-connector-picker__label">{item.label}</span>
              </button>
            );
          })}
        </div>
        <p className="edd-connector-customize__help">{selectedMeta?.help || ""}</p>

        {!isDefault ? (
          <HostChoiceList
            label="Direction"
            labelAccessibilityVisibility="exclusive"
            onChange={(event) => {
              const value = event.currentTarget.values?.[0] || event.currentTarget.value || "ltr";
              update({ direction: value });
            }}
          >
            {CONNECTOR_DIRECTIONS.map((item) => (
              <s-choice key={item.value} value={item.value} selected={connector.direction === item.value}>
                {item.label}
              </s-choice>
            ))}
          </HostChoiceList>
        ) : null}
      </div>

      {!isDefault ? (
        <>
          <div className="edd-connector-customize">
            <h4>Size & spacing</h4>
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-number-field
                label="Arrow size"
                min={8}
                max={28}
                step={1}
                suffix="px"
                value={String(connector.size)}
                onInput={(event) => update({ size: num(event) ?? 12 })}
              ></s-number-field>
              {showLineControls ? (
                <s-number-field
                  label="Thickness"
                  min={1}
                  max={8}
                  step={1}
                  suffix="px"
                  value={String(connector.thickness)}
                  onInput={(event) => update({ thickness: num(event) ?? 2 })}
                ></s-number-field>
              ) : (
                <s-number-field
                  label="Opacity"
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  value={String(connector.opacity)}
                  onInput={(event) => update({ opacity: num(event) ?? 100 })}
                ></s-number-field>
              )}
              <s-number-field
                label="Spacing"
                min={0}
                max={24}
                step={1}
                suffix="px"
                value={String(connector.spacing)}
                onInput={(event) => update({ spacing: num(event) ?? 8 })}
              ></s-number-field>
              <s-number-field
                label="Connector length"
                min={12}
                max={96}
                step={1}
                suffix="px"
                value={connector.length == null ? "" : String(connector.length)}
                placeholder="Auto"
                onInput={(event) => update({ length: num(event) })}
              ></s-number-field>
              {showLineControls ? (
                <s-number-field
                  label="Opacity"
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  value={String(connector.opacity)}
                  onInput={(event) => update({ opacity: num(event) ?? 100 })}
                ></s-number-field>
              ) : null}
            </s-grid>
          </div>

          <div className="edd-connector-customize">
            <h4>Colors by status</h4>
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-color-field
                label="Default"
                value={connector.color || "#202223"}
                onInput={(event) => update({ color: event.currentTarget.value })}
              ></s-color-field>
              <s-color-field
                label="Completed"
                value={connector.completedColor || connector.color || "#202223"}
                onInput={(event) => update({ completedColor: event.currentTarget.value })}
              ></s-color-field>
              <s-color-field
                label="Active"
                value={connector.activeColor || connector.color || "#202223"}
                onInput={(event) => update({ activeColor: event.currentTarget.value })}
              ></s-color-field>
              <s-color-field
                label="Upcoming"
                value={connector.upcomingColor || "#8c9196"}
                onInput={(event) => update({ upcomingColor: event.currentTarget.value })}
              ></s-color-field>
            </s-grid>
            <p className="edd-connector-customize__help">Connectors follow step progress: completed, active, then upcoming.</p>
          </div>

          <div className="edd-connector-customize">
            <h4>Motion</h4>
            <s-checkbox
              label="Animation on"
              checked={connector.animationEnabled !== false}
              onChange={(event) => update({ animationEnabled: Boolean(event.currentTarget.checked) })}
            ></s-checkbox>
            {connector.animationEnabled !== false && (animated || connector.arrowStyle === "progress-fill") ? (
              <s-number-field
                label="Animation speed"
                min={0.4}
                max={4}
                step={0.1}
                suffix="s"
                value={String(connector.animationSpeed)}
                onInput={(event) => update({ animationSpeed: num(event) ?? 1.6 })}
              ></s-number-field>
            ) : null}
            {!animated && connector.arrowStyle !== "progress-fill" ? (
              <p className="edd-connector-customize__help">Pick an animated style above to enable motion presets.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
