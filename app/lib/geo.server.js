import { COUNTRY_GEO_NAMES, INDIA_STATES, countryGeoName, uniqueNames } from "./geo";
import { normalizeCountry } from "./pincode";
import { suggestCitiesForPostal } from "./pincode.server";

const cache = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;
const COUNTRIES_NOW = "https://countriesnow.space/api/v0.1";

function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  return Promise.resolve()
    .then(loader)
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    });
}

async function countriesNow(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${COUNTRIES_NOW}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload?.error) return null;
    return payload?.data || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function listStatesForCountry(country) {
  const iso = normalizeCountry(country);
  const name = countryGeoName(iso);
  return cached(`states:${iso}`, async () => {
    const data = await countriesNow("countries/states", { country: name });
    const states = uniqueNames((data?.states || []).map((item) => item?.name || item));
    if (states.length) return states;
    if (iso === "IN") return [...INDIA_STATES];
    return [];
  });
}

export async function listCitiesForState(country, state) {
  const iso = normalizeCountry(country);
  const name = countryGeoName(iso);
  const region = String(state || "").trim();
  if (!region) return [];
  return cached(`cities:${iso}:${region.toLowerCase()}`, async () => {
    const data = await countriesNow("countries/state/cities", { country: name, state: region });
    return uniqueNames(Array.isArray(data) ? data : []);
  });
}

export async function listCitiesForStates(country, states = []) {
  const regions = uniqueNames(states);
  if (!regions.length) return [];
  const groups = await Promise.all(regions.map((state) => listCitiesForState(country, state)));
  return uniqueNames(groups.flat());
}

export async function listCityNamesForCountry(country) {
  const iso = normalizeCountry(country);
  const name = countryGeoName(iso);
  return cached(`city-names:${iso}`, async () => {
    const data = await countriesNow("countries/cities", { country: name });
    return uniqueNames(Array.isArray(data) ? data : []);
  });
}

export async function listCitiesForCountry(country) {
  const iso = normalizeCountry(country);
  return cached(`cities-full:${iso}`, async () => {
    const states = await listStatesForCountry(iso);
    const cities = [];
    const seen = new Set();
    const chunkSize = 10;
    for (let index = 0; index < states.length; index += chunkSize) {
      const chunk = states.slice(index, index + chunkSize);
      const groups = await Promise.all(chunk.map((state) => listCitiesForState(iso, state)));
      chunk.forEach((state, offset) => {
        for (const name of groups[offset] || []) {
          const key = `${name.toLowerCase()}|${state.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          cities.push({ name, state });
        }
      });
    }
    return cities;
  });
}

export function supportedGeoCountries() {
  return Object.keys(COUNTRY_GEO_NAMES);
}

export async function suggestCitiesForCountry(country, query) {
  const iso = normalizeCountry(country);
  const needle = String(query || "").trim();
  if (needle.length < 2) return [];
  const postal = await suggestCitiesForPostal(iso, needle);
  if (postal.length) return postal;
  const names = await listCityNamesForCountry(iso);
  const lower = needle.toLowerCase();
  return names
    .filter((name) => name.toLowerCase().includes(lower))
    .slice(0, 12)
    .map((name) => ({ name, state: "" }));
}
