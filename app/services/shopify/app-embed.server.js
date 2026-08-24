import { unauthenticated, apiVersion } from "../../shopify.server";
import { APP_EMBED_HANDLE, appBlockEditorUrl, appEmbedEditorUrl } from "../../lib/theme-editor";

const CACHE_MS = 45_000;
const METAFIELD_SYNC_MS = 60_000;
const cache = new Map();
const embedPings = new Map();

const INSTALLATION_QUERY = `#graphql
  query DeliveryDateEmbedInstallation {
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

const THEME_SETTINGS_QUERY = `#graphql
  query DeliveryDateAppEmbedStatus {
    themes(first: 10, roles: [MAIN, DEVELOPMENT]) {
      nodes {
        id
        name
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

const PRODUCT_HANDLE_QUERY = `#graphql
  query DeliveryDatePreviewProduct {
    products(first: 1, query: "status:active") {
      nodes {
        handle
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

function graphqlApiVersion() {
  return String(apiVersion || "2026-07").replaceAll("_", "-").toLowerCase();
}

function staticIdentifiers() {
  return [
    process.env.SHOPIFY_API_KEY,
    process.env.SHOPIFY_DELIVERY_DATE_WIDGET_ID,
    "428f3d88064e44c926da9dbde635d831",
    "delivery-date-widget",
    "estimated-delivery-date",
    "estimated-delivery",
    "edd-theme-app-extension-001",
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

function buildIdentifiers(installation) {
  const app = installation?.app || {};
  return [...new Set(
    [...staticIdentifiers(), app.handle, app.apiKey]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase()),
  )];
}

function parseSettingsJson(raw) {
  const stripped = String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(stripped);
}

function collectTypedBlocks(node, found = []) {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    for (const item of node) collectTypedBlocks(item, found);
    return found;
  }
  if (typeof node.type === "string") found.push(node);
  for (const value of Object.values(node)) collectTypedBlocks(value, found);
  return found;
}

function isAppEmbedType(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("/blocks/app-embed")) return true;
  if (value.includes(`/${APP_EMBED_HANDLE}/`) || value.endsWith(`/${APP_EMBED_HANDLE}`)) return true;
  return value.includes("/blocks/") && value.includes("embed") && value.includes("delivery");
}

function isEnabledBlock(block) {
  return block?.disabled !== true && String(block?.disabled).toLowerCase() !== "true";
}

function isOurEnabledEmbed(block, identifiers) {
  const type = String(block?.type || "");
  if (!isAppEmbedType(type) || !isEnabledBlock(block)) return false;
  const lower = type.toLowerCase();
  return identifiers.some((hint) => hint && lower.includes(hint));
}

export function parseAppEmbedEnabled(settingsContent, identifiers = staticIdentifiers()) {
  try {
    const settings = parseSettingsJson(settingsContent);
    const blocks = collectTypedBlocks(settings);
    if (blocks.some((block) => isOurEnabledEmbed(block, identifiers))) return true;
    return blocks.some((block) => isAppEmbedType(block.type) && isEnabledBlock(block));
  } catch {
    return false;
  }
}

function remember(shop, result) {
  if (!shop) return result.enabled;
  const previous = cache.get(shop) || {};
  cache.set(shop, {
    ...previous,
    enabled: result.enabled,
    result,
    expires: Date.now() + CACHE_MS,
  });
  return result.enabled;
}

function themeNumericId(gid) {
  return String(gid || "").split("/").pop();
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

async function readThemeSettingsRest(session, themeGid) {
  if (!session?.accessToken || !session.shop || !themeGid) return "";
  const params = new URLSearchParams({ "asset[key]": "config/settings_data.json" });
  const url = `https://${session.shop}/admin/api/${graphqlApiVersion()}/themes/${themeNumericId(themeGid)}/assets.json?${params}`;
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": session.accessToken,
      Accept: "application/json",
    },
  });
  if (!response.ok) return "";
  const json = await response.json();
  return json.asset?.value || "";
}

async function settingsForTheme(theme, session) {
  const content = await readFileBody(theme?.files?.nodes?.[0]?.body);
  if (content) return content;
  return readThemeSettingsRest(session, theme?.id);
}

function hasThemeAccess(installation) {
  const scopes = (installation?.accessScopes || []).map((scope) => String(scope.handle || "").toLowerCase());
  return scopes.includes("read_themes") || scopes.includes("write_themes");
}

function recentEmbedPing(shop) {
  const at = embedPings.get(shop);
  return Boolean(at && Date.now() - at < 15 * 60 * 1000);
}

export function markAppEmbedPing(shop) {
  if (shop) embedPings.set(shop, Date.now());
}

export async function readAppEmbedEnabled(admin, session, shop) {
  const installationData = await graphqlData(admin, INSTALLATION_QUERY);
  const installation = installationData?.currentAppInstallation;
  const identifiers = buildIdentifiers(installation);
  const missingThemeAccess = !hasThemeAccess(installation);

  if (!missingThemeAccess) {
    try {
      const themeData = await graphqlData(admin, THEME_SETTINGS_QUERY);
      const themes = themeData?.themes?.nodes || [];
      const ordered = [
        ...themes.filter((theme) => theme.role === "MAIN"),
        ...themes.filter((theme) => theme.role !== "MAIN"),
      ];
      for (const theme of ordered) {
        const content = await settingsForTheme(theme, session);
        if (!content) continue;
        if (parseAppEmbedEnabled(content, identifiers)) {
          return {
            enabled: true,
            checked: true,
            missingThemeAccess: false,
            themeId: theme.id,
          };
        }
      }
      if (ordered.length) {
        return {
          enabled: false,
          checked: true,
          missingThemeAccess: false,
          themeId: ordered[0]?.id,
        };
      }
    } catch (error) {
      console.warn("[edd-app-embed] theme read failed", error?.message || error);
    }
  }

  if (recentEmbedPing(shop || session?.shop)) {
    return { enabled: true, checked: true, missingThemeAccess };
  }

  return { enabled: false, checked: !missingThemeAccess, missingThemeAccess };
}

export async function loadEditorLinks(admin, shop, themeId) {
  const cached = shop ? cache.get(shop) : null;
  if (cached?.links && cached.expires > Date.now()) {
    return cached.links;
  }
  let productHandle = "";
  try {
    const data = await graphqlData(admin, PRODUCT_HANDLE_QUERY);
    productHandle = data?.products?.nodes?.[0]?.handle || "";
  } catch {
    productHandle = "";
  }
  const options = { themeId, productHandle };
  const links = {
    themeEditorEmbed: appEmbedEditorUrl(shop, { ...options, activate: true }),
    themeEditorEmbedManage: appEmbedEditorUrl(shop, { ...options, activate: false }),
    themeEditorBlock: appBlockEditorUrl(shop, { ...options, activate: true }),
    themeEditorBlockManage: appBlockEditorUrl(shop, { ...options, activate: false }),
  };
  if (shop) {
    cache.set(shop, { ...(cached || {}), links, expires: cached?.expires || Date.now() + CACHE_MS });
  }
  return links;
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

export async function loadLiveAppEmbedStatus(admin, shop, session) {
  const cached = shop ? cache.get(shop) : null;
  if (cached?.result && cached.expires > Date.now()) {
    return cached.result;
  }

  try {
    const result = await readAppEmbedEnabled(admin, session, shop);
    if (result.checked) {
      remember(shop, result);
      const now = Date.now();
      const shouldSync = !cached?.metafieldAt || now - cached.metafieldAt > METAFIELD_SYNC_MS;
      if (shouldSync) {
        cache.set(shop, { ...cache.get(shop), metafieldAt: now });
        await syncAppEmbedMetafield(admin, result.enabled).catch(() => {});
      }
    }
    return result;
  } catch (error) {
    console.warn("[edd-app-embed] status failed", error?.message || error);
    return {
      enabled: cached?.enabled ?? recentEmbedPing(shop),
      checked: false,
      missingThemeAccess: true,
    };
  }
}

export async function isAppEmbedEnabledForShop(shop) {
  if (!shop) return false;
  if (recentEmbedPing(shop)) return true;
  const cached = cache.get(shop);
  if (cached && cached.expires > Date.now()) return cached.enabled;

  try {
    const { admin, session } = await unauthenticated.admin(shop);
    const result = await loadLiveAppEmbedStatus(admin, shop, session);
    if (result.missingThemeAccess) return true;
    return result.enabled;
  } catch {
    return cached?.enabled ?? true;
  }
}
