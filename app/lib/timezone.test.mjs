import { z } from "zod";
import {
  FALLBACK_TIMEZONE,
  isValidTimeZone,
  resolveTimeZone,
  searchTimeZones,
} from "./timezone.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(name, fn) {
  fn();
  console.log(`ok ${name}`);
}

function zonedParts(date, timeZone) {
  const zone = resolveTimeZone(timeZone);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

const ianaTimezoneSchema = z.preprocess(
  (value) => (value == null || value === "" ? undefined : String(value).trim()),
  z
    .string()
    .min(1)
    .max(64)
    .refine((value) => isValidTimeZone(value), { message: "Choose a valid timezone" })
    .optional(),
);

run("valid IANA identifiers", () => {
  assert(isValidTimeZone("UTC"), "UTC should be valid");
  assert(isValidTimeZone("America/New_York"), "America/New_York should be valid");
  assert(isValidTimeZone("Asia/Kolkata"), "Asia/Kolkata should be valid");
});

run("invalid values are rejected", () => {
  assert(!isValidTimeZone(""), "empty should be invalid");
  assert(!isValidTimeZone("s"), `"s" should be invalid`);
  assert(!isValidTimeZone("Asia"), "incomplete zone should be invalid");
  assert(!isValidTimeZone("Not/A_Zone"), "unknown zone should be invalid");
});

run("resolveTimeZone falls back safely", () => {
  assert(resolveTimeZone("s") === FALLBACK_TIMEZONE, "s should fall back to UTC");
  assert(resolveTimeZone("") === FALLBACK_TIMEZONE, "empty should fall back to UTC");
  assert(resolveTimeZone("Asia/Kolkata") === "Asia/Kolkata", "valid zone should be kept");
  assert(
    resolveTimeZone("America/New_York") === "America/New_York",
    "existing widgets keep valid zones",
  );
});

run("search finds IANA zones and never returns the typed query", () => {
  const matches = searchTimeZones("kolkata");
  assert(matches.includes("Asia/Kolkata"), "search should find Asia/Kolkata");
  const fromS = searchTimeZones("s");
  assert(fromS.every(isValidTimeZone), "searching s must only return valid IANA ids");
  assert(!fromS.includes("s"), "search must not treat s as a timezone id");
});

run("typing s does not crash date math", () => {
  const now = new Date("2026-09-02T16:30:00.000Z");
  let formatted = "";
  try {
    formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: resolveTimeZone("s"),
    }).format(now);
  } catch (error) {
    throw new Error(`invalid timezone s should not throw: ${error.message}`);
  }
  assert(Boolean(formatted), "s should format using the fallback timezone");
  assert(
    zonedParts(now, "s").dateStr === zonedParts(now, "UTC").dateStr,
    "s should calculate as UTC",
  );
});

run("cutoff remaining time differs across timezones", () => {
  const now = new Date("2026-09-02T04:00:00.000Z");
  const utc = zonedParts(now, "UTC");
  const la = zonedParts(now, "America/Los_Angeles");
  const india = zonedParts(now, "Asia/Kolkata");
  assert(utc.dateStr === "2026-09-02", "UTC date should be Sep 2");
  assert(la.dateStr === "2026-09-01", "Los Angeles should still be Sep 1");
  assert(india.dateStr === "2026-09-02", "Kolkata should be Sep 2");
  assert(india.hour === 9 && india.minute === 30, "Kolkata should be 9:30");

  const remaining = (parts) => 12 * 60 - (parts.hour * 60 + parts.minute);
  assert(remaining(utc) !== remaining(india), "cutoff remaining time should depend on timezone");
});

run("backend validation rejects invalid timezones", () => {
  assert(!ianaTimezoneSchema.safeParse("s").success, "schema should reject s");
  assert(ianaTimezoneSchema.safeParse("Asia/Kolkata").success, "schema should accept Asia/Kolkata");
  assert(ianaTimezoneSchema.safeParse(undefined).success, "existing widgets can omit timezone");
});

console.log("All timezone tests passed.");
