import { INDIA_STATES, namesMatch, normalizePlaceName, stateAbbreviation, uniqueNames } from "./geo";
import { normalizeCountry, normalizePincode } from "./pincode";

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
      lookupCache.set(key, { at: Date.now(), value });
      return value;
    });
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
  return {
    ok: true,
    country: "IN",
    countryName: "India",
    code: postal,
    city,
    state,
    label: [office.Name, city, state].filter(Boolean).join(", "),
  };
}

export async function lookupPostalCode(country, code) {
  const iso = normalizeCountry(country);
  const postal = normalizePincode(code);
  if (!postal) {
    return { ok: false, error: "Enter a pincode." };
  }

  const key = `${iso}:${postal}`;
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

async function geonamesPostalCodes(where) {
  const bucket = new Map();
  const page = 100;
  let offset = 0;
  for (let step = 0; step < 20; step += 1) {
    const url = new URL(GEONAMES_POSTAL);
    url.searchParams.set("where", where);
    url.searchParams.set("select", "postal_code");
    url.searchParams.set("group_by", "postal_code");
    url.searchParams.set("limit", String(page));
    url.searchParams.set("offset", String(offset));
    const payload = await fetchJson(url.toString(), 8000);
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
  if (!place) return [];
  const region = String(state || "").trim();
  return cached(`city-pins-v2:${iso}:${normalizePlaceName(region)}:${normalizePlaceName(place)}`, async () => {
    const geo = await geonamesCityCodes(iso, region, place);
    const india = iso === "IN" ? await indiaPostOfficeCodes(place, geo.state || region) : { codes: new Map(), state: region };
    const zippo = await zippopotamCityCodes(iso, india.state || geo.state || region, place);
    const merged = new Map([...geo.codes, ...india.codes, ...zippo]);
    return {
      pincodes: [...merged.entries()]
        .map(([code, label]) => ({ code, label: label || place }))
        .sort((left, right) => left.code.localeCompare(right.code))
        .slice(0, MAX_CITY_PINCODES),
      state: india.state || geo.state || region,
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
