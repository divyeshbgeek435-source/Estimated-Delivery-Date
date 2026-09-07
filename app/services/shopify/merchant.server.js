import prisma from "../../lib/prisma.server";
import { resolveTimeZone } from "../../lib/timezone";
import { normalizeIconLibrary } from "../../lib/icon-media";

const SHOP_TIMEZONE_QUERY = `#graphql
  query DeliveryDateShopTimezone {
    shop {
      ianaTimezone
    }
  }
`;

const SHOP_PROFILE_QUERY = `#graphql
  query DeliveryDateMerchantProfile {
    shop {
      email
      contactEmail
      ianaTimezone
      shopOwnerName
    }
  }
`;

export async function fetchShopIanaTimezone(admin) {
  if (!admin?.graphql) return "";
  try {
    const response = await admin.graphql(SHOP_TIMEZONE_QUERY);
    const json = await response.json();
    return String(json.data?.shop?.ianaTimezone || "").trim();
  } catch {
    return "";
  }
}

export async function shopTimezoneForMerchant(admin, merchant) {
  const fromShop = await fetchShopIanaTimezone(admin);
  const resolved = resolveTimeZone(fromShop || merchant?.timezone);
  if (merchant?.id && merchant.timezone !== resolved) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { timezone: resolved },
    });
  }
  return resolved;
}

export async function ensureMerchant(shopDomain) {
  const canonical = shopDomainVariants(shopDomain)[0] || String(shopDomain || "").trim();
  const existing = await findMerchantRecord(canonical);
  if (existing) {
    if (existing.uninstalledAt) {
      return prisma.merchant.update({
        where: { id: existing.id },
        data: { uninstalledAt: null },
      });
    }
    return existing;
  }
  return prisma.merchant.upsert({
    where: { shopDomain: canonical },
    update: { uninstalledAt: null },
    create: { shopDomain: canonical },
  });
}

export function shopDomainVariants(shopDomain) {
  const raw = String(shopDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  if (!raw) return [];
  const full = raw.includes(".") ? raw : `${raw}.myshopify.com`;
  const handle = full.replace(/\.myshopify\.com$/i, "");
  return [...new Set([full, raw, handle, `${handle}.myshopify.com`, String(shopDomain || "").trim()].filter(Boolean))];
}

async function findMerchantRecord(shopDomain) {
  const variants = shopDomainVariants(shopDomain);
  if (!variants.length) return null;
  return prisma.merchant.findFirst({
    where: { shopDomain: { in: variants } },
  });
}

export async function findMerchantByShopDomain(shopDomain) {
  const merchant = await findMerchantRecord(shopDomain);
  if (!merchant || merchant.uninstalledAt) return null;
  return merchant;
}

const MERCHANT_CACHE_MS = 20_000;
const merchantCache = new Map();

export async function getMerchantByShop(shopDomain) {
  const key = String(shopDomain || "").trim().toLowerCase();
  const cached = merchantCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.merchant;

  const existing = await findMerchantByShopDomain(shopDomain);
  const merchant = existing || (await ensureMerchant(shopDomain));
  if (key && merchant) {
    merchantCache.set(key, { merchant, expires: Date.now() + MERCHANT_CACHE_MS });
  }
  return merchant;
}

export async function saveMerchantIconLibrary(merchantId, library) {
  if (!merchantId) return null;
  const iconLibrary = normalizeIconLibrary(library);
  const updated = await prisma.merchant.update({
    where: { id: merchantId },
    data: { iconLibrary },
  });
  clearMerchantCache(updated.shopDomain);
  return iconLibrary;
}

export async function markMerchantUninstalled(shopDomain) {
  clearMerchantCache(shopDomain);
  await prisma.merchant.updateMany({
    where: { shopDomain },
    data: { uninstalledAt: new Date() },
  });
}

export async function deleteMerchantData(shopDomain) {
  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain },
    select: { id: true },
  });

  if (!merchant) return;

  const cleanup = [
    prisma.widgetEvent.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.deliveryRequest?.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.widget.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.session.deleteMany({ where: { shop: shopDomain } }),
    prisma.merchant.delete({ where: { id: merchant.id } }),
  ].filter(Boolean);
  await prisma.$transaction(cleanup);
}

function clearMerchantCache(shopDomain) {
  for (const key of shopDomainVariants(shopDomain)) {
    merchantCache.delete(key.toLowerCase());
  }
}

function text(value) {
  const next = String(value ?? "").trim();
  return next || null;
}

function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: null, lastName: null };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || null,
  };
}

function toUserId(value) {
  if (value == null || value === "") return null;
  const raw = String(value).replace(/^gid:\/\/shopify\/(?:StaffMember|User)\//i, "");
  return raw || null;
}

function toSessionUserId(value) {
  const raw = toUserId(value);
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}

export function profileFromSession(session) {
  if (!session) return {};
  const user = session.onlineAccessInfo?.associated_user || session.onlineAccessInfo?.associatedUser || {};
  const profile = {
    email: text(session.email || user.email),
    firstName: text(session.firstName || user.first_name || user.firstName),
    lastName: text(session.lastName || user.last_name || user.lastName),
    userId: toUserId(session.userId ?? user.id),
    locale: text(session.locale || user.locale),
  };
  if (session.isOnline || user.email || user.id) {
    if (session.accountOwner != null || user.account_owner != null || user.accountOwner != null) {
      profile.accountOwner = Boolean(session.accountOwner ?? user.account_owner ?? user.accountOwner);
    }
    if (session.collaborator != null || user.collaborator != null) {
      profile.collaborator = Boolean(session.collaborator ?? user.collaborator);
    }
    if (session.emailVerified != null || user.email_verified != null || user.emailVerified != null) {
      profile.emailVerified = Boolean(session.emailVerified ?? user.email_verified ?? user.emailVerified);
    }
  }
  return Object.fromEntries(Object.entries(profile).filter(([, value]) => value != null && value !== ""));
}

export function profileFromSessionToken(sessionToken) {
  if (!sessionToken?.sub) return {};
  return { userId: toUserId(sessionToken.sub) };
}

export function profileFromShopUpdate(payload = {}) {
  if (!payload || !Object.keys(payload).length) return {};
  const shopOwnerName = text(payload.shop_owner || payload.shopOwner);
  const names = splitName(shopOwnerName);
  return {
    email: text(payload.email || payload.customer_email || payload.customerEmail),
    contactEmail: text(payload.customer_email || payload.customerEmail || payload.email),
    shopOwnerName,
    firstName: names.firstName,
    lastName: names.lastName,
    locale: text(payload.primary_locale || payload.primaryLocale),
    timezone: text(payload.iana_timezone || payload.ianaTimezone),
  };
}

function profileValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  return value;
}

function merchantProfileData(profile) {
  const data = {
    email: profileValue(profile.email),
    firstName: profileValue(profile.firstName),
    lastName: profileValue(profile.lastName),
    userId: profileValue(profile.userId),
    locale: profileValue(profile.locale),
    shopOwnerName: profileValue(profile.shopOwnerName),
    contactEmail: profileValue(profile.contactEmail || profile.email),
    accountOwner: typeof profile.accountOwner === "boolean" ? profile.accountOwner : null,
    collaborator: typeof profile.collaborator === "boolean" ? profile.collaborator : null,
    emailVerified: typeof profile.emailVerified === "boolean" ? profile.emailVerified : null,
    profileSyncedAt: new Date(),
  };
  if (profile.timezone) data.timezone = resolveTimeZone(profile.timezone);
  return data;
}

function hasIdentity(profile) {
  return Boolean(profile?.email || profile?.firstName || profile?.lastName || profile?.userId || profile?.shopOwnerName);
}

function profileUnchanged(merchant, data) {
  return (
    merchant?.email === data.email &&
    merchant?.firstName === data.firstName &&
    merchant?.lastName === data.lastName &&
    merchant?.accountOwner === data.accountOwner &&
    merchant?.userId === data.userId &&
    merchant?.locale === data.locale &&
    merchant?.collaborator === data.collaborator &&
    merchant?.emailVerified === data.emailVerified &&
    merchant?.shopOwnerName === data.shopOwnerName &&
    merchant?.contactEmail === data.contactEmail &&
    (!data.timezone || merchant?.timezone === data.timezone)
  );
}

function mergeShopIdentity(current = {}, incoming = {}) {
  const next = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    next[key] = value;
  }
  if (!next.firstName && !next.lastName && next.shopOwnerName) {
    Object.assign(next, splitName(next.shopOwnerName));
  }
  return next;
}

function sessionIdentityData(profile) {
  const data = {
    email: profile.email || null,
    firstName: profile.firstName || null,
    lastName: profile.lastName || null,
    locale: profile.locale || null,
  };
  if (typeof profile.accountOwner === "boolean") data.accountOwner = profile.accountOwner;
  if (typeof profile.collaborator === "boolean") data.collaborator = profile.collaborator;
  if (typeof profile.emailVerified === "boolean") data.emailVerified = profile.emailVerified;
  const userId = toSessionUserId(profile.userId);
  if (userId !== undefined) data.userId = userId;
  return data;
}

async function applyIdentityToSessions(shopDomain, profile) {
  if (!hasIdentity(profile)) return;
  const shops = shopDomainVariants(shopDomain);
  if (!shops.length) return;
  await prisma.session.updateMany({
    where: { shop: { in: shops } },
    data: sessionIdentityData(profile),
  });
}

async function saveMerchantProfile(merchant, incoming) {
  if (!merchant?.id) return merchant;
  const merged = mergeShopIdentity(merchant, incoming);
  const data = merchantProfileData(merged);
  if (profileUnchanged(merchant, data) && merchant.profileSyncedAt) {
    await applyIdentityToSessions(merchant.shopDomain, merged);
    return merchant;
  }
  try {
    const updated = await prisma.merchant.update({
      where: { id: merchant.id },
      data,
    });
    clearMerchantCache(merchant.shopDomain);
    await applyIdentityToSessions(merchant.shopDomain, merged);
    return updated;
  } catch (error) {
    console.error("saveMerchantProfile failed", error);
    await applyIdentityToSessions(merchant.shopDomain, merged);
    return merchant;
  }
}

function shopToProfile(shop) {
  if (!shop) return {};
  const shopOwnerName = text(shop.shopOwnerName);
  const names = splitName(shopOwnerName);
  return {
    email: text(shop.email || shop.contactEmail),
    contactEmail: text(shop.contactEmail || shop.email),
    timezone: text(shop.ianaTimezone),
    shopOwnerName,
    firstName: names.firstName,
    lastName: names.lastName,
  };
}

async function fetchShopProfile(admin) {
  if (!admin?.graphql) return {};
  const queries = [
    SHOP_PROFILE_QUERY,
    `#graphql
      query DeliveryDateMerchantProfileFallback {
        shop {
          email
          contactEmail
          ianaTimezone
        }
      }
    `,
  ];
  for (const query of queries) {
    try {
      const response = await admin.graphql(query);
      const json = await response.json();
      if (json.errors?.length || !json.data?.shop) continue;
      return shopToProfile(json.data.shop);
    } catch {
      continue;
    }
  }
  return {};
}

export async function persistSessionIdentity(session) {
  if (!session?.shop) return null;
  const merchant = await ensureMerchant(session.shop);
  const fromSession = profileFromSession(session);
  if (hasIdentity(fromSession)) {
    return saveMerchantProfile(merchant, fromSession);
  }
  if (hasIdentity(merchant)) {
    await applyIdentityToSessions(session.shop, merchant);
  }
  return merchant;
}

const syncInFlight = new Map();

export async function syncMerchantProfile({ admin, session, sessionToken, merchant, payload } = {}) {
  const shopDomain = session?.shop || merchant?.shopDomain;
  if (!shopDomain) return merchant || null;

  const pending = syncInFlight.get(shopDomain);
  if (pending) return pending;

  const task = (async () => {
    const current = merchant?.id ? merchant : await ensureMerchant(shopDomain);
    const incoming = mergeShopIdentity(
      mergeShopIdentity(profileFromShopUpdate(payload), await fetchShopProfile(admin)),
      mergeShopIdentity(profileFromSession(session), profileFromSessionToken(sessionToken)),
    );
    return saveMerchantProfile(current, incoming);
  })().finally(() => {
    syncInFlight.delete(shopDomain);
  });

  syncInFlight.set(shopDomain, task);
  return task;
}
