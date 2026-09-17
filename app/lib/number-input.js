export const SHIPPING_DAY_MAX = 30;

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
