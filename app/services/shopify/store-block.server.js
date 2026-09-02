import { unauthenticated, apiVersion } from "../../shopify.server";
import prisma from "../../lib/prisma.server";
import { WIDGET_LOCATIONS, WIDGET_STATUSES } from "../../lib/constants";
import {
  constructedAppEmbedType,
  constructedCartBlockType,
  defaultEmbedIdentifiers,
  discoverAppEmbedBlockId,
  discoverAppEmbedType,
  parseSettingsJson,
  upsertAppEmbedInSettings,
} from "../../lib/theme-embed";
import { APP_CART_BLOCK_HANDLE } from "../../lib/theme-editor";
import { clearAppEmbedStatusCache } from "./app-embed.server";
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
  return parseSettingsJson(raw);
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

function embedIdentifiers(app) {
  return defaultEmbedIdentifiers([app?.handle, app?.apiKey]);
}

function appEmbedType(app, settingsRaw) {
  const identifiers = embedIdentifiers(app);
  return discoverAppEmbedType(settingsRaw, identifiers) || constructedAppEmbedType(app);
}

function isOurCartBlockType(type) {
  const value = String(type || "").toLowerCase();
  return value.includes(`/blocks/${APP_CART_BLOCK_HANDLE}`);
}

function discoverCartBlockType(raw, app) {
  const matches = String(raw || "").match(/shopify:\/\/apps\/[^"'\\\s]+\/blocks\/cart-estimated-delivery\/[^"'\\\s]+/gi) || [];
  return matches[0] || constructedCartBlockType(app);
}

function findCartPlacementSection(template) {
  const sections = template?.sections || {};
  const entries = Object.entries(sections);
  const byType = entries.find(([, section]) => /cart[-_]?footer/i.test(String(section?.type || "")));
  if (byType) return { id: byType[0], section: byType[1] };
  const byBlocks = entries.find(([, section]) => {
    const blocks = section?.blocks || {};
    return Object.values(blocks).some((block) => /subtotal|button/i.test(String(block?.type || "")));
  });
  if (byBlocks) return { id: byBlocks[0], section: byBlocks[1] };
  return null;
}

function stripCartWidgetBlocks(template) {
  const next = structuredClone(template);
  if (!next.sections) return { template: next, changed: false };
  let changed = false;
  const removeSectionIds = new Set();
  for (const [sectionId, section] of Object.entries(next.sections)) {
    if (sectionId === CART_APPS_SECTION) {
      removeSectionIds.add(sectionId);
      changed = true;
      continue;
    }
    const blocks = section?.blocks;
    if (!blocks) continue;
    for (const [blockId, block] of Object.entries(blocks)) {
      if (blockId === CART_BLOCK_ID || isOurCartBlockType(block?.type)) {
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

function upsertCartWidgetBlock(template, type, enabled) {
  if (!enabled) return stripCartWidgetBlocks(template);
  const placement = findCartPlacementSection(template);
  const current = placement?.section?.blocks?.[CART_BLOCK_ID];
  if (current && current.type === type && current.disabled !== true) {
    const order = placement.section.block_order;
    if (Array.isArray(order) && order.includes(CART_BLOCK_ID)) {
      return { template, changed: false };
    }
  }
  const stripped = stripCartWidgetBlocks(template);
  const next = stripped.template;
  next.sections = next.sections || {};
  const target = findCartPlacementSection(next);
  if (!target) return stripped;
  const section = target.section;
  section.blocks = section.blocks || {};
  section.block_order = Array.isArray(section.block_order) ? [...section.block_order] : Object.keys(section.blocks);
  section.blocks[CART_BLOCK_ID] = { type, disabled: false, settings: {} };
  if (!section.block_order.includes(CART_BLOCK_ID)) {
    const buttonsAt = section.block_order.findIndex((id) => /button/i.test(String(section.blocks[id]?.type || "")));
    if (buttonsAt >= 0) section.block_order.splice(buttonsAt, 0, CART_BLOCK_ID);
    else section.block_order.push(CART_BLOCK_ID);
  }
  next.sections[target.id] = section;
  return { template: next, changed: true };
}

function stripInjectedTemplateBlocks(template) {
  const next = structuredClone(template);
  if (!next.sections) return { template: next, changed: false };
  let changed = false;
  const removeSectionIds = new Set();
  for (const [sectionId, section] of Object.entries(next.sections)) {
    if (sectionId === PRODUCT_APPS_SECTION) {
      removeSectionIds.add(sectionId);
      changed = true;
      continue;
    }
    const blocks = section?.blocks;
    if (!blocks) continue;
    for (const blockId of Object.keys(blocks)) {
      if (blockId === PRODUCT_BLOCK_ID) {
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

async function cartBlockShouldBeOn(widget) {
  const isDefaultCart =
    widget.location === WIDGET_LOCATIONS.CART &&
    widget.status === WIDGET_STATUSES.ACTIVE &&
    widget.placementConfig?.position !== "CUSTOM";
  if (isDefaultCart) return true;
  if (!widget.merchantId) return false;
  const others = await prisma.widget.findMany({
    where: {
      merchantId: widget.merchantId,
      status: WIDGET_STATUSES.ACTIVE,
      location: WIDGET_LOCATIONS.CART,
      ...(widget.id ? { id: { not: widget.id } } : {}),
    },
  });
  return others.some((item) => item.placementConfig?.position !== "CUSTOM");
}

async function syncAppEmbedAndCleanup(admin, session, enabled, cartEnabled = false) {
  const themesData = await graphqlJson(admin, THEMES_QUERY);
  const themes = themesData?.themes?.nodes || [];
  if (!themes.length) return;

  const installation = await graphqlJson(admin, INSTALLATION_QUERY);
  const app = installation?.currentAppInstallation?.app || {};
  const identifiers = embedIdentifiers(app);
  const ordered = [
    ...themes.filter((theme) => theme.role === "MAIN"),
    ...themes.filter((theme) => theme.role !== "MAIN"),
  ];

  for (const theme of ordered) {
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
        const type = appEmbedType(app, settingsRaw);
        const preferredId = discoverAppEmbedBlockId(settingsRaw, type);
        const nextSettings = upsertAppEmbedInSettings(settings, type, enabled, identifiers, preferredId);
        await writeThemeFile(session, theme.id, "config/settings_data.json", `${JSON.stringify(nextSettings, null, 2)}\n`);
      }

      const productRaw = await byName("templates/product.json");
      if (productRaw) {
        const { template, changed } = stripInjectedTemplateBlocks(parseThemeJson(productRaw));
        if (changed) {
          await writeThemeFile(session, theme.id, "templates/product.json", `${JSON.stringify(template, null, 2)}\n`);
        }
      }

      const cartRaw = await byName("templates/cart.json");
      if (cartRaw) {
        const parsed = parseThemeJson(cartRaw);
        const type = discoverCartBlockType(cartRaw, app);
        const { template, changed } = upsertCartWidgetBlock(parsed, type, cartEnabled);
        if (changed) {
          await writeThemeFile(session, theme.id, "templates/cart.json", `${JSON.stringify(template, null, 2)}\n`);
        }
      }
    } catch (error) {
      console.warn("[edd-store-block] embed sync failed", theme.id, error?.message || error);
    }
  }

  if (session?.shop) clearAppEmbedStatusCache(session.shop);
}

export async function syncWidgetStorefront(admin, session, widget) {
  if (!admin || !widget) return;
  try {
    if (widget.location === WIDGET_LOCATIONS.CHECKOUT) {
      await syncCheckoutMetafield(admin, widget);
      return;
    }
    const enabled = await productOrCartEmbedShouldBeOn(widget);
    const cartEnabled = await cartBlockShouldBeOn(widget);
    await syncAppEmbedAndCleanup(admin, session, enabled, cartEnabled);
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
