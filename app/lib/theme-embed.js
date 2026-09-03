import { APP_CART_BLOCK_HANDLE, APP_EMBED_HANDLE } from "./theme-editor";

export const THEME_APP_EXTENSION_UID = "edd-theme-app-extension-001";
export const THEME_APP_EXTENSION_HANDLE = "delivery-date-widget";

export function defaultEmbedIdentifiers(extra = []) {
  return [
    process.env.SHOPIFY_API_KEY,
    process.env.SHOPIFY_DELIVERY_DATE_WIDGET_ID,
    "428f3d88064e44c926da9dbde635d831",
    THEME_APP_EXTENSION_UID,
    THEME_APP_EXTENSION_HANDLE,
    "estimated-delivery-date",
    "estimated-delivery",
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
  if (!value.includes(`/blocks/${APP_EMBED_HANDLE}`)) return false;
  return identifiers.some((hint) => hint && value.includes(hint));
}

function isEnabledBlock(block) {
  return block?.disabled !== true && String(block?.disabled).toLowerCase() !== "true";
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
    // Shopify's theme editor toggle maps to the store-managed block, not our helper id.
    const managed = ours.filter(({ id }) => id !== "edd-app-embed");
    const target = managed.length ? managed : ours;
    return {
      exists: true,
      enabled: target.some(({ block }) => isEnabledBlock(block)),
    };
  } catch {
    return { exists: false, enabled: false };
  }
}

export function parseAppEmbedEnabled(settingsContent, identifiers = defaultEmbedIdentifiers()) {
  return appEmbedBlockState(settingsContent, identifiers).enabled;
}

export function discoverAppEmbedType(raw, identifiers = defaultEmbedIdentifiers()) {
  const matches = String(raw || "").match(/shopify:\/\/apps\/[^"'\\\s]+\/blocks\/app-embed\/[^"'\\\s]+/gi) || [];
  const unique = [...new Set(matches)];
  return unique.find((type) => isOurAppEmbedType(type, identifiers)) || "";
}

export function discoverAppEmbedBlockId(raw, type) {
  if (!raw || !type) return "";
  const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nearby = new RegExp(`"([^"]+)"\\s*:\\s*\\{[\\s\\S]{0,1200}${escaped}`, "i");
  return String(raw).match(nearby)?.[1] || "";
}

export function constructedAppEmbedType(app = {}) {
  return constructedBlockType(app, APP_EMBED_HANDLE);
}

export function constructedCartBlockType(app = {}) {
  return constructedBlockType(app, APP_CART_BLOCK_HANDLE);
}

function constructedBlockType(app = {}, blockHandle) {
  const appHandle =
    String(app.handle || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "estimated-delivery-date";
  const apiKey = app.apiKey || process.env.SHOPIFY_API_KEY || "428f3d88064e44c926da9dbde635d831";
  return `shopify://apps/${appHandle}/blocks/${blockHandle}/${apiKey}`;
}

function findOurEmbedBlock(root, identifiers) {
  return blocksFrom(root).find(({ block }) => isOurAppEmbedType(block?.type, identifiers));
}

export function upsertAppEmbedInSettings(settings, type, enabled, identifiers = defaultEmbedIdentifiers(), preferredId = "") {
  const next = structuredClone(settings);
  const live = liveSettingsRoot(next);
  if (!live) return next;
  live.blocks = live.blocks || {};

  const fromLive = findOurEmbedBlock(live, identifiers);
  let fromPreset = null;
  if (!fromLive) {
    for (const preset of Object.values(next.presets || {})) {
      fromPreset = findOurEmbedBlock(preset, identifiers);
      if (fromPreset) break;
    }
  }

  const blockId = fromLive?.id || fromPreset?.id || preferredId || "edd-app-embed";
  const previous = live.blocks[blockId] || fromPreset?.block || {};
  live.blocks[blockId] = {
    ...previous,
    type: previous.type || type,
    disabled: !enabled,
    settings: previous.settings || {},
  };
  return next;
}
