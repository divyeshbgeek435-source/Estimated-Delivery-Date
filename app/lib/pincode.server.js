import { INDIA_STATES, namesMatch, normalizePlaceName, stateAbbreviation, uniqueNames } from "./geo";
import {
  PINCODE_AVAILABLE_MESSAGE,
  formatWeightDisplay,
  matchPincodeRule,
  normalizeCountry,
  normalizePincode,
  normalizePincodeRules,
  normalizeWeightRules,
  publicPincodeState,
  resolveWeightDisplayMode,
} from "./pincode";

const ZIPPOPOTAM_BASE = "https://api.zippopotam.us";
const INDIA_POST_BASE = "https://api.postalpincode.in";
const GEONAMES_POSTAL =
  "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/geonames-postal-code/records";
const lookupCache = new Map();
const TTL_MS = 12 * 60 * 60 * 1000;
const MAX_CITY_PINCODES = 2000;

function cached(key, loader) {
  const hit = lookupCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  return Promise.resolve()
    .then(loader)
    .then((value) => {
      const count = Array.isArray(value?.pincodes)
        ? value.pincodes.length
        : value?.codes?.size || (value instanceof Map ? value.size : 0);
      // Never cache empty geo results - transient API failures were locking cities at 0 pins.
      if (count > 0 || value?.ok === true || value?.ok === false) {
        lookupCache.set(key, { at: Date.now(), value });
      }
      return value;
    });
}

export function clearPincodeLookupCache() {
  lookupCache.clear();
}

function placeLabel(payload) {
  const place = payload?.places?.[0] || {};
  return [place["place name"], place.state || place["state abbreviation"]]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function fromPayload(iso, postal, payload) {
  const place = payload?.places?.[0] || {};
  return {
    ok: true,
    country: String(payload["country abbreviation"] || iso).toUpperCase(),
    countryName: payload.country || "",
    code: postal,
    city: String(place["place name"] || "").trim(),
    state: String(place.state || place["state abbreviation"] || "").trim(),
    label: placeLabel(payload),
  };
}

async function lookupZippopotam(iso, postal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${ZIPPOPOTAM_BASE}/${iso.toLowerCase()}/${encodeURIComponent(postal)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) {
      return {
        ok: false,
        country: iso,
        code: postal,
        error: "Pincode not found for this country.",
      };
    }
    if (!response.ok) {
      return { ok: false, country: iso, code: postal, error: "Pincode lookup is unavailable right now." };
    }
    return fromPayload(iso, postal, await response.json());
  } catch {
    return { ok: false, country: iso, code: postal, error: "Pincode lookup is unavailable right now." };
  } finally {
    clearTimeout(timer);
  }
}

async function lookupIndiaPincode(postal) {
  const payload = await fetchJson(`${INDIA_POST_BASE}/pincode/${encodeURIComponent(postal)}`, 5000);
  const offices = Array.isArray(payload) ? payload[0]?.PostOffice || [] : [];
  const office = offices[0];
  if (!office) return null;
  const city = String(office.District || office.Block || "").trim();
  const state = String(office.State || "").trim();
  // One PIN can span multiple districts (e.g. 393125 → Bharuch/Narmada/Surat).
  // Keep every district/block so city-based delivery rules can match any of them.
  const districts = uniqueNames(offices.map((item) => item.District));
  const blocks = uniqueNames(offices.map((item) => item.Block).filter((item) => item && item !== "NA"));
  const cities = uniqueNames([...districts, ...blocks, city]);
  return {
    ok: true,
    country: "IN",
    countryName: "India",
    code: postal,
    city,
    state,
    cities,
    districts,
    label: [office.Name, city, state].filter(Boolean).join(", "),
  };
}

export async function lookupPostalCode(country, code) {
  const iso = normalizeCountry(country);
  const postal = normalizePincode(code);
  if (!postal) {
    return { ok: false, error: "Enter a pincode." };
  }

  const key = `place-v2:${iso}:${postal}`;
  const hit = lookupCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const value =
    iso === "IN"
      ? (await lookupIndiaPincode(postal)) || (await lookupZippopotam(iso, postal))
      : await lookupZippopotam(iso, postal);
  if (value?.ok || value?.error === "Pincode not found for this country.") {
    lookupCache.set(key, { at: Date.now(), value });
  }
  return value;
}

function addCode(bucket, code, label) {
  const normalized = normalizePincode(code);
  if (!normalized || bucket.has(normalized)) return;
  bucket.set(normalized, String(label || "").trim());
}

function majorityName(list = []) {
  const counts = new Map();
  let best = "";
  let bestCount = 0;
  for (const item of list) {
    const next = (counts.get(item) || 0) + 1;
    counts.set(item, next);
    if (next > bestCount) {
      best = item;
      bestCount = next;
    }
  }
  return best;
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function odsQuote(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function isIndiaStateName(value) {
  const name = normalizePlaceName(value);
  return INDIA_STATES.some((state) => normalizePlaceName(state) === name);
}

async function geonamesPostalCodes(where, { maxPages = 5 } = {}) {
  const bucket = new Map();
  const page = 100;
  let offset = 0;
  for (let step = 0; step < maxPages; step += 1) {
    const url = new URL(GEONAMES_POSTAL);
    url.searchParams.set("where", where);
    url.searchParams.set("select", "postal_code");
    url.searchParams.set("group_by", "postal_code");
    url.searchParams.set("limit", String(page));
    url.searchParams.set("offset", String(offset));
    const payload = await fetchJson(url.toString(), 5000);
    const rows = payload?.results || [];
    for (const row of rows) addCode(bucket, row.postal_code, "");
    const total = Number(payload?.total_count) || rows.length;
    offset += rows.length;
    if (!rows.length || offset >= total || bucket.size >= MAX_CITY_PINCODES) break;
  }
  return bucket;
}

function postalWhere(iso, field, place, state) {
  const clauses = [`country_code=${odsQuote(iso)}`, `${field}=${odsQuote(place)}`];
  const region = String(state || "").trim();
  if (region && region.length > 3) clauses.push(`admin_name1=${odsQuote(region)}`);
  return clauses.join(" AND ");
}

async function geonamesCityCodes(country, state, city) {
  const iso = normalizeCountry(country);
  const place = String(city || "").trim();
  if (!place) return { codes: new Map(), state: String(state || "").trim() };
  const region = String(state || "").trim();
  const district = await geonamesPostalCodes(postalWhere(iso, "admin_name2", place, region));
  const codes = district.size ? district : await geonamesPostalCodes(postalWhere(iso, "place_name", place, region));
  return { codes, state: region };
}

export async function suggestCitiesForPostal(country, query) {
  const iso = normalizeCountry(country);
  const needle = String(query || "").trim();
  if (needle.length < 2) return [];
  if (iso !== "IN") return [];
  return cached(`city-suggest:${iso}:${normalizePlaceName(needle)}`, async () => {
    const url = new URL(GEONAMES_POSTAL);
    url.searchParams.set("where", `country_code="IN" AND search(admin_name2, ${odsQuote(needle)})`);
    url.searchParams.set("select", "admin_name2,admin_name1");
    url.searchParams.set("group_by", "admin_name2,admin_name1");
    url.searchParams.set("limit", "12");
    const payload = await fetchJson(url.toString(), 8000);
    return (payload?.results || [])
      .map((row) => ({
        name: String(row.admin_name2 || "").trim(),
        state: String(row.admin_name1 || "").trim(),
      }))
      .filter((item) => item.name && !isIndiaStateName(item.name));
  });
}

async function zippopotamCityCodes(country, state, city) {
  const iso = normalizeCountry(country).toLowerCase();
  const place = encodeURIComponent(String(city || "").trim());
  const bucket = new Map();
  if (!place) return bucket;
  const abbrev = stateAbbreviation(country, state);
  const paths = uniqueNames([abbrev, state]).map(
    (region) => `${ZIPPOPOTAM_BASE}/${iso}/${encodeURIComponent(region)}/${place}`,
  );
  for (const url of paths) {
    const payload = await fetchJson(url);
    for (const item of payload?.places || []) {
      addCode(bucket, item["post code"], item["place name"] || city);
    }
    if (bucket.size) break;
  }
  return bucket;
}

function cityNameMatches(name, city) {
  if (namesMatch(name, city)) return true;
  const normalizedName = normalizePlaceName(name);
  const normalizedCity = normalizePlaceName(city);
  if (!normalizedCity) return false;
  if (normalizedName === `${normalizedCity} city` || normalizedName === `${normalizedCity} rs`) return true;
  if (normalizedName.startsWith(`${normalizedCity} `)) return true;
  return normalizedName.endsWith(`(${normalizedCity})`);
}

function officeBelongsToCity(office, city, state) {
  const district = String(office.District || "").trim();
  const officeState = String(office.State || "").trim();
  const name = String(office.Name || "").trim();
  if (state && !namesMatch(officeState, state)) return false;
  if (namesMatch(district, city)) return true;
  return Boolean(state) && cityNameMatches(name, city);
}

async function indiaPostOfficeCodes(city, state) {
  const bucket = new Map();
  const query = encodeURIComponent(String(city || "").trim());
  if (!query) return { codes: bucket, state: String(state || "").trim() };
  const payload = await fetchJson(`${INDIA_POST_BASE}/postoffice/${query}`);
  const offices = Array.isArray(payload) ? payload[0]?.PostOffice || [] : [];
  const states = [];
  for (const office of offices) {
    if (!officeBelongsToCity(office, city, state)) continue;
    addCode(bucket, office.Pincode, office.Name || city);
    const officeState = String(office.State || "").trim();
    if (officeState) states.push(officeState);
  }
  const inferred = String(state || "").trim() || majorityName(states);
  return { codes: bucket, state: inferred };
}

export async function listPincodesForCity({ country, state, city } = {}) {
  const iso = normalizeCountry(country);
  const place = String(city || "").trim();
  if (!place) return { pincodes: [], state: String(state || "").trim() };
  const region = String(state || "").trim();
  return cached(`city-pins-v3:${iso}:${normalizePlaceName(region)}:${normalizePlaceName(place)}`, async () => {
    // India Post first - fast and reliable for Indian cities. Geonames/Zippo enrich in parallel
    // but must not block the admin UI for minutes when OpenDataSoft is slow.
    if (iso === "IN") {
      const india = await indiaPostOfficeCodes(place, region);
      const enrich = Promise.all([
        geonamesCityCodes(iso, india.state || region, place).catch(() => ({ codes: new Map(), state: region })),
        zippopotamCityCodes(iso, india.state || region, place).catch(() => new Map()),
      ]);
      if (india.codes.size > 0) {
        // Prefer returning quickly with India Post results; merge extras if they finish soon.
        const raced = await Promise.race([
          enrich.then(([geo, zippo]) => ({ geo, zippo, timedOut: false })),
          new Promise((resolve) => setTimeout(() => resolve({ geo: { codes: new Map() }, zippo: new Map(), timedOut: true }), 2500)),
        ]);
        const merged = new Map([
          ...india.codes,
          ...(raced.geo?.codes || []),
          ...(raced.zippo || []),
        ]);
        return {
          pincodes: [...merged.entries()]
            .map(([code, label]) => ({ code, label: label || place }))
            .sort((left, right) => left.code.localeCompare(right.code))
            .slice(0, MAX_CITY_PINCODES),
          state: india.state || region,
        };
      }
      const [geo, zippo] = await enrich;
      const merged = new Map([...geo.codes, ...zippo]);
      return {
        pincodes: [...merged.entries()]
          .map(([code, label]) => ({ code, label: label || place }))
          .sort((left, right) => left.code.localeCompare(right.code))
          .slice(0, MAX_CITY_PINCODES),
        state: india.state || geo.state || region,
      };
    }

    const [geo, zippo] = await Promise.all([
      geonamesCityCodes(iso, region, place),
      zippopotamCityCodes(iso, region, place),
    ]);
    const merged = new Map([...geo.codes, ...zippo]);
    return {
      pincodes: [...merged.entries()]
        .map(([code, label]) => ({ code, label: label || place }))
        .sort((left, right) => left.code.localeCompare(right.code))
        .slice(0, MAX_CITY_PINCODES),
      state: geo.state || region,
    };
  });
}

export async function lookupPlaceForRules(rules = {}, code) {
  const countries = [...new Set([...(rules.countries || []), rules.country].filter(Boolean).map((item) => String(item).toUpperCase()))];
  const list = countries.length ? countries : ["IN"];
  for (const country of list) {
    const place = await lookupPostalCode(country, code);
    if (place?.ok) return place;
  }
  return { ok: false, code };
}

/**
 * Admin UI often hydrates city pincode lists client-side. If those lists were never
 * persisted (or were saved empty/stale), storefront checks fall through to place lookup
 * and incorrectly return unavailable. Expand from the same geo source used in admin.
 */
export async function expandPincodeRulesForCheck(rules = {}, shipping = {}) {
  const normalized = normalizePincodeRules(rules, shipping);
  if (!normalized.enabled || !normalized.locations.length) return normalized;

  let changed = false;
  const locations = await Promise.all(
    normalized.locations.map(async (location) => {
      try {
        const result = await listPincodesForCity({
          country: location.country,
          state: location.state,
          city: location.city,
        });
        const live = Array.isArray(result?.pincodes) ? result.pincodes : [];
        const existing = location.pincodes || [];
        if (!live.length) return location;
        const byCode = new Map();
        for (const entry of existing) {
          const code = normalizePincode(entry.code);
          if (code) byCode.set(code, entry);
        }
        let added = 0;
        for (const item of live) {
          const code = normalizePincode(item.code || item);
          if (!code || byCode.has(code)) continue;
          byCode.set(code, {
            code,
            label: item.label || location.city,
            city: location.city,
            state: result.state || location.state,
            minDays: Number(shipping?.transitMinDays) || 1,
            maxDays: Number(shipping?.transitMaxDays) || Number(shipping?.transitMinDays) || 2,
          });
          added += 1;
        }
        if (!added && (!result.state || location.state)) return location;
        changed = true;
        return {
          ...location,
          state: result.state || location.state,
          pincodes: [...byCode.values()],
        };
      } catch {
        return location;
      }
    }),
  );

  if (!changed) return normalized;
  return normalizePincodeRules({ ...normalized, locations }, shipping);
}

async function findPincodeInSelectedCities(rules, code, shipping = {}) {
  const needle = normalizePincode(code);
  if (!needle) return null;
  const normalized = normalizePincodeRules(rules, shipping);
  const matched = matchPincodeRule(needle, normalized);
  if (matched) return matched;

  for (const location of normalized.locations || []) {
    try {
      const result = await listPincodesForCity({
        country: location.country,
        state: location.state,
        city: location.city,
      });
      const hit = (result?.pincodes || []).find(
        (item) => normalizePincode(item.code || item) === needle,
      );
      if (!hit) continue;
      return {
        code: needle,
        label: hit.label || [location.city, location.state].filter(Boolean).join(", "),
        city: location.city,
        state: result.state || location.state,
        minDays: Number(shipping?.transitMinDays) || 1,
        maxDays: Number(shipping?.transitMaxDays) || Number(shipping?.transitMinDays) || 2,
        weight: location.weight || "",
        unit: location.unit || "kg",
      };
    } catch {
      // try next selected city
    }
  }
  return null;
}

function availableFromEntry(entry, rules, weightRules, productWeight, shipping) {
  const normalized = normalizePincodeRules(rules, shipping);
  const weights = normalizeWeightRules(weightRules);
  const displayMode = resolveWeightDisplayMode(weights, normalized);
  const weightValue = entry.weight
    ? `${String(entry.weight).trim()} ${String(entry.unit || weights.unit || "").trim()}`.trim()
    : formatWeightDisplay(weights, productWeight);
  return {
    enabled: true,
    available: true,
    country: normalized.country,
    code: entry.code,
    label: entry.label || [entry.city, entry.state].filter(Boolean).join(", "),
    city: entry.city || "",
    state: entry.state || "",
    minDays: entry.minDays,
    maxDays: entry.maxDays,
    weight: weightValue,
    displayMode,
    message: PINCODE_AVAILABLE_MESSAGE,
  };
}

/**
 * Storefront check used by the product widget. Prefer selected-city membership over
 * postal place-name matching so admin city picks behave the same on the storefront.
 */
export async function resolveStorefrontPincodeState({
  rules,
  shipping,
  weightRules,
  code,
  productWeight,
} = {}) {
  const expanded = await expandPincodeRulesForCheck(rules, shipping);
  const options = {
    code,
    rules: expanded,
    weightRules,
    productWeight,
    shipping,
  };

  let state = publicPincodeState(expanded, options);
  if (!code || state.available === true || state.enabled === false) {
    return { state, rules: expanded, place: null };
  }

  const cityHit = await findPincodeInSelectedCities(expanded, code, shipping);
  if (cityHit) {
    return {
      state: availableFromEntry(cityHit, expanded, weightRules, productWeight, shipping),
      rules: expanded,
      place: {
        ok: true,
        country: expanded.country,
        city: cityHit.city,
        state: cityHit.state,
        label: cityHit.label,
        cities: [cityHit.city].filter(Boolean),
      },
    };
  }

  // Always try postal lookup for selected cities - even when the first pass already
  // marked unavailable (e.g. empty saved pin lists / country-only coverage).
  if ((expanded.locations || []).length || state.needsLookup) {
    const place = await lookupPlaceForRules(expanded, code);
    state = publicPincodeState(expanded, { ...options, place });
    return { state, rules: expanded, place };
  }

  return { state, rules: expanded, place: null };
}
