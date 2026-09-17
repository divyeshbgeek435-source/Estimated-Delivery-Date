import { countryLabel, namesMatch, normalizePlaceName, uniqueNames } from "./geo";

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

export function normalizeWeightUnit(value, fallback = "kg") {
  const unit = String(value || "").trim().slice(0, 16);
  return unit || fallback;
}

export const WEIGHT_DISPLAY_MODES = {
  PINCODE: "PINCODE",
  DIRECT: "DIRECT",
};

export const LOCATION_SELECTION = {
  ALL: "ALL",
  SPECIFIC: "SPECIFIC",
};

export const DEFAULT_PINCODE_RULES = {
  enabled: false,
  country: "IN",
  countries: [],
  locations: [],
  stateMode: LOCATION_SELECTION.SPECIFIC,
  states: [],
  cityMode: LOCATION_SELECTION.SPECIFIC,
  cities: [],
  pincodes: [],
};

export const DEFAULT_WEIGHT_RULES = {
  value: "",
  unit: "kg",
  useProductWeight: false,
  displayMode: "",
};

export const PINCODE_UNAVAILABLE_MESSAGE = "Delivery unavailable";
export const PINCODE_AVAILABLE_MESSAGE = "Delivery available";

export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

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

function normalizeSelection(value, fallback = LOCATION_SELECTION.SPECIFIC) {
  return value === LOCATION_SELECTION.ALL ? LOCATION_SELECTION.ALL : fallback;
}

function normalizeCityEntry(entry) {
  if (typeof entry === "string") {
    const name = String(entry).trim().slice(0, 80);
    return name ? { name, state: "", weight: "", unit: "kg" } : null;
  }
  const name = String(entry?.name || "").trim().slice(0, 80);
  if (!name) return null;
  const unit = normalizeWeightUnit(entry?.unit);
  return {
    name,
    state: String(entry?.state || "").trim().slice(0, 80),
    weight: String(entry?.weight || "").trim().slice(0, 32),
    unit,
  };
}

export function normalizePincodeEntry(entry = {}, fallbackMin = 1, fallbackMax = 2) {
  const minDays = clampDays(entry.minDays, fallbackMin);
  const maxDays = Math.max(minDays, clampDays(entry.maxDays, fallbackMax));
  const code = normalizePincode(entry.code);
  const from = normalizePincode(entry.from);
  const to = normalizePincode(entry.to);
  const unit = normalizeWeightUnit(entry?.unit);
  return {
    code: code || undefined,
    from: from || undefined,
    to: to || undefined,
    minDays,
    maxDays,
    label: String(entry.label || "").trim().slice(0, 80),
    city: String(entry.city || "").trim().slice(0, 80),
    state: String(entry.state || "").trim().slice(0, 80),
    weight: String(entry.weight || "").trim().slice(0, 32),
    unit,
  };
}

function normalizeLocation(entry = {}, shipping = {}) {
  const city = String(entry.city || entry.name || "").trim().slice(0, 80);
  if (!city) return null;
  const ship = shipping || {};
  const fallbackMin = Number(ship.transitMinDays) || 1;
  const fallbackMax = Number(ship.transitMaxDays) || fallbackMin;
  const unit = normalizeWeightUnit(entry?.unit);
  const pincodes = Array.isArray(entry.pincodes)
    ? entry.pincodes
        .map((item) => {
          if (typeof item === "string" || typeof item === "number") {
            return normalizePincodeEntry(
              { code: item, city, state: entry.state, minDays: fallbackMin, maxDays: fallbackMax },
              fallbackMin,
              fallbackMax,
            );
          }
          return normalizePincodeEntry(
            { ...item, city: item.city || city, state: item.state || entry.state },
            fallbackMin,
            fallbackMax,
          );
        })
        .filter((item) => item.code)
        .slice(0, 2000)
    : [];
  return {
    country: normalizeCountry(entry.country),
    city,
    state: String(entry.state || "").trim().slice(0, 80),
    pincodes,
    weight: String(entry.weight || "").trim().slice(0, 32),
    unit,
  };
}

export function normalizePincodeRules(rules, shipping) {
  const source = rules && typeof rules === "object" ? rules : {};
  const ship = shipping && typeof shipping === "object" ? shipping : {};
  const fallbackMin = Number(ship.transitMinDays) || 1;
  const fallbackMax = Number(ship.transitMaxDays) || fallbackMin;
  const extraPincodes = Array.isArray(source.pincodes)
    ? source.pincodes
        .map((entry) => normalizePincodeEntry(entry, fallbackMin, fallbackMax))
        .filter((entry) => entry.code || (entry.from && entry.to))
    : [];
  let locations = Array.isArray(source.locations)
    ? source.locations.map((entry) => normalizeLocation(entry, ship)).filter(Boolean).slice(0, 80)
    : [];
  if (!locations.length && Array.isArray(source.cities) && source.cities.length) {
    locations = source.cities
      .map((city) => {
        const entry = normalizeCityEntry(city);
        if (!entry) return null;
        return normalizeLocation(
          {
            country: source.country,
            city: entry.name,
            state: entry.state,
            weight: entry.weight,
            unit: entry.unit,
            pincodes: extraPincodes.filter((item) => namesMatch(item.city, entry.name)),
          },
          ship,
        );
      })
      .filter(Boolean);
  }
  const locationPincodes = locations.flatMap((location) =>
    (location.pincodes || []).map((entry) => ({
      ...entry,
      city: entry.city || location.city,
      state: entry.state || location.state,
      weight: entry.weight || location.weight,
      unit: entry.unit || location.unit,
    })),
  );
  const pincodes = (locations.length ? locationPincodes : extraPincodes).slice(0, 8000);
  const cities = locations.map((location) => ({
    name: location.city,
    state: location.state,
    weight: location.weight,
    unit: location.unit,
  }));
  const countries = uniqueNames([
    ...(Array.isArray(source.countries) ? source.countries.map(normalizeCountry) : []),
    ...locations.map((location) => location.country),
  ]).slice(0, 40);

  return {
    enabled: Boolean(source.enabled),
    country: normalizeCountry(source.country || countries[0]),
    countries,
    locations,
    stateMode: normalizeSelection(source.stateMode),
    states: uniqueNames([
      ...(Array.isArray(source.states) ? source.states : []),
      ...locations.map((location) => location.state),
    ]).slice(0, 80),
    cityMode: normalizeSelection(source.cityMode),
    cities,
    pincodes,
  };
}

export function groupDeliveryLocations(rules = {}) {
  const normalized = normalizePincodeRules(rules);
  return normalized.countries.map((country) => ({
    country,
    label: countryLabel(country),
    cities: normalized.locations.filter((location) => location.country === country),
  }));
}

export function hasLocation(rules, country, city, state = "") {
  return (rules?.locations || []).some((location) => {
    if (String(location.country || "").toUpperCase() !== String(country || "").toUpperCase()) return false;
    if (!namesMatch(location.city, city)) return false;
    if (!state || !location.state) return true;
    return namesMatch(location.state, state);
  });
}

export function normalizeWeightRules(rules = {}) {
  const unit = normalizeWeightUnit(rules?.unit);
  const displayMode =
    rules?.displayMode === WEIGHT_DISPLAY_MODES.DIRECT || rules?.displayMode === WEIGHT_DISPLAY_MODES.PINCODE
      ? rules.displayMode
      : "";
  return {
    value: String(rules?.value || "").trim().slice(0, 32),
    unit,
    useProductWeight: Boolean(rules?.useProductWeight),
    displayMode,
  };
}

export function toCountryRules(pincodeRules = {}) {
  const normalized = normalizePincodeRules(pincodeRules);
  return {
    country: normalized.country,
    countries: normalized.countries,
    locations: normalized.locations,
    stateMode: normalized.stateMode,
    states: normalized.states,
    cityMode: normalized.cityMode,
    cities: normalized.cities,
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

export function hasAreaCoverage(rules = {}) {
  const normalized = normalizePincodeRules(rules);
  if (normalized.locations.length > 0) return true;
  if (normalized.countries.length > 0) return false;
  return (
    normalized.stateMode === LOCATION_SELECTION.ALL ||
    normalized.cityMode === LOCATION_SELECTION.ALL ||
    normalized.states.length > 0 ||
    normalized.cities.length > 0
  );
}

export function placeFromLookup(payload = {}) {
  const primaryCity = String(payload.city || "").trim();
  const cities = uniqueNames([
    primaryCity,
    ...(Array.isArray(payload.cities) ? payload.cities : []),
    ...(Array.isArray(payload.districts) ? payload.districts : []),
  ]);
  return {
    ok: payload?.ok !== false,
    country: normalizeCountry(payload.country),
    city: primaryCity,
    state: String(payload.state || "").trim(),
    label: String(payload.label || "").trim(),
    cities,
  };
}

function placeMatchesCity(place, cityName) {
  if (!cityName) return false;
  const candidates = place.cities?.length ? place.cities : [place.city];
  return candidates.some((city) => namesMatch(city, cityName));
}

export function selectionAllowsPlace(rules = {}, place = {}) {
  const normalized = normalizePincodeRules(rules);
  const resolved = placeFromLookup(place);
  if (!resolved.ok) return false;

  if (normalized.locations.length) {
    return normalized.locations.some((location) => {
      if (location.country !== resolved.country) return false;
      if (location.state && resolved.state && !namesMatch(location.state, resolved.state)) return false;
      return placeMatchesCity(resolved, location.city);
    });
  }

  if (resolved.country !== normalized.country) return false;

  if (normalized.stateMode === LOCATION_SELECTION.SPECIFIC && normalized.states.length) {
    const allowed = normalized.states.some((state) => namesMatch(state, resolved.state));
    if (!allowed) return false;
  }

  if (normalized.cityMode === LOCATION_SELECTION.SPECIFIC && normalized.cities.length) {
    const allowed = normalized.cities.some((city) => placeMatchesCity(resolved, city.name));
    if (!allowed) return false;
  }

  return true;
}

function weightFromParts(value, unit, weightRules, productWeight) {
  if (value) {
    return `${String(value).trim()} ${String(unit || weightRules.unit || "").trim()}`.trim();
  }
  return formatWeightDisplay(weightRules, productWeight);
}

function cityWeight(rules, cityName) {
  const match = (rules.cities || []).find((city) => namesMatch(city.name, cityName));
  return match?.weight ? match : null;
}

function unavailableState(code, rules) {
  return {
    enabled: true,
    available: false,
    country: rules.country,
    code,
    message: PINCODE_UNAVAILABLE_MESSAGE,
    canRequest: true,
  };
}

export function resolveWeightDisplayMode(weightRules = {}, pincodeRules = {}) {
  const normalized = normalizeWeightRules(weightRules);
  if (normalized.displayMode) return normalized.displayMode;
  if (pincodeRules?.enabled) return WEIGHT_DISPLAY_MODES.PINCODE;
  if (normalized.value || normalized.useProductWeight) return WEIGHT_DISPLAY_MODES.DIRECT;
  return "";
}

export function asksForPincode(weightRules = {}, pincodeRules = {}) {
  if (resolveWeightDisplayMode(weightRules, pincodeRules) === WEIGHT_DISPLAY_MODES.DIRECT) return false;
  return Boolean(normalizePincodeRules(pincodeRules).enabled);
}

export function resolveDeliveryAvailability({
  code,
  rules,
  weightRules,
  place,
  productWeight,
  shipping,
} = {}) {
  const pincodeRules = normalizePincodeRules(rules, shipping);
  const weights = normalizeWeightRules(weightRules);
  const displayMode = resolveWeightDisplayMode(weights, pincodeRules);
  const fallbackWeight = formatWeightDisplay(weights, productWeight);

  if (displayMode === WEIGHT_DISPLAY_MODES.DIRECT) {
    return {
      enabled: false,
      displayMode,
      weight: fallbackWeight,
    };
  }

  if (!pincodeRules.enabled) {
    return {
      enabled: false,
      displayMode,
      weight: "",
    };
  }

  const requested = normalizePincode(code);
  if (!requested) {
    return {
      enabled: true,
      country: pincodeRules.country,
      displayMode,
      weight: displayMode === WEIGHT_DISPLAY_MODES.DIRECT ? fallbackWeight : "",
    };
  }

  const entry = matchPincodeRule(requested, pincodeRules);
  if (entry) {
    const weight = weightFromParts(entry.weight, entry.unit, weights, productWeight);
    return {
      enabled: true,
      available: true,
      country: pincodeRules.country,
      code: requested,
      label: entry.label || [entry.city, entry.state].filter(Boolean).join(", "),
      city: entry.city || "",
      state: entry.state || "",
      minDays: entry.minDays,
      maxDays: entry.maxDays,
      weight,
      displayMode,
      message: PINCODE_AVAILABLE_MESSAGE,
    };
  }

  if (!hasAreaCoverage(pincodeRules)) {
    return { ...unavailableState(requested, pincodeRules), displayMode };
  }

  if (!place) {
    return {
      enabled: true,
      needsLookup: true,
      country: pincodeRules.country,
      code: requested,
      displayMode,
    };
  }

  const resolvedPlace = placeFromLookup(place);
  if (!selectionAllowsPlace(pincodeRules, resolvedPlace)) {
    return { ...unavailableState(requested, pincodeRules), displayMode };
  }

  const cityRule = cityWeight(pincodeRules, resolvedPlace.city);
  const weight = weightFromParts(cityRule?.weight, cityRule?.unit, weights, productWeight);
  return {
    enabled: true,
    available: true,
    country: pincodeRules.country,
    code: requested,
    label: resolvedPlace.label || [resolvedPlace.city, resolvedPlace.state].filter(Boolean).join(", "),
    city: resolvedPlace.city,
    state: resolvedPlace.state,
    minDays: Number(shipping?.transitMinDays) || 1,
    maxDays: Number(shipping?.transitMaxDays) || 2,
    weight,
    displayMode,
    message: PINCODE_AVAILABLE_MESSAGE,
  };
}

export async function resolveDeliveryAvailabilityAsync(options = {}, lookup) {
  const first = resolveDeliveryAvailability(options);
  if (!first.needsLookup || typeof lookup !== "function") return first;
  const place = await lookup(first.country, first.code);
  return resolveDeliveryAvailability({ ...options, place });
}

export function shippingWithPincodeRule(shipping, rule) {
  const ship = shipping && typeof shipping === "object" ? shipping : {};
  if (!rule) return ship;
  return {
    ...ship,
    transitMinDays: rule.minDays ?? ship.transitMinDays,
    transitMaxDays: rule.maxDays ?? ship.transitMaxDays,
  };
}

export function formatWeightDisplay(rules = {}, productWeight = "") {
  const normalized = normalizeWeightRules(rules);
  const variant = String(productWeight || "").trim();
  if (normalized.useProductWeight) {
    return variant;
  }
  if (normalized.value) {
    return `${normalized.value} ${normalized.unit}`.trim();
  }
  return "";
}

export function formatPincodeStatusLine(pincode = {}) {
  if (pincode.available === false) return pincode.message || "Delivery unavailable";
  if (!pincode.available) return "";
  return [pincode.message || PINCODE_AVAILABLE_MESSAGE, pincode.label, pincode.weight]
    .filter(Boolean)
    .join(" - ");
}

export function publicPincodeState(rules, options = {}) {
  const state = resolveDeliveryAvailability({
    code: options.code,
    rules,
    weightRules: options.weightRules,
    place: options.place,
    productWeight: options.productWeight,
    shipping: options.shipping,
  });
  if (state.displayMode === WEIGHT_DISPLAY_MODES.DIRECT) {
    return {
      ...state,
      enabled: false,
      weight: state.weight || formatWeightDisplay(options.weightRules, options.productWeight),
    };
  }
  return state;
}

export { normalizePlaceName };
