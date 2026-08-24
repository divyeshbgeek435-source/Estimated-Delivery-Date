export const PINCODE_COUNTRIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "AT", label: "Austria" },
  { value: "CH", label: "Switzerland" },
  { value: "IE", label: "Ireland" },
  { value: "NZ", label: "New Zealand" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "MY", label: "Malaysia" },
  { value: "TH", label: "Thailand" },
  { value: "PH", label: "Philippines" },
  { value: "ID", label: "Indonesia" },
  { value: "PK", label: "Pakistan" },
  { value: "BD", label: "Bangladesh" },
  { value: "LK", label: "Sri Lanka" },
  { value: "ZA", label: "South Africa" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
];

export const WEIGHT_UNITS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
];

export const DEFAULT_PINCODE_RULES = {
  enabled: false,
  country: "IN",
  pincodes: [],
};

export const DEFAULT_WEIGHT_RULES = {
  value: "",
  unit: "kg",
  useProductWeight: false,
};

export const PINCODE_UNAVAILABLE_MESSAGE = "Delivery not available for this pincode.";

export function normalizePincode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeCountry(value) {
  const country = String(value || "IN")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  return PINCODE_COUNTRIES.some((item) => item.value === country) ? country : "IN";
}

function clampDays(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(90, Math.max(0, Math.round(number)));
}

export function normalizePincodeEntry(entry = {}, fallbackMin = 1, fallbackMax = 2) {
  const minDays = clampDays(entry.minDays, fallbackMin);
  const maxDays = Math.max(minDays, clampDays(entry.maxDays, fallbackMax));
  const code = normalizePincode(entry.code);
  const from = normalizePincode(entry.from);
  const to = normalizePincode(entry.to);
  return {
    code: code || undefined,
    from: from || undefined,
    to: to || undefined,
    minDays,
    maxDays,
    label: String(entry.label || "").trim().slice(0, 80),
  };
}

export function normalizePincodeRules(rules = {}, shipping = {}) {
  const fallbackMin = Number(shipping.transitMinDays) || 1;
  const fallbackMax = Number(shipping.transitMaxDays) || fallbackMin;
  const pincodes = Array.isArray(rules?.pincodes)
    ? rules.pincodes
        .map((entry) => normalizePincodeEntry(entry, fallbackMin, fallbackMax))
        .filter((entry) => entry.code || (entry.from && entry.to))
        .slice(0, 500)
    : [];

  return {
    enabled: Boolean(rules?.enabled),
    country: normalizeCountry(rules?.country),
    pincodes,
  };
}

export function normalizeWeightRules(rules = {}) {
  const unit = WEIGHT_UNITS.some((item) => item.value === rules?.unit) ? rules.unit : "kg";
  return {
    value: String(rules?.value || "").trim().slice(0, 32),
    unit,
    useProductWeight: Boolean(rules?.useProductWeight),
  };
}

export function parsePincodeList(value) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function matchPincodeRule(code, rules = {}) {
  const needle = normalizePincode(code);
  if (!needle) return null;
  const normalized = normalizePincodeRules(rules);

  for (const entry of normalized.pincodes) {
    const exact = normalizePincode(entry.code);
    if (exact && exact === needle) return entry;

    const from = normalizePincode(entry.from);
    const to = normalizePincode(entry.to);
    if (
      from &&
      to &&
      needle.length === from.length &&
      from.length === to.length &&
      needle >= from &&
      needle <= to
    ) {
      return entry;
    }
  }

  return null;
}

export function shippingWithPincodeRule(shipping = {}, rule) {
  if (!rule) return shipping;
  return {
    ...shipping,
    transitMinDays: rule.minDays ?? shipping.transitMinDays,
    transitMaxDays: rule.maxDays ?? shipping.transitMaxDays,
  };
}

export function formatWeightDisplay(rules = {}, productWeight = "") {
  const normalized = normalizeWeightRules(rules);
  if (normalized.value) {
    return `${normalized.value} ${normalized.unit}`.trim();
  }
  if (normalized.useProductWeight) {
    return String(productWeight || "").trim();
  }
  return "";
}

export function publicPincodeState(rules, options = {}) {
  const normalized = normalizePincodeRules(rules);
  if (!normalized.enabled) {
    return { enabled: false };
  }

  const requested = normalizePincode(options.code);
  if (!requested) {
    return { enabled: true, country: normalized.country };
  }

  const rule = matchPincodeRule(requested, normalized);
  if (!rule) {
    return {
      enabled: true,
      country: normalized.country,
      available: false,
      code: requested,
      message: PINCODE_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    enabled: true,
    country: normalized.country,
    available: true,
    code: requested,
    label: rule.label || "",
    minDays: rule.minDays,
    maxDays: rule.maxDays,
  };
}
