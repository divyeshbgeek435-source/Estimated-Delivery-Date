import { TEMPLATE_STYLE_PRESETS } from "./constants";

export const DESIGN_KEY = "__design";

function normalizeDesign(value) {
  const design = String(value || "").trim().toUpperCase();
  return design || "";
}

function sameColor(left, right) {
  return String(left || "").trim().toUpperCase() === String(right || "").trim().toUpperCase();
}

/** Infer animated design from saved style when the design key was stripped by Prisma. */
function designFromStyle(styleConfig = {}) {
  const bg = styleConfig.backgroundColor;
  const border = styleConfig.borderColor;
  const entries = Object.entries(TEMPLATE_STYLE_PRESETS).filter(([key]) => key !== "TIMELINE");
  for (const [design, preset] of entries) {
    if (preset.backgroundColor && sameColor(bg, preset.backgroundColor)) return design;
    if (preset.borderColor && sameColor(border, preset.borderColor)) return design;
  }
  return "";
}

/**
 * Resolve the storefront/admin design template.
 * Prefer translations.__design (always persisted) over top-level designTemplate
 * (historically stripped by Prisma because it was missing from the schema).
 */
export function resolveDesignTemplate(messageConfig = {}, styleConfig = {}) {
  const translations = messageConfig.translations || {};
  const fromTranslations = normalizeDesign(translations[DESIGN_KEY]);
  const fromField = normalizeDesign(messageConfig.designTemplate);
  const picked =
    (fromTranslations && fromTranslations !== "TIMELINE" ? fromTranslations : "") ||
    (fromField && fromField !== "TIMELINE" ? fromField : "") ||
    fromTranslations ||
    fromField ||
    designFromStyle(styleConfig) ||
    "TIMELINE";
  return picked;
}
