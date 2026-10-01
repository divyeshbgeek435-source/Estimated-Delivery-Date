export const SHIPPING_DAY_MAX = 60;

export const PROCESSING_DAY_RANGE_MESSAGE = "Enter a value from 0 to 60 days.";
export const PROCESSING_DAY_REQUIRED_MESSAGE = "This field is required.";
export const PROCESSING_DAY_ORDER_MESSAGE =
  "Maximum days must be equal to or more than minimum days.";
export const TRANSIT_DAY_ORDER_MESSAGE =
  "Maximum days must be equal to or more than minimum days.";

export const SHIPPING_DAY_LIMITS = {
  processingMin: { min: 0, max: SHIPPING_DAY_MAX },
  processingMax: { min: 0, max: SHIPPING_DAY_MAX },
  transitMin: { min: 0, max: SHIPPING_DAY_MAX },
  transitMax: { min: 0, max: SHIPPING_DAY_MAX },
};

export const CUTOFF_LIMITS = {
  hours: { min: 1, max: 12 },
  minutes: { min: 0, max: 59 },
};

export const STYLE_NUMBER_LIMITS = {
  borderRadius: { min: 0, max: 32 },
  borderWidth: { min: 0, max: 12 },
  padding: { min: 0, max: 64 },
  iconSize: { min: 12, max: 72 },
  progressWidth: { min: 1, max: 8 },
  fontSize: { min: 10, max: 24 },
  statusFontSize: { min: 8, max: 24 },
  dateFontSize: { min: 8, max: 24 },
  headingFontWeight: { min: 400, max: 900 },
};

function eventValue(event) {
  const target = event?.currentTarget ?? event?.target;
  if (target?.value != null) return target.value;
  return event?.detail?.value;
}

function digitInt(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(Math.abs(value));
  }
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return NaN;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function clampInt(value, min, max, fallback) {
  const number = digitInt(value);
  if (!Number.isFinite(number)) return fallback;
  const lower = Number(min);
  const upper = Number(max);
  const lo = Number.isFinite(lower) ? lower : number;
  const hi = Number.isFinite(upper) ? upper : number;
  return Math.min(hi, Math.max(lo, number));
}

export function clampToBounds(value, bounds = {}, fallback) {
  return clampInt(value, bounds.min, bounds.max, fallback);
}

export function parseBoundedInt(raw, bounds = {}) {
  const number = digitInt(raw);
  if (!Number.isFinite(number)) return null;
  return clampInt(number, bounds.min, bounds.max, null);
}

export function readInputText(event) {
  const target = event?.currentTarget ?? event?.target;
  const fromValues = Array.isArray(target?.values) ? target.values.find((item) => item != null && item !== "") : "";
  const raw =
    fromValues != null && fromValues !== ""
      ? fromValues
      : target?.value != null && target.value !== ""
        ? target.value
        : event?.detail?.value != null
          ? event.detail.value
          : target?.value;
  return String(raw ?? "")
    .replace(/\s*days\s*$/i, "")
    .trim();
}

export function processingDayError(value, required = false) {
  const text = String(value ?? "").trim();
  if (!text && required) return PROCESSING_DAY_REQUIRED_MESSAGE;
  if (!/^\d+$/.test(text)) return PROCESSING_DAY_RANGE_MESSAGE;
  const number = Number(text);
  if (number < SHIPPING_DAY_LIMITS.processingMin.min || number > SHIPPING_DAY_LIMITS.processingMin.max) {
    return PROCESSING_DAY_RANGE_MESSAGE;
  }
  return "";
}

export function processingDayOrderError(minValue, maxValue, message = PROCESSING_DAY_ORDER_MESSAGE) {
  if (processingDayError(minValue) || processingDayError(maxValue)) return "";
  if (Number(maxValue) < Number(minValue)) return message;
  return "";
}

export function processingDayDraftValue(text) {
  const trimmed = String(text ?? "").trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export function intFieldValue(value, bounds, fallback = 0) {
  return String(clampToBounds(value, bounds, fallback));
}

export function boundedIntFromEvent(event, bounds = {}, fallback) {
  const parsed = parseBoundedInt(eventValue(event), bounds);
  const next =
    parsed ??
    clampToBounds(fallback, bounds, Number.isFinite(Number(bounds.min)) ? bounds.min : 0);
  const target = event?.currentTarget ?? event?.target;
  if (target != null && next != null) {
    const text = String(next);
    if (String(target.value) !== text) target.value = text;
  }
  return next;
}
