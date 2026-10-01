import { APP_EMBED_HANDLE } from "./theme-editor";

export const THEME_APP_EXTENSION_UID = "edd-theme-app-extension-001";
export const THEME_APP_EXTENSION_HANDLE = "delivery-date-widget";

export function defaultEmbedIdentifiers(extra = []) {
  return [
    process.env.SHOPIFY_API_KEY,
    process.env.SHOPIFY_DELIVERY_DATE_WIDGET_ID,
    "428f3d88064e44c926da9dbde635d831",
    "b6ee452490636fdabe1c0381d99da8d2",
    THEME_APP_EXTENSION_UID,
    THEME_APP_EXTENSION_HANDLE,
    "estimated-delivery-date",
    ...extra,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .filter((value, index, all) => all.indexOf(value) === index);
}

export function parseSettingsJson(raw) {
  const stripped = String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(stripped);
}

export function liveSettingsRoot(settings) {
  if (!settings || typeof settings !== "object") return null;
  const current = settings.current;
  if (current && typeof current === "object" && !Array.isArray(current)) return current;
  if (typeof current === "string") {
    settings.presets = settings.presets || {};
    if (!settings.presets[current] || typeof settings.presets[current] !== "object") {
      settings.presets[current] = {};
    }
    return settings.presets[current];
  }
  return null;
}

export function isOurAppEmbedType(type, identifiers = defaultEmbedIdentifiers()) {
  const value = String(type || "").toLowerCase();
  const marker = `/blocks/${APP_EMBED_HANDLE}/`;
  if (!value.includes(marker)) return false;

  const suffix = value.split(marker)[1]?.split(/[/?#]/)[0]?.trim() || "";
  const hints = (identifiers || []).map((hint) => String(hint || "").toLowerCase()).filter(Boolean);

  // Prefer matching the extension id / API key suffix Shopify puts in the type URL.
  if (suffix && hints.some((hint) => hint.length >= 8 && (suffix === hint || suffix.includes(hint)))) {
    return true;
  }

  // Fallback: app handle path segment for UUID-suffixed production types.
  const appPathHints = hints.filter((hint) => /[a-z]/.test(hint) && hint.includes("-"));
  return appPathHints.some((hint) => value.includes(`/apps/${hint}/`));
}

function isEnabledBlock(block) {
  if (!block || typeof block !== "object") return false;
  // Shopify sets disabled:false when On and disabled:true when Off.
  // Only treat an explicit false as Active - avoids stale/orphan blocks without a clear flag.
  return block.disabled === false || String(block.disabled).toLowerCase() === "false";
}

function blocksFrom(root) {
  const blocks = root?.blocks;
  if (!blocks || typeof blocks !== "object" || Array.isArray(blocks)) return [];
  return Object.entries(blocks).map(([id, block]) => ({ id, block }));
}

export function appEmbedBlockState(settingsContent, identifiers = defaultEmbedIdentifiers()) {
  try {
    const settings = parseSettingsJson(settingsContent);
    const live = liveSettingsRoot(settings);
    if (!live) return { exists: false, enabled: false };
    const ours = blocksFrom(live).filter(({ block }) => isOurAppEmbedType(block?.type, identifiers));
    if (!ours.length) return { exists: false, enabled: false };
    // Theme editor ON/OFF only applies to Shopify-managed block IDs.
    // Never treat the app-written helper id as Active by itself.
    const managed = ours.filter(({ id }) => id !== "edd-app-embed");
    if (!managed.length) {
      return { exists: true, enabled: false };
    }
    // Off wins: Active only when at least one managed block is explicitly enabled
    // and none of the managed blocks are explicitly disabled.
    const explicitlyOn = managed.filter(({ block }) => isEnabledBlock(block));
    const explicitlyOff = managed.filter(({ block }) => {
      const disabled = block?.disabled;
      return disabled === true || disabled === 1 || String(disabled).toLowerCase() === "true";
    });
    return {
      exists: true,
      enabled: explicitlyOn.length > 0 && explicitlyOff.length === 0,
    };
  } catch {
    return { exists: false, enabled: false };
  }
}

export function parseAppEmbedEnabled(settingsContent, identifiers = defaultEmbedIdentifiers()) {
  return appEmbedBlockState(settingsContent, identifiers).enabled;
}
