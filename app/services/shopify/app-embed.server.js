import { unauthenticated } from "../../shopify.server";
import { appBlockEditorUrl, appEmbedEditorUrl } from "../../lib/theme-editor";
import { defaultEmbedIdentifiers, parseAppEmbedEnabled } from "../../lib/theme-embed";

export { parseAppEmbedEnabled };

const CACHE_MS = 30_000;
const METAFIELD_SYNC_MS = 60_000;
const cache = new Map();
const embedPings = new Map();
const inflight = new Map();

const INSTALLATION_QUERY = `#graphql
  query DeliveryDateAppEmbedInstallation {
    currentAppInstallation {
      accessScopes {
        handle
      }
      app {
        handle
        apiKey
      }
    }
  }
`;

const THEME_EMBED_QUERY = `#graphql
  query DeliveryDateAppEmbedTheme {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
        role
        files(filenames: ["config/settings_data.json"], first: 1) {
          nodes {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
              ... on OnlineStoreThemeFileBodyUrl {
                url
              }
            }
          }
        }
      }
    }
  }
`;

const SHOP_ID_QUERY = `#graphql
  query DeliveryDateEmbedShopId {
    shop {
      id
    }
  }
`;

const METAFIELDS_SET_MUTATION = `#graphql
  mutation DeliveryDateEmbedMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors {
        field
        message
      }
    }
  }
`;

function staticIdentifiers() {
  return defaultEmbedIdentifiers();
}

function buildIdentifiers(installation) {
  const app = installation?.app || {};
  return [...new Set(
    [...staticIdentifiers(), app.handle, app.apiKey]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase()),
  )];
}

function remember(shop, result, ttl = CACHE_MS) {
  if (!shop) return result.enabled;
  const previous = cache.get(shop) || {};
  cache.set(shop, {
    ...previous,
    enabled: result.enabled,
    result,
    expires: Date.now() + ttl,
  });
  return result.enabled;
}

async function graphqlData(admin, query) {
  const response = await admin.graphql(query);
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  return payload.data;
}

async function readFileBody(body) {
  if (body?.content) return body.content;
  if (body?.url) {
    const response = await fetch(body.url);
    if (response.ok) return response.text();
  }
  return "";
}

async function settingsForTheme(theme) {
  return readFileBody(theme?.files?.nodes?.[0]?.body);
}

function hasThemeAccess(installation) {
  const scopes = (installation?.accessScopes || []).map((scope) => String(scope.handle || "").toLowerCase());
  return scopes.includes("read_themes") || scopes.includes("write_themes");
}

function sessionHasThemeAccess(session) {
  const scopes = String(session?.scope || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  return scopes.includes("read_themes") || scopes.includes("write_themes");
}

function recentEmbedPing(shop) {
  const at = embedPings.get(shop);
  return Boolean(at && Date.now() - at < 15 * 60 * 1000);
}

export function markAppEmbedPing(shop) {
  if (shop) embedPings.set(shop, Date.now());
}

export function clearAppEmbedStatusCache(shop) {
  if (shop) cache.delete(shop);
  else cache.clear();
}

export function editorLinksForShop(shop, themeId) {
  const options = { themeId };
  return {
    themeEditorEmbed: appEmbedEditorUrl(shop, { ...options, activate: true }),
    themeEditorEmbedManage: appEmbedEditorUrl(shop, { ...options, activate: false }),
    themeEditorBlock: appBlockEditorUrl(shop, { ...options, activate: true }),
    themeEditorBlockManage: appBlockEditorUrl(shop, { ...options, activate: false }),
  };
}

export function buildEmbedStatusPayload(shop, result) {
  return {
    appEmbedEnabled: result.checked ? Boolean(result.enabled) : null,
    missingThemeAccess: Boolean(result.missingThemeAccess),
    checked: Boolean(result.checked),
    ...editorLinksForShop(shop, result?.themeId),
  };
}

export async function loadEditorLinks(admin, shop, themeId) {
  return editorLinksForShop(shop, themeId);
}

async function readThemeEmbedStatus(admin, identifiers) {
  const themeData = await graphqlData(admin, THEME_EMBED_QUERY);
  const main = themeData?.themes?.nodes?.[0];
  if (!main) {
    return { enabled: false, checked: true, missingThemeAccess: false, themeId: null };
  }
  const content = await settingsForTheme(main);
  return {
    enabled: Boolean(content) && parseAppEmbedEnabled(content, identifiers),
    checked: Boolean(content),
    missingThemeAccess: false,
    themeId: main.id,
  };
}

export async function readAppEmbedEnabled(admin, session, shop, { fresh = false } = {}) {
  // Prefer session scopes to skip an extra Admin API round-trip on the hot path.
  if (sessionHasThemeAccess(session)) {
    try {
      return await readThemeEmbedStatus(admin, staticIdentifiers());
    } catch (error) {
      console.warn("[edd-app-embed] theme read failed", error?.message || error);
      return {
        enabled: null,
        checked: false,
        missingThemeAccess: /access|scope|denied/i.test(String(error?.message || "")),
        themeId: null,
      };
    }
  }

  const installationData = await graphqlData(admin, INSTALLATION_QUERY);
  const installation = installationData?.currentAppInstallation;
  const identifiers = buildIdentifiers(installation);
  const missingThemeAccess = !hasThemeAccess(installation);

  if (missingThemeAccess) {
    return {
      enabled: null,
      checked: false,
      missingThemeAccess: true,
      themeId: null,
    };
  }

  try {
    return await readThemeEmbedStatus(admin, identifiers);
  } catch (error) {
    console.warn("[edd-app-embed] theme read failed", error?.message || error);
    return {
      enabled: null,
      checked: false,
      missingThemeAccess: /access|scope|denied/i.test(String(error?.message || "")),
      themeId: null,
    };
  }
}

export async function syncAppEmbedMetafield(admin, enabled) {
  const shopData = await graphqlData(admin, SHOP_ID_QUERY);
  const ownerId = shopData?.shop?.id;
  if (!ownerId) return;

  await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [
        {
          namespace: "$app",
          key: "embed_enabled",
          type: "boolean",
          ownerId,
          value: enabled ? "true" : "false",
        },
      ],
    },
  });
}

export async function loadLiveAppEmbedStatus(admin, shop, session, { fresh = false } = {}) {
  const cached = shop ? cache.get(shop) : null;
  if (!fresh && cached?.result && cached.expires > Date.now()) {
    return cached.result;
  }

  const key = `${shop || "_"}:${fresh ? "fresh" : "cached"}`;
  if (inflight.has(key)) return inflight.get(key);

  const work = (async () => {
    try {
      const result = await readAppEmbedEnabled(admin, session, shop, { fresh });
      if (result.checked) {
        remember(shop, result, fresh ? 8_000 : CACHE_MS);
        const now = Date.now();
        const latest = cache.get(shop);
        const shouldSync = !latest?.metafieldAt || now - latest.metafieldAt > METAFIELD_SYNC_MS;
        if (shouldSync && typeof result.enabled === "boolean") {
          cache.set(shop, { ...cache.get(shop), metafieldAt: now });
          syncAppEmbedMetafield(admin, result.enabled).catch(() => {});
        }
      }
      return result;
    } catch (error) {
      console.warn("[edd-app-embed] status failed", error?.message || error);
      return {
        enabled: cached?.result?.enabled ?? null,
        checked: false,
        missingThemeAccess: true,
        themeId: cached?.result?.themeId || null,
      };
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, work);
  return work;
}

export async function isAppEmbedEnabledForShop(shop) {
  if (!shop) return false;
  if (recentEmbedPing(shop)) return true;
  const cached = cache.get(shop);
  if (cached && cached.expires > Date.now()) return Boolean(cached.enabled);

  try {
    const { admin, session } = await unauthenticated.admin(shop);
    const result = await loadLiveAppEmbedStatus(admin, shop, session);
    if (result.missingThemeAccess || result.enabled == null) return recentEmbedPing(shop);
    return Boolean(result.enabled);
  } catch {
    return Boolean(cached?.enabled) || recentEmbedPing(shop);
  }
}
