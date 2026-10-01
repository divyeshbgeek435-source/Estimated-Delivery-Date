/** Timeline connector / arrow styles between delivery steps. */

export const CONNECTOR_ARROW_STYLES = [
  { value: "default", label: "Default", help: "Keep each template’s original connector design", group: "base", animated: false },
  { value: "line", label: "Solid line", help: "Clean solid rail between steps", group: "static", animated: false },
  { value: "dashed", label: "Dashed line", help: "Dashed rail between steps", group: "static", animated: false },
  { value: "dotted", label: "Dotted line", help: "Dotted rail between steps", group: "static", animated: false },
  { value: "arrow", label: "Simple arrow", help: "Clean → between steps", group: "static", animated: false },
  { value: "bold", label: "Bold arrow", help: "Heavier arrow mark", group: "static", animated: false },
  { value: "chevron", label: "Chevron", help: "Minimal > chevron", group: "static", animated: false },
  { value: "minimal", label: "Minimal line", help: "Hairline with tiny tip", group: "static", animated: false },
  { value: "curved", label: "Curved", help: "Soft curved path", group: "static", animated: false },
  { value: "moving", label: "Moving Arrow", help: "Arrow tip slides along the rail", group: "animated", animated: true },
  { value: "flowing", label: "Flowing Arrow", help: "Soft forward flow along the line", group: "animated", animated: true },
  { value: "pulsing", label: "Pulsing Arrow", help: "Gentle pulse on the connector", group: "animated", animated: true },
  { value: "sliding-chevron", label: "Sliding Chevron", help: "Chevrons slide toward the next step", group: "animated", animated: true },
  { value: "animated-dotted", label: "Animated Dotted", help: "Dots march along the rail", group: "animated", animated: true },
  { value: "animated-dashed", label: "Animated Dashed", help: "Dashes march along the rail", group: "animated", animated: true },
  { value: "gradient-flow", label: "Gradient Flow", help: "Color washes along the connector", group: "animated", animated: true },
  { value: "progress-fill", label: "Progress Fill", help: "Fill grows toward the next step", group: "animated", animated: true },
  { value: "glow", label: "Glow Arrow", help: "Soft glow pulse on the tip", group: "animated", animated: true },
  { value: "bounce", label: "Bounce Arrow", help: "Friendly bounce toward the next step", group: "animated", animated: true },
  { value: "shimmer", label: "Shimmer Arrow", help: "Light shimmer across the rail", group: "animated", animated: true },
  { value: "curved-flow", label: "Curved Flow", help: "Flowing dashed curve", group: "animated", animated: true },
];

/** Styles that render as a rail only (no arrow tip). */
export const CONNECTOR_LINE_ONLY_STYLES = new Set([
  "line",
  "dashed",
  "dotted",
  "gradient-flow",
  "animated-dotted",
  "animated-dashed",
  "progress-fill",
  "shimmer",
  "flowing",
]);

const LEGACY_STYLE_MAP = {
  animated: "animated-dashed",
  gradient: "gradient-flow",
  progress: "progress-fill",
};

export const CONNECTOR_DIRECTIONS = [
  { value: "ltr", label: "Left → right" },
  { value: "rtl", label: "Right → left" },
];

export const DEFAULT_CONNECTOR_STYLE = {
  arrowStyle: "default",
  size: 12,
  thickness: 2,
  color: "",
  activeColor: "",
  completedColor: "",
  upcomingColor: "",
  opacity: 100,
  spacing: 8,
  length: null,
  animationEnabled: true,
  animationSpeed: 1.6,
  direction: "ltr",
};

const STYLE_VALUES = new Set(CONNECTOR_ARROW_STYLES.map((item) => item.value));
const DIRECTION_VALUES = new Set(CONNECTOR_DIRECTIONS.map((item) => item.value));

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function resolveArrowStyle(value) {
  const raw = LEGACY_STYLE_MAP[value] || value;
  return STYLE_VALUES.has(raw) ? raw : DEFAULT_CONNECTOR_STYLE.arrowStyle;
}

export function normalizeConnectorStyle(connector = {}) {
  const source = asObject(connector);
  return {
    arrowStyle: resolveArrowStyle(source.arrowStyle),
    size: clamp(source.size, 8, 28, DEFAULT_CONNECTOR_STYLE.size),
    thickness: clamp(source.thickness, 1, 8, DEFAULT_CONNECTOR_STYLE.thickness),
    color: String(source.color || ""),
    activeColor: String(source.activeColor || ""),
    completedColor: String(source.completedColor || ""),
    upcomingColor: String(source.upcomingColor || ""),
    opacity: clamp(source.opacity, 0, 100, DEFAULT_CONNECTOR_STYLE.opacity),
    spacing: clamp(source.spacing, 0, 24, DEFAULT_CONNECTOR_STYLE.spacing),
    length: numberOrNull(source.length) == null ? null : clamp(source.length, 12, 96, null),
    animationEnabled: source.animationEnabled !== false,
    animationSpeed: clamp(source.animationSpeed, 0.4, 4, DEFAULT_CONNECTOR_STYLE.animationSpeed),
    direction: DIRECTION_VALUES.has(source.direction) ? source.direction : DEFAULT_CONNECTOR_STYLE.direction,
  };
}

export function isDefaultConnector(connector) {
  return normalizeConnectorStyle(connector).arrowStyle === "default";
}

export function isAnimatedConnectorStyle(arrowStyle) {
  const meta = CONNECTOR_ARROW_STYLES.find((item) => item.value === arrowStyle);
  return Boolean(meta?.animated);
}

/** completed | active | upcoming for the segment between prev → next */
export function resolveConnectorState(prevStatus = "complete", nextStatus = "pending") {
  if (prevStatus === "complete" && nextStatus !== "pending") return "completed";
  if (prevStatus === "complete" && nextStatus === "pending") return "active";
  if (prevStatus === "active" || nextStatus === "active") return "active";
  if (prevStatus === "complete") return "completed";
  return "upcoming";
}

export function resolveConnectorColor(
  connector,
  { fallback = "#202223", prevStatus = "complete", nextStatus = "pending", state } = {},
) {
  const style = normalizeConnectorStyle(connector);
  const resolved = state || resolveConnectorState(prevStatus, nextStatus);
  if (resolved === "completed" && style.completedColor) return style.completedColor;
  if (resolved === "active" && style.activeColor) return style.activeColor;
  if (resolved === "upcoming" && style.upcomingColor) return style.upcomingColor;
  if (style.color) return style.color;
  return fallback;
}

export function connectorCssVars(connector, { color } = {}) {
  const style = normalizeConnectorStyle(connector);
  const paint = color || style.color || "#202223";
  return {
    ["--edd-connector-color"]: paint,
    ["--edd-connector-size"]: `${style.size}px`,
    ["--edd-connector-thickness"]: `${style.thickness}px`,
    ["--edd-connector-opacity"]: String(style.opacity / 100),
    ["--edd-connector-spacing"]: `${style.spacing}px`,
    ["--edd-connector-length"]: style.length != null ? `${style.length}px` : "auto",
    ["--edd-connector-speed"]: `${style.animationSpeed}s`,
  };
}
<<<<<<< HEAD

export function timelineGridTemplate(stepCount) {
  const count = Math.max(1, Number(stepCount) || 1);
  if (count === 1) return "minmax(0, 1fr)";
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    if (i > 0) parts.push("minmax(var(--edd-connector-min, 1.1rem), var(--edd-connector-flex, 0.55fr))");
    parts.push("minmax(0, 1fr)");
  }
  return parts.join(" ");
}

function tipMarkup(kind = "arrow") {
  if (kind === "none") return "";
  if (kind === "chevron") return `<span class="edd-connector__tip edd-connector__tip--chevron" aria-hidden="true"></span>`;
  if (kind === "bold") return `<span class="edd-connector__tip edd-connector__tip--bold" aria-hidden="true"></span>`;
  if (kind === "arrow" || kind === "moving" || kind === "glow" || kind === "bounce") {
    return `<span class="edd-connector__tip edd-connector__tip--glyph" aria-hidden="true">→</span>`;
  }
  if (kind === "sliding-chevron") {
    return `<span class="edd-connector__tip edd-connector__tip--chevrons" aria-hidden="true"><i></i><i></i><i></i></span>`;
  }
  if (kind === "minimal") return `<span class="edd-connector__tip edd-connector__tip--head edd-connector__tip--tiny" aria-hidden="true"></span>`;
  return `<span class="edd-connector__tip edd-connector__tip--head" aria-hidden="true"></span>`;
}

function trackMarkup(arrowStyle) {
  if (arrowStyle === "arrow" || arrowStyle === "chevron" || arrowStyle === "bold") return "";
  if (arrowStyle === "curved" || arrowStyle === "curved-flow") {
    return `<svg class="edd-connector__curve" viewBox="0 0 40 16" preserveAspectRatio="none" aria-hidden="true"><path class="edd-connector__curve-path" d="M1 8 C12 2, 28 14, 39 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }
  if (arrowStyle === "progress-fill") {
    return `<span class="edd-connector__track"><span class="edd-connector__fill"></span></span>`;
  }
  if (arrowStyle === "sliding-chevron") {
    return `<span class="edd-connector__line edd-connector__line--ghost"></span>`;
  }
  return `<span class="edd-connector__line"></span><span class="edd-connector__sheen" aria-hidden="true"></span>`;
}

function tipKindForStyle(arrowStyle) {
  if (CONNECTOR_LINE_ONLY_STYLES.has(arrowStyle)) return "none";
  if (arrowStyle === "arrow" || arrowStyle === "moving" || arrowStyle === "glow" || arrowStyle === "bounce") return "arrow";
  if (arrowStyle === "chevron") return "chevron";
  if (arrowStyle === "sliding-chevron") return "sliding-chevron";
  if (arrowStyle === "bold") return "bold";
  if (arrowStyle === "minimal") return "minimal";
  if (arrowStyle === "pulsing") return "arrow";
  return "head";
}

/**
 * Storefront HTML for one connector between steps.
 * Returns empty string for "default" (templates keep their native design).
 */
export function buildConnectorHtml(
  connector,
  { color, classPrefix = "edd-widget", prevStatus, nextStatus, fallbackColor } = {},
) {
  const style = normalizeConnectorStyle(connector);
  if (style.arrowStyle === "default") return "";
  const state = resolveConnectorState(prevStatus, nextStatus);
  const paint = resolveConnectorColor(style, {
    fallback: fallbackColor || color || "#202223",
    prevStatus,
    nextStatus,
    state,
  });
  const vars = connectorCssVars(style, { color: paint });
  const styleAttr = Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  const animated = isAnimatedConnectorStyle(style.arrowStyle);
  const animOff = !style.animationEnabled || !animated ? " is-anim-off" : "";
  const dirClass = style.direction === "rtl" ? " is-rtl" : "";
  const lengthClass = style.length != null ? " has-fixed-length" : "";
  const tip = tipMarkup(tipKindForStyle(style.arrowStyle));

  return `<span class="${classPrefix}__connector edd-connector edd-connector--${style.arrowStyle} is-${state}${animOff}${dirClass}${lengthClass}" style="${styleAttr}" aria-hidden="true">${trackMarkup(style.arrowStyle)}${tip}</span>`;
}
=======
>>>>>>> 64a9729 (Remove deprecated components and streamline configuration files)
