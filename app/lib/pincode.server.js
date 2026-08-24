import { normalizeCountry, normalizePincode } from "./pincode";

const ZIPPOPOTAM_BASE = "https://api.zippopotam.us";

function placeLabel(payload) {
  const place = payload?.places?.[0] || {};
  return [place["place name"], place.state || place["state abbreviation"]]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

export async function lookupPostalCode(country, code) {
  const iso = normalizeCountry(country).toLowerCase();
  const postal = normalizePincode(code);
  if (!postal) {
    return { ok: false, error: "Enter a pincode." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${ZIPPOPOTAM_BASE}/${iso}/${encodeURIComponent(postal)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) {
      return { ok: false, country: iso.toUpperCase(), code: postal, error: "Pincode not found for this country." };
    }
    if (!response.ok) {
      return { ok: false, country: iso.toUpperCase(), code: postal, error: "Pincode lookup is unavailable right now." };
    }
    const payload = await response.json();
    return {
      ok: true,
      country: String(payload["country abbreviation"] || iso).toUpperCase(),
      countryName: payload.country || "",
      code: postal,
      label: placeLabel(payload),
    };
  } catch {
    return { ok: false, country: iso.toUpperCase(), code: postal, error: "Pincode lookup is unavailable right now." };
  } finally {
    clearTimeout(timer);
  }
}
