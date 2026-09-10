import { requireAdmin } from "../lib/auth.server";
import {
  listCitiesForCountry,
  listCitiesForState,
  listCitiesForStates,
  listCityNamesForCountry,
  listStatesForCountry,
  suggestCitiesForCountry,
} from "../lib/geo.server";
import { listPincodesForCity, clearPincodeLookupCache } from "../lib/pincode.server";

export const loader = async ({ request }) => {
  await requireAdmin(request);
  const url = new URL(request.url);
  const country = url.searchParams.get("country") || "IN";
  const state = url.searchParams.get("state") || "";
  const city = url.searchParams.get("city") || "";
  const statesParam = url.searchParams.get("states") || "";
  const states = statesParam
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (url.searchParams.get("pincodes")) {
    if (url.searchParams.get("refresh")) clearPincodeLookupCache();
    const result = await listPincodesForCity({ country, state, city });
    const pincodes = Array.isArray(result) ? result : result?.pincodes || [];
    return { country, state: result?.state || state, city, pincodes };
  }
  const suggest = url.searchParams.get("suggest") || "";
  if (suggest) {
    const cities = await suggestCitiesForCountry(country, suggest);
    return { country, cities, names: cities.map((item) => item.name) };
  }
  if (url.searchParams.get("cityNames")) {
    const names = await listCityNamesForCountry(country);
    return { country, names, cities: names.map((name) => ({ name, state: "" })) };
  }
  if (url.searchParams.get("cities")) {
    const cities = await listCitiesForCountry(country);
    return { country, cities };
  }
  if (state) {
    const listed = await listCitiesForState(country, state);
    return { country, state, cities: listed };
  }
  if (states.length) {
    const listed = await listCitiesForStates(country, states);
    return { country, states, cities: listed };
  }

  const listed = await listStatesForCountry(country);
  return { country, states: listed };
};
