/** Per-element text/layout styles for interactive template customization. */

export const EDITABLE_ELEMENTS = [
  { id: "card", label: "Widget card", kind: "card" },
  { id: "title", label: "Title", kind: "text" },
  { id: "description", label: "Description", kind: "text", supportsTags: true },
  { id: "headerIcon", label: "Header icon", kind: "icon" },
  { id: "progress", label: "Progress line", kind: "progress" },
  { id: "stepLabel", label: "Step label", kind: "text", stepScoped: true },
  { id: "stepDate", label: "Step date", kind: "text", stepScoped: true },
  { id: "stepIcon", label: "Step icon", kind: "icon", stepScoped: true },
  { id: "checkSection", label: "Check delivery section", kind: "section" },
  { id: "checkLabel", label: "Check delivery label", kind: "text" },
  { id: "checkInput", label: "Check delivery input", kind: "input" },
  { id: "checkButton", label: "Check button", kind: "button" },
];

export const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const ROW_ALIGN_OPTIONS = [
  { value: "flex-start", label: "Left" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "Right" },
];

export const TEXT_TRANSFORM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" },
  { value: "capitalize", label: "Capitalize" },
];

export const FONT_STYLE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italic" },
];

export const TEXT_DECORATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "underline", label: "Underline" },
  { value: "line-through", label: "Strikethrough" },
];

export const DEFAULT_ELEMENT_STYLE = {
  fontFamily: "",
  fontSize: null,
  fontWeight: null,
  color: "",
  backgroundColor: "",
  textAlign: "",
  lineHeight: null,
  letterSpacing: null,
  textTransform: "none",
  fontStyle: "normal",
  textDecoration: "none",
  textShadow: "",
  opacity: 100,
  visible: true,
  mobileFontSize: null,
  mobileLineHeight: null,
  width: null,
  height: null,
  minWidth: null,
  maxWidth: null,
  borderWidth: null,
  borderColor: "",
  borderRadius: null,
  paddingX: null,
  paddingY: null,
  marginTop: null,
  marginBottom: null,
  gap: null,
  justifyContent: "",
};

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function parseElementSelection(selection) {
  if (!selection) return { id: null, stepIndex: null };
  const match = String(selection).match(/^(stepLabel|stepDate|stepIcon):(\d+)$/);
  if (match) return { id: match[1], stepIndex: Number(match[2]) };
  return { id: selection, stepIndex: null };
}

export function buildElementSelection(id, stepIndex = null) {
  if (stepIndex == null || stepIndex === "") return id;
  return `${id}:${stepIndex}`;
}

export function getElementMeta(id) {
  return EDITABLE_ELEMENTS.find((item) => item.id === id) || null;
}

export function normalizeElementStyle(style = {}) {
  const source = asObject(style);
  return {
    fontFamily: String(source.fontFamily || ""),
    fontSize: numberOrNull(source.fontSize),
    fontWeight: numberOrNull(source.fontWeight),
    color: String(source.color || ""),
    backgroundColor: String(source.backgroundColor || ""),
    textAlign: TEXT_ALIGN_OPTIONS.some((item) => item.value === source.textAlign)
      ? source.textAlign
      : String(source.textAlign || ""),
    lineHeight: numberOrNull(source.lineHeight),
    letterSpacing: numberOrNull(source.letterSpacing),
    textTransform: TEXT_TRANSFORM_OPTIONS.some((item) => item.value === source.textTransform)
      ? source.textTransform
      : "none",
    fontStyle: FONT_STYLE_OPTIONS.some((item) => item.value === source.fontStyle)
      ? source.fontStyle
      : "normal",
    textDecoration: TEXT_DECORATION_OPTIONS.some((item) => item.value === source.textDecoration)
      ? source.textDecoration
      : "none",
    textShadow: String(source.textShadow || "").slice(0, 120),
    opacity: Math.max(0, Math.min(100, numberOrNull(source.opacity) ?? 100)),
    visible: source.visible !== false,
    mobileFontSize: numberOrNull(source.mobileFontSize),
    mobileLineHeight: numberOrNull(source.mobileLineHeight),
    width: numberOrNull(source.width),
    height: numberOrNull(source.height),
    minWidth: numberOrNull(source.minWidth),
    maxWidth: numberOrNull(source.maxWidth),
    borderWidth: numberOrNull(source.borderWidth),
    borderColor: String(source.borderColor || ""),
    borderRadius: numberOrNull(source.borderRadius),
    paddingX: numberOrNull(source.paddingX),
    paddingY: numberOrNull(source.paddingY),
    marginTop: numberOrNull(source.marginTop),
    marginBottom: numberOrNull(source.marginBottom),
    gap: numberOrNull(source.gap),
    justifyContent: ROW_ALIGN_OPTIONS.some((item) => item.value === source.justifyContent)
      ? source.justifyContent
      : String(source.justifyContent || ""),
  };
}

export function normalizeElementStyles(map = {}) {
  const source = asObject(map);
  const next = {};
  for (const item of EDITABLE_ELEMENTS) {
    if (source[item.id]) next[item.id] = normalizeElementStyle(source[item.id]);
  }
  return next;
}

/** Resolve style for an element, falling back to legacy global styleConfig fields. */
export function resolveElementStyle(elementId, styleConfig = {}) {
  const globals = asObject(styleConfig);
  const stored = normalizeElementStyles(globals.elementStyles)[elementId] || normalizeElementStyle();
  const fallbacks = {
    title: {
      fontFamily: globals.fontFamily || "",
      fontWeight: globals.headingFontWeight || 600,
      color: globals.textColor || globals.themeColor || "",
    },
    description: {
      fontFamily: globals.fontFamily || "",
      fontSize: globals.fontSize || 14,
      color: globals.dynamicColor || globals.textColor || "",
    },
    stepLabel: {
      fontFamily: globals.fontFamily || "",
      fontSize: globals.statusFontSize || 12,
      color: globals.statusColor || globals.textColor || "",
    },
    stepDate: {
      fontFamily: globals.fontFamily || "",
      fontSize: globals.dateFontSize || 11,
      fontWeight: 700,
      color: globals.dateColor || globals.textColor || "",
    },
    checkSection: {
      textAlign: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 14,
      paddingY: 14,
    },
    checkLabel: {
      fontFamily: globals.fontFamily || "",
      fontSize: 13,
      fontWeight: 700,
      color: globals.textColor || "",
      textAlign: "center",
      marginBottom: 8,
    },
    checkInput: {
      fontFamily: globals.fontFamily || "",
      fontSize: 14,
      fontWeight: 500,
      color: "#202223",
      backgroundColor: "#FFFFFF",
      borderColor: "#c9cccf",
      borderWidth: 1,
      borderRadius: 8,
      height: 40,
      width: null,
      paddingX: 14,
    },
    checkButton: {
      fontFamily: globals.fontFamily || "",
      fontSize: 14,
      fontWeight: 650,
      color: "#FFFFFF",
      backgroundColor: globals.themeColor || "#111827",
      borderColor: "",
      borderWidth: 0,
      borderRadius: 8,
      height: 40,
      minWidth: 76,
      paddingX: 16,
      textAlign: "center",
    },
  };
  const fallback = fallbacks[elementId] || {};
  return normalizeElementStyle({
    ...fallback,
    ...Object.fromEntries(Object.entries(stored).filter(([, value]) => value !== "" && value != null)),
    visible: stored.visible !== false,
  });
}

export function elementStyleToCss(elementStyle, { mobile = false } = {}) {
  const style = normalizeElementStyle(elementStyle);
  const css = {};
  if (style.fontFamily) css.fontFamily = style.fontFamily;
  const size = mobile && style.mobileFontSize != null ? style.mobileFontSize : style.fontSize;
  if (size != null) css.fontSize = `${size}px`;
  if (style.fontWeight != null) css.fontWeight = style.fontWeight;
  if (style.color) css.color = style.color;
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.textAlign) css.textAlign = style.textAlign;
  const lineHeight = mobile && style.mobileLineHeight != null ? style.mobileLineHeight : style.lineHeight;
  if (lineHeight != null) css.lineHeight = String(lineHeight);
  if (style.letterSpacing != null) css.letterSpacing = `${style.letterSpacing}px`;
  if (style.textTransform && style.textTransform !== "none") css.textTransform = style.textTransform;
  if (style.fontStyle && style.fontStyle !== "normal") css.fontStyle = style.fontStyle;
  if (style.textDecoration && style.textDecoration !== "none") css.textDecoration = style.textDecoration;
  if (style.textShadow) css.textShadow = style.textShadow;
  if (style.opacity != null && style.opacity !== 100) css.opacity = style.opacity / 100;
  if (style.visible === false) css.display = "none";
  if (style.width != null) css.width = `${style.width}px`;
  if (style.height != null) css.height = `${style.height}px`;
  if (style.minWidth != null) css.minWidth = `${style.minWidth}px`;
  if (style.maxWidth != null) css.maxWidth = `${style.maxWidth}px`;
  if (style.borderRadius != null) css.borderRadius = `${style.borderRadius}px`;
  if (style.borderWidth != null || style.borderColor) {
    css.borderStyle = "solid";
    if (style.borderWidth != null) css.borderWidth = `${style.borderWidth}px`;
    if (style.borderColor) css.borderColor = style.borderColor;
  }
  if (style.paddingX != null || style.paddingY != null) {
    const py = style.paddingY != null ? `${style.paddingY}px` : "0";
    const px = style.paddingX != null ? `${style.paddingX}px` : "0";
    css.padding = `${py} ${px}`;
  }
  if (style.marginTop != null) css.marginTop = `${style.marginTop}px`;
  if (style.marginBottom != null) css.marginBottom = `${style.marginBottom}px`;
  if (style.gap != null) css.gap = `${style.gap}px`;
  if (style.justifyContent) css.justifyContent = style.justifyContent;
  return css;
}

export function elementStyleToInline(elementStyle, { mobile = false } = {}) {
  const css = elementStyleToCss(elementStyle, { mobile });
  return Object.entries(css)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`)
    .join(";");
}

export function patchElementStyle(styleConfig, elementId, patch) {
  const current = normalizeElementStyles(styleConfig?.elementStyles);
  const existing = current[elementId] || normalizeElementStyle();
  return {
    ...styleConfig,
    elementStyles: {
      ...current,
      [elementId]: normalizeElementStyle({ ...existing, ...patch }),
    },
  };
}
