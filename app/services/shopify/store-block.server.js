import { unauthenticated, apiVersion } from "../../shopify.server";
import prisma from "../../lib/prisma.server";
import { WIDGET_LOCATIONS, WIDGET_STATUSES } from "../../lib/constants";
import { APP_EMBED_HANDLE } from "../../lib/theme-editor";
import { syncCheckoutMetafield } from "./metafields.server";

const PRODUCT_BLOCK_ID = "edd-product-widget";
const CART_BLOCK_ID = "edd-cart-widget";
const PRODUCT_APPS_SECTION = "edd-product-apps";
const CART_APPS_SECTION = "edd-cart-apps";

const THEMES_QUERY = `#graphql
  query DeliveryDateStoreBlockThemes {
    themes(first: 10, roles: [MAIN, DEVELOPMENT]) {
      nodes {
        id
        role
      }
    }
  }
`;

const THEME_FILE_QUERY = `#graphql
  query DeliveryDateStoreBlockFile($themeId: ID!, $filenames: [String!]!) {
    theme(id: $themeId) {
      files(filenames: $filenames, first: 10) {
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
`;

const INSTALLATION_QUERY = `#graphql
  query DeliveryDateStoreBlockApp {
    currentAppInstallation {
      app {
        handle
        apiKey
      }
    }
  }
`;

function graphqlApiVersion() {
  return String(apiVersion || "2026-07").replaceAll("_", "-").toLowerCase();
}

function themeNumericId(gid) {
  return String(gid || "").split("/").pop();
}

function parseThemeJson(raw) {
  const stripped = String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(stripped);
}

function slugifyHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function graphqlJson(admin, query, variables) {
  const response = await admin.graphql(query, variables ? { variables } : undefined);
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

async function readThemeFileRest(session, themeGid, filename) {
  if (!session?.accessToken || !session.shop || !themeGid) return "";
  const params = new URLSearchParams({ "asset[key]": filename });
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

async function writeThemeFileRest(session, themeGid, filename, value) {
  if (!session?.accessToken || !session.shop || !themeGid) return false;
  const url = `https://${session.shop}/admin/api/${graphqlApiVersion()}/themes/${themeNumericId(themeGid)}/assets.json`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "X-Shopify-Access-Token": session.accessToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ asset: { key: filename, value } }),
  });
  return response.ok;
}

async function writeThemeFile(session, themeId, filename, value) {
  const ok = await writeThemeFileRest(session, themeId, filename, value);
  if (!ok) {
    console.warn("[edd-store-block] theme asset write failed", filename);
  }
  return ok;
}

function discoverType(raw, handle) {
  const needle = `/blocks/${String(handle).toLowerCase()}`;
  const match = String(raw || "").match(new RegExp(`shopify://apps/[^"'\\s]+${needle}/[^"'\\s]+`, "i"));
  return match?.[0] || "";
}

function appBlockType(app, handle, discoveredType) {
  if (discoveredType) return discoveredType;
  const appHandle = slugifyHandle(app?.handle) || "estimated-delivery-date";
  const apiKey = app?.apiKey || process.env.SHOPIFY_API_KEY || "428f3d88064e44c926da9dbde635d831";
  return `shopify://apps/${appHandle}/blocks/${handle}/${apiKey}`;
}

function upsertEmbedInSettings(settings, type, enabled) {
  const next = structuredClone(settings);
  const current = next.current;
  if (!current || typeof current !== "object" || Array.isArray(current)) return next;
  current.blocks = current.blocks || {};
  const existingId = Object.keys(current.blocks).find((id) =>
    String(current.blocks[id]?.type || "").toLowerCase().includes("/blocks/app-embed"),
  );
  const blockId = existingId || "edd-app-embed";
  current.blocks[blockId] = {
    ...(current.blocks[blockId] || {}),
    type: current.blocks[blockId]?.type || type,
    disabled: !enabled,
    settings: current.blocks[blockId]?.settings || {},
  };
  return next;
}

function stripInjectedTemplateBlocks(template) {
  const next = structuredClone(template);
  if (!next.sections) return { template: next, changed: false };
  let changed = false;
  const removeSectionIds = new Set();
  for (const [sectionId, section] of Object.entries(next.sections)) {
    if (sectionId === PRODUCT_APPS_SECTION || sectionId === CART_APPS_SECTION) {
      removeSectionIds.add(sectionId);
      changed = true;
      continue;
    }
    const blocks = section?.blocks;
    if (!blocks) continue;
    for (const blockId of Object.keys(blocks)) {
      if (blockId === PRODUCT_BLOCK_ID || blockId === CART_BLOCK_ID) {
        delete blocks[blockId];
        if (Array.isArray(section.block_order)) {
          section.block_order = section.block_order.filter((id) => id !== blockId);
        }
        changed = true;
      }
    }
  }
  for (const sectionId of removeSectionIds) {
    delete next.sections[sectionId];
  }
  if (Array.isArray(next.order) && removeSectionIds.size) {
    next.order = next.order.filter((id) => !removeSectionIds.has(id));
  }
  return { template: next, changed };
}

async function productOrCartEmbedShouldBeOn(widget) {
  if (
    widget.status === WIDGET_STATUSES.ACTIVE &&
    (widget.location === WIDGET_LOCATIONS.PRODUCT || widget.location === WIDGET_LOCATIONS.CART)
  ) {
    return true;
  }
  if (!widget.merchantId) return false;
  const count = await prisma.widget.count({
    where: {
      merchantId: widget.merchantId,
      status: WIDGET_STATUSES.ACTIVE,
      location: { in: [WIDGET_LOCATIONS.PRODUCT, WIDGET_LOCATIONS.CART] },
      ...(widget.id ? { id: { not: widget.id } } : {}),
    },
  });
  return count > 0;
}

async function syncAppEmbedAndCleanup(admin, session, enabled) {
  const themesData = await graphqlJson(admin, THEMES_QUERY);
  const themes = themesData?.themes?.nodes || [];
  if (!themes.length) return;

  const installation = await graphqlJson(admin, INSTALLATION_QUERY);
  const app = installation?.currentAppInstallation?.app || {};

  for (const theme of themes) {
    try {
      const fileData = await graphqlJson(admin, THEME_FILE_QUERY, {
        themeId: theme.id,
        filenames: ["config/settings_data.json", "templates/product.json", "templates/cart.json"],
      });
      const nodes = fileData?.theme?.files?.nodes || [];
      const byName = async (name) => {
        const node = nodes.find((item) => item.filename === name);
        return (await readFileBody(node?.body)) || (await readThemeFileRest(session, theme.id, name));
      };

      const settingsRaw = await byName("config/settings_data.json");
      if (settingsRaw) {
        const settings = parseThemeJson(settingsRaw);
        const type = appBlockType(app, APP_EMBED_HANDLE, discoverType(settingsRaw, APP_EMBED_HANDLE));
        const nextSettings = upsertEmbedInSettings(settings, type, enabled);
        await writeThemeFile(session, theme.id, "config/settings_data.json", `${JSON.stringify(nextSettings, null, 2)}\n`);
      }

      for (const filename of ["templates/product.json", "templates/cart.json"]) {
        const raw = await byName(filename);
        if (!raw) continue;
        const { template, changed } = stripInjectedTemplateBlocks(parseThemeJson(raw));
        if (changed) {
          await writeThemeFile(session, theme.id, filename, `${JSON.stringify(template, null, 2)}\n`);
        }
      }
    } catch (error) {
      console.warn("[edd-store-block] embed sync failed", theme.id, error?.message || error);
    }
  }
}

export async function syncWidgetStorefront(admin, session, widget) {
  if (!admin || !widget) return;
  try {
    if (widget.location === WIDGET_LOCATIONS.CHECKOUT) {
      await syncCheckoutMetafield(admin, widget);
      return;
    }
    const enabled = await productOrCartEmbedShouldBeOn(widget);
    await syncAppEmbedAndCleanup(admin, session, enabled);
  } catch (error) {
    console.warn("[edd-store-block] sync failed", error?.message || error);
  }
}

export async function syncWidgetStorefrontByShop(shop, widget) {
  if (!shop || !widget) return;
  try {
    const { admin, session } = await unauthenticated.admin(shop);
    await syncWidgetStorefront(admin, session, widget);
  } catch (error) {
    console.warn("[edd-store-block] shop sync failed", error?.message || error);
  }
}
