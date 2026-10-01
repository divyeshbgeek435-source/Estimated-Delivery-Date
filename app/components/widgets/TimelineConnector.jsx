import {
  CONNECTOR_LINE_ONLY_STYLES,
  connectorCssVars,
  isAnimatedConnectorStyle,
  isDefaultConnector,
  normalizeConnectorStyle,
  resolveConnectorColor,
  resolveConnectorState,
} from "../../lib/connector-styles";

function ConnectorTip({ arrowStyle }) {
  if (CONNECTOR_LINE_ONLY_STYLES.has(arrowStyle)) return null;
  if (arrowStyle === "sliding-chevron") {
    return (
      <span className="edd-connector__tip edd-connector__tip--chevrons" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  }
  if (
    arrowStyle === "arrow" ||
    arrowStyle === "moving" ||
    arrowStyle === "glow" ||
    arrowStyle === "bounce" ||
    arrowStyle === "pulsing"
  ) {
    return (
      <span className="edd-connector__tip edd-connector__tip--glyph" aria-hidden="true">
        →
      </span>
    );
  }
  if (arrowStyle === "chevron") {
    return <span className="edd-connector__tip edd-connector__tip--chevron" aria-hidden="true" />;
  }
  if (arrowStyle === "bold") {
    return <span className="edd-connector__tip edd-connector__tip--bold" aria-hidden="true" />;
  }
  if (arrowStyle === "minimal") {
    return <span className="edd-connector__tip edd-connector__tip--head edd-connector__tip--tiny" aria-hidden="true" />;
  }
  return <span className="edd-connector__tip edd-connector__tip--head" aria-hidden="true" />;
}

function ConnectorTrack({ arrowStyle }) {
  if (arrowStyle === "arrow" || arrowStyle === "chevron" || arrowStyle === "bold") return null;
  if (arrowStyle === "curved" || arrowStyle === "curved-flow") {
    return (
      <svg className="edd-connector__curve" viewBox="0 0 40 16" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="edd-connector__curve-path"
          d="M1 8 C12 2, 28 14, 39 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (arrowStyle === "progress-fill") {
    return (
      <span className="edd-connector__track">
        <span className="edd-connector__fill" />
      </span>
    );
  }
  if (arrowStyle === "sliding-chevron") {
    return <span className="edd-connector__line edd-connector__line--ghost" />;
  }
  return (
    <>
      <span className="edd-connector__line" />
      <span className="edd-connector__sheen" aria-hidden="true" />
    </>
  );
}

/**
 * Adaptive timeline connector between two steps.
 * Returns null for "default" so each template keeps its native design.
 */
export function TimelineConnector({
  connector,
  fallbackColor = "#202223",
  prevStatus = "complete",
  nextStatus = "pending",
  className = "",
  preview = false,
}) {
  const style = normalizeConnectorStyle(connector);
  if (!preview && isDefaultConnector(style)) return null;

  const state = resolveConnectorState(prevStatus, nextStatus);
  const color = resolveConnectorColor(style, {
    fallback: fallbackColor,
    prevStatus,
    nextStatus,
    state,
  });
  const vars = connectorCssVars(style, { color });
  const animated = isAnimatedConnectorStyle(style.arrowStyle);
  const animOff = !style.animationEnabled || !animated;
  const renderStyle = style.arrowStyle === "default" ? "line" : style.arrowStyle;
  const classes = [
    "edd-connector",
    `edd-connector--${renderStyle}`,
    `is-${state}`,
    animOff ? "is-anim-off" : "",
    style.direction === "rtl" ? "is-rtl" : "",
    style.length != null ? "has-fixed-length" : "",
    preview ? "edd-connector--preview" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} style={vars} aria-hidden="true">
      <ConnectorTrack arrowStyle={renderStyle} />
      <ConnectorTip arrowStyle={renderStyle} />
    </span>
  );
}

/** Compact animated sample used in the style picker. */
export function ConnectorStylePreview({ arrowStyle, selected = false }) {
  const sample = normalizeConnectorStyle({
    arrowStyle: arrowStyle === "default" ? "line" : arrowStyle,
    size: 11,
    thickness: 2,
    spacing: 4,
    animationEnabled: true,
    animationSpeed: 1.5,
    color: selected ? "#008060" : "#6d7175",
  });

  return (
    <span className={`edd-connector-swatch${selected ? " is-selected" : ""}`}>
      {arrowStyle === "default" ? (
        <span className="edd-connector-swatch__default">Template</span>
      ) : (
        <TimelineConnector connector={sample} preview fallbackColor={sample.color} prevStatus="complete" nextStatus="active" />
      )}
    </span>
  );
}
