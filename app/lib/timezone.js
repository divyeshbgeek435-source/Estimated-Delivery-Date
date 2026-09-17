export const FALLBACK_TIMEZONE = "UTC";

const TIMEZONE_CACHE = new Map();

export const POPULAR_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function isValidTimeZone(value) {
  const zone = String(value || "").trim();
  if (!zone || zone.length > 64) return false;
  const cached = TIMEZONE_CACHE.get(zone);
  if (cached === zone) return true;
  if (cached && cached !== zone) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    TIMEZONE_CACHE.set(zone, zone);
    return true;
  } catch {
    TIMEZONE_CACHE.set(zone, FALLBACK_TIMEZONE);
    return false;
  }
}

export function resolveTimeZone(value, fallback = FALLBACK_TIMEZONE) {
  const zone = String(value || "").trim();
  if (isValidTimeZone(zone)) return zone;
  if (isValidTimeZone(fallback)) return fallback;
  return FALLBACK_TIMEZONE;
}

export function listIanaTimeZones() {
  let fromIntl = [];
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      fromIntl = Intl.supportedValuesOf("timeZone");
    }
  } catch {
    // Use the popular list when the runtime cannot enumerate zones.
  }
  return [...new Set([...POPULAR_TIMEZONES, ...fromIntl])].filter(isValidTimeZone);
}

function timezoneOffsetLabel(zone, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    }).formatToParts(now);
    return parts.find((part) => part.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

export function timezoneLabel(zone) {
  const id = resolveTimeZone(zone);
  const city = id.split("/").pop().replace(/_/g, " ");
  const offset = timezoneOffsetLabel(id);
  return offset ? `${city} · ${id} (${offset})` : `${city} · ${id}`;
}

function searchableText(zone) {
  return `${zone} ${zone.replace(/_/g, " ")} ${zone.split("/").pop()} ${timezoneLabel(zone)}`.toLowerCase();
}

export function searchTimeZones(query = "", { limit = 40, selected } = {}) {
  const all = listIanaTimeZones();
  const raw = String(query || "").trim();
  const needle = raw.toLowerCase();
  const selectedZone = selected && isValidTimeZone(selected) ? selected : "";

  if (!needle) {
    const unique = [];
    const seen = new Set();
    for (const zone of [selectedZone, ...POPULAR_TIMEZONES, ...all].filter(Boolean)) {
      if (!isValidTimeZone(zone) || seen.has(zone)) continue;
      seen.add(zone);
      unique.push(zone);
      if (unique.length >= limit) break;
    }
    return unique;
  }

  const ranked = all.filter((zone) => searchableText(zone).includes(needle));
  const unique = [];
  const seen = new Set();
  if (selectedZone && searchableText(selectedZone).includes(needle)) {
    unique.push(selectedZone);
    seen.add(selectedZone);
  }
  for (const zone of ranked) {
    if (seen.has(zone)) continue;
    seen.add(zone);
    unique.push(zone);
    if (unique.length >= limit) break;
  }
  return unique;
}
