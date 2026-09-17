import prisma from "../../lib/prisma.server";
import {
  DEFAULT_CART,
  DEFAULT_CHECKOUT,
  DEFAULT_ICONS,
  DEFAULT_MESSAGE,
  DEFAULT_PINCODE_RULES,
  DEFAULT_PLACEMENT,
  DEFAULT_SHIPPING,
  DEFAULT_STYLE,
  DEFAULT_WEIGHT_RULES,
  defaultPosition,
  defaultWidgetName,
  WIDGET_LOCATIONS,
  WIDGET_STATUSES,
} from "../../lib/constants";
import { clampToBounds, SHIPPING_DAY_LIMITS } from "../../lib/number-input";
import { normalizePincodeRules, normalizeWeightRules, toCountryRules } from "../../lib/pincode";
import { expandPincodeRulesForCheck } from "../../lib/pincode.server";
import { syncedPlacementIds } from "../../lib/form.server";
import { normalizePosition } from "../../lib/widget-profiles";
import { resolveTimeZone } from "../../lib/timezone";
import { normalizeIconLibrary } from "../../lib/icon-media";
import {
  ACTIVATION_CONFLICT_KEY,
  describePlacement,
  findLivePlacementConflicts,
  supportsLiveConflict,
  widgetApplyToLabel,
} from "../../lib/widget-conflicts";
import { DESIGN_KEY, resolveDesignTemplate } from "../../lib/widget-design";
import { findMerchantByShopDomain } from "../shopify/merchant.server";
import { syncWidgetStorefrontByShop } from "../shopify/store-block.server";

function compact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null));
}

function clampShippingDayFields(shipping = {}) {
  return {
    processingMinDays: clampToBounds(
      shipping.processingMinDays,
      SHIPPING_DAY_LIMITS.processingMin,
      DEFAULT_SHIPPING.processingMinDays,
    ),
    processingMaxDays: clampToBounds(
      shipping.processingMaxDays,
      SHIPPING_DAY_LIMITS.processingMax,
      DEFAULT_SHIPPING.processingMaxDays,
    ),
    transitMinDays: clampToBounds(
      shipping.transitMinDays,
      SHIPPING_DAY_LIMITS.transitMin,
      DEFAULT_SHIPPING.transitMinDays,
    ),
    transitMaxDays: clampToBounds(
      shipping.transitMaxDays,
      SHIPPING_DAY_LIMITS.transitMax,
      DEFAULT_SHIPPING.transitMaxDays,
    ),
  };
}

function embedSet(value) {
  return { set: value };
}

function definedFields(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

async function replaceWidgetFields(widgetId, fields, { reload = true } = {}) {
  const $set = definedFields(fields);
  $set.updatedAt = { $date: new Date().toISOString() };
  await prisma.$runCommandRaw({
    update: "Widget",
    updates: [
      {
        q: { _id: { $oid: String(widgetId) } },
        u: { $set },
      },
    ],
  });
  if (!reload) return { id: widgetId };
  return prisma.widget.findUnique({ where: { id: widgetId } });
}

const PUBLISH_AT_KEY = "__publishAt";
const LIVE_NOTICE_KEY = "__liveNotice";

function prismaMessageData(message) {
  const source = message && typeof message === "object" ? message : {};
  const merged = { ...DEFAULT_MESSAGE, ...source };
  const translations = { ...(merged.translations || {}) };
  const preservedConflict =
    merged.activationConflict === undefined ? translations[ACTIVATION_CONFLICT_KEY] : null;
  const designTemplate = resolveDesignTemplate(merged);
  delete translations[DESIGN_KEY];
  delete translations[PUBLISH_AT_KEY];
  delete translations[LIVE_NOTICE_KEY];
  delete translations[ACTIVATION_CONFLICT_KEY];
  translations[DESIGN_KEY] = designTemplate;
  if (merged.scheduledPublishAt) {
    translations[PUBLISH_AT_KEY] = merged.scheduledPublishAt;
  }
  if (merged.liveNotice) {
    translations[LIVE_NOTICE_KEY] = merged.liveNotice;
  }
  if (merged.activationConflict) {
    translations[ACTIVATION_CONFLICT_KEY] =
      typeof merged.activationConflict === "string"
        ? merged.activationConflict
        : JSON.stringify(merged.activationConflict);
  } else if (merged.activationConflict === undefined && preservedConflict) {
    translations[ACTIVATION_CONFLICT_KEY] = preservedConflict;
  }
  return {
    heading: merged.heading,
    template: merged.template,
    dateFormat: merged.dateFormat,
    dateSeparator: merged.dateSeparator,
    includeYear: merged.includeYear,
    widgetLayout: merged.widgetLayout || "FULL",
    // Do not write designTemplate here - Prisma MessageConfig has no such field
    // (and older clients reject it). Canonical store is translations.__design.
    descriptionEnabled: merged.descriptionEnabled !== false,
    headingEnabled: merged.headingEnabled !== false,
    translations,
  };
}

/** Strip app-only message fields (designTemplate, etc.) before Prisma embed writes. */
function toPrismaMessageConfig(message) {
  return prismaMessageData(message);
}

function parseActivationConflict(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function messageFromRecord(message, styleConfig) {
  const source = message && typeof message === "object" ? message : {};
  const translations = { ...(source.translations || {}) };
  const designTemplate = resolveDesignTemplate(source, styleConfig);
  const scheduledPublishAt = translations[PUBLISH_AT_KEY] || source.scheduledPublishAt || null;
  const liveNotice = translations[LIVE_NOTICE_KEY] || source.liveNotice || null;
  const activationConflict =
    parseActivationConflict(translations[ACTIVATION_CONFLICT_KEY]) || source.activationConflict || null;
  // Keep __design in translations so storefront fallbacks still work if top-level
  // designTemplate is missing from an older Prisma client / cached document.
  delete translations[PUBLISH_AT_KEY];
  delete translations[LIVE_NOTICE_KEY];
  delete translations[ACTIVATION_CONFLICT_KEY];
  translations[DESIGN_KEY] = designTemplate;
  return {
    ...DEFAULT_MESSAGE,
    ...compact(source),
    designTemplate,
    scheduledPublishAt,
    liveNotice,
    activationConflict,
    translations,
  };
}

function withDefaults(widget) {
  if (!widget) return null;
  const shipping = widget.shippingRules && typeof widget.shippingRules === "object" ? widget.shippingRules : {};
  const icons = widget.iconConfig && typeof widget.iconConfig === "object" ? widget.iconConfig : {};
  const style = widget.styleConfig && typeof widget.styleConfig === "object" ? widget.styleConfig : {};
  const placement = widget.placementConfig && typeof widget.placementConfig === "object" ? widget.placementConfig : {};
  const cart = widget.cartConfig && typeof widget.cartConfig === "object" ? widget.cartConfig : {};
  const checkout = widget.checkoutConfig && typeof widget.checkoutConfig === "object" ? widget.checkoutConfig : {};
  const styleConfig = { ...DEFAULT_STYLE, ...compact(style) };
  const messageConfig = messageFromRecord(widget.messageConfig, styleConfig);
  return {
    ...widget,
    shippingRules: {
      ...DEFAULT_SHIPPING,
      ...compact(shipping),
      ...clampShippingDayFields(shipping),
      blockedDates: shipping.blockedDates || [],
      transitBlockedDates: shipping.transitBlockedDates || [],
      transitWorkingDays: shipping.transitWorkingDays?.length
        ? shipping.transitWorkingDays
        : DEFAULT_SHIPPING.transitWorkingDays,
      pincodeRules: normalizePincodeRules(shipping.pincodeRules || DEFAULT_PINCODE_RULES, shipping),
      weightRules: normalizeWeightRules(shipping.weightRules || DEFAULT_WEIGHT_RULES),
      countryRules: shipping.countryRules || toCountryRules(shipping.pincodeRules),
    },
    messageConfig,
    iconConfig: {
      ...DEFAULT_ICONS,
      ...compact(icons),
      headerIcon: icons.headerIcon || DEFAULT_ICONS.headerIcon,
      headerIconEnabled: icons.headerIconEnabled !== false,
      purchasedEnabled: icons.purchasedEnabled !== false,
      processingEnabled: icons.processingEnabled !== false,
      deliveredEnabled: icons.deliveredEnabled !== false,
      purchasedTitle: icons.purchasedTitle || DEFAULT_ICONS.purchasedTitle,
      processingTitle: icons.processingTitle || DEFAULT_ICONS.processingTitle,
      deliveredTitle: icons.deliveredTitle || DEFAULT_ICONS.deliveredTitle,
      savedIcons: normalizeIconLibrary(icons.savedIcons),
    },
    styleConfig,
    placementConfig: {
      ...DEFAULT_PLACEMENT,
      ...compact(placement),
      ...syncedPlacementIds(placement),
      products: placement.products || [],
      collections: placement.collections || [],
      position: normalizePosition(widget.location, placement.position),
    },
    cartConfig: { ...DEFAULT_CART, ...compact(cart) },
    checkoutConfig: { ...DEFAULT_CHECKOUT, ...compact(checkout) },
    marketMode: widget.marketMode || "ALL",
    marketIds: widget.marketIds || [],
    markets: widget.markets || [],
    timezone: resolveTimeZone(widget.timezone),
    scheduledPublishAt: messageConfig.scheduledPublishAt,
  };
}

export async function listLiveWidgetsByLocation(merchantId, location, { excludeId } = {}) {
  const widgets = await prisma.widget.findMany({
    where: {
      merchantId,
      location,
      status: WIDGET_STATUSES.ACTIVE,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      location: true,
      placementConfig: true,
      cartConfig: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return widgets.map((widget) => ({
    ...widget,
    placementConfig: {
      ...DEFAULT_PLACEMENT,
      ...(widget.placementConfig || {}),
      ...syncedPlacementIds(widget.placementConfig || {}),
    },
  }));
}

export async function listLiveProductWidgets(merchantId, options = {}) {
  return listLiveWidgetsByLocation(merchantId, WIDGET_LOCATIONS.PRODUCT, options);
}

export async function findLiveConflicts(merchantId, widgetId, { location, placement, cartConfig } = {}) {
  if (!supportsLiveConflict(location)) return [];
  const live = await listLiveWidgetsByLocation(merchantId, location, { excludeId: widgetId });
  return findLivePlacementConflicts(
    {
      id: widgetId,
      location,
      placementConfig: placement,
      cartConfig,
    },
    live,
  );
}

export async function findProductPlacementConflicts(merchantId, widgetId, placement) {
  return findLiveConflicts(merchantId, widgetId, {
    location: WIDGET_LOCATIONS.PRODUCT,
    placement,
  });
}

async function unpublishWidgets(merchantId, widgetIds = []) {
  const ids = [...new Set((widgetIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const unpublished = [];
  for (const id of ids) {
    const widget = await prisma.widget.findFirst({
      where: { id, merchantId },
    });
    if (!widget) continue;
    const translations = { ...(widget.messageConfig?.translations || {}) };
    delete translations[PUBLISH_AT_KEY];
    delete translations[LIVE_NOTICE_KEY];
    delete translations[ACTIVATION_CONFLICT_KEY];
    await prisma.widget.update({
      where: { id },
      data: {
        status: WIDGET_STATUSES.DRAFT,
        messageConfig: embedSet(toPrismaMessageConfig({ ...(widget.messageConfig || {}), translations })),
      },
    });
    unpublished.push(id);
  }
  return unpublished;
}

export async function resolvePlacementConflict({
  merchantId,
  widgetId,
  keepWidgetId,
  placement,
  scheduledPublishAt = null,
  publishNow = true,
}) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
  });
  if (!widget) return null;

  const live = await listLiveWidgetsByLocation(merchantId, widget.location);
  const candidatePlacement = placement || widget.placementConfig || DEFAULT_PLACEMENT;
  const conflicts = findLivePlacementConflicts(
    {
      id: widgetId,
      location: widget.location,
      placementConfig: candidatePlacement,
      cartConfig: widget.cartConfig,
    },
    live,
  );

  const keepId = keepWidgetId || widgetId;
  const conflictIds = conflicts.map((item) => item.id).filter(Boolean);
  // Only the chosen widget stays live - demote this candidate and every other overlap.
  const demoteIds =
    keepId === widgetId
      ? conflictIds
      : [...new Set([widgetId, ...conflictIds.filter((id) => id !== keepId)])];

  await unpublishWidgets(merchantId, demoteIds);

  if (keepId !== widgetId) {
    // Keep existing live widget(s); cancel this widget's schedule/publish.
    const translations = { ...(widget.messageConfig?.translations || {}) };
    delete translations[PUBLISH_AT_KEY];
    delete translations[LIVE_NOTICE_KEY];
    delete translations[ACTIVATION_CONFLICT_KEY];
    await prisma.widget.update({
      where: { id: widgetId },
      data: {
        status: WIDGET_STATUSES.DRAFT,
        messageConfig: embedSet(toPrismaMessageConfig({ ...(widget.messageConfig || {}), translations })),
      },
    });
    return getWidgetForMerchant(merchantId, widgetId);
  }

  const publishedAt = new Date().toISOString();
  const translations = { ...(widget.messageConfig?.translations || {}) };
  delete translations[ACTIVATION_CONFLICT_KEY];
  if (publishNow) {
    delete translations[PUBLISH_AT_KEY];
    translations[LIVE_NOTICE_KEY] = publishedAt;
  } else if (scheduledPublishAt) {
    translations[PUBLISH_AT_KEY] = scheduledPublishAt;
    delete translations[LIVE_NOTICE_KEY];
  }

  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      status: publishNow ? WIDGET_STATUSES.ACTIVE : WIDGET_STATUSES.SCHEDULED,
      ...(placement
        ? {
            placementConfig: embedSet(
              placementCreateData(
                {
                  ...DEFAULT_PLACEMENT,
                  ...placement,
                  ...syncedPlacementIds(placement),
                },
                widget.location,
              ),
            ),
          }
        : {}),
      messageConfig: embedSet(toPrismaMessageConfig({ ...(widget.messageConfig || {}), translations })),
    },
  });

  return getWidgetForMerchant(merchantId, widgetId);
}

export async function activateDueWidgets(merchantId) {
  const widgets = await prisma.widget.findMany({
    where: { merchantId, status: WIDGET_STATUSES.SCHEDULED },
    select: {
      id: true,
      name: true,
      location: true,
      placementConfig: true,
      cartConfig: true,
      messageConfig: true,
    },
  });
  const now = Date.now();
  const due = widgets.filter((widget) => {
    const at = widget.messageConfig?.translations?.[PUBLISH_AT_KEY];
    const time = at ? new Date(at).getTime() : NaN;
    return Number.isFinite(time) && time <= now;
  });
  if (!due.length) return [];

  const publishedAt = new Date().toISOString();
  const activated = [];
  const conflicted = [];

  for (const widget of due) {
    const translations = { ...(widget.messageConfig?.translations || {}) };
    if (supportsLiveConflict(widget.location)) {
      const live = await listLiveWidgetsByLocation(merchantId, widget.location, { excludeId: widget.id });
      const conflicts = findLivePlacementConflicts(
        {
          id: widget.id,
          location: widget.location,
          name: widget.name,
          placementConfig: widget.placementConfig || DEFAULT_PLACEMENT,
          cartConfig: widget.cartConfig,
        },
        live,
      );
      if (conflicts.length) {
        translations[ACTIVATION_CONFLICT_KEY] = JSON.stringify({
          dueAt: translations[PUBLISH_AT_KEY] || publishedAt,
          conflicts,
        });
        await prisma.widget.update({
          where: { id: widget.id },
          data: {
            messageConfig: embedSet(toPrismaMessageConfig({ ...(widget.messageConfig || {}), translations })),
          },
        });
        conflicted.push({
          id: widget.id,
          name: widget.name,
          conflicts,
          dueAt: translations[PUBLISH_AT_KEY] || publishedAt,
        });
        continue;
      }
    }

    delete translations[ACTIVATION_CONFLICT_KEY];
    translations[LIVE_NOTICE_KEY] = publishedAt;
    await prisma.widget.update({
      where: { id: widget.id },
      data: {
        status: WIDGET_STATUSES.ACTIVE,
        messageConfig: embedSet(toPrismaMessageConfig({ ...(widget.messageConfig || {}), translations })),
      },
    });
    activated.push({ id: widget.id, name: widget.name, at: publishedAt });
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { shopDomain: true },
  });
  if (merchant?.shopDomain) {
    activated.forEach((item) => {
      prisma.widget
        .findFirst({ where: { id: item.id, merchantId } })
        .then((widget) => {
          if (widget?.location === "CHECKOUT") {
            return syncWidgetStorefrontByShop(merchant.shopDomain, withDefaults(widget));
          }
          return null;
        })
        .catch(() => {});
    });
  }

  return activated;
}

export async function listActivationConflicts(merchantId) {
  await activateDueWidgets(merchantId);
  const widgets = await prisma.widget.findMany({
    where: {
      merchantId,
      location: { in: [WIDGET_LOCATIONS.PRODUCT, WIDGET_LOCATIONS.CART] },
    },
    select: {
      id: true,
      name: true,
      location: true,
      status: true,
      messageConfig: { select: { translations: true } },
    },
  });
  return widgets
    .map((widget) => {
      const conflict = parseActivationConflict(widget.messageConfig?.translations?.[ACTIVATION_CONFLICT_KEY]);
      if (!conflict?.conflicts?.length) return null;
      return {
        id: widget.id,
        name: widget.name,
        location: widget.location,
        status: widget.status,
        dueAt: conflict.dueAt || null,
        conflicts: conflict.conflicts,
      };
    })
    .filter(Boolean);
}

export async function listLiveNotices(merchantId) {
  await activateDueWidgets(merchantId);
  const widgets = await prisma.widget.findMany({
    where: { merchantId, status: WIDGET_STATUSES.ACTIVE },
    select: {
      id: true,
      name: true,
      location: true,
      messageConfig: { select: { translations: true } },
    },
  });
  return widgets
    .filter((widget) => widget.messageConfig?.translations?.[LIVE_NOTICE_KEY])
    .map((widget) => ({
      id: widget.id,
      name: widget.name,
      location: widget.location,
      at: widget.messageConfig.translations[LIVE_NOTICE_KEY],
    }));
}

export async function acknowledgeLiveNotice(merchantId, widgetId) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
  });
  if (!widget?.messageConfig) return false;
  const translations = { ...(widget.messageConfig.translations || {}) };
  delete translations[LIVE_NOTICE_KEY];
  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      messageConfig: embedSet(toPrismaMessageConfig({ ...widget.messageConfig, translations })),
    },
  });
  return true;
}

const summarySelect = {
  id: true,
  name: true,
  location: true,
  status: true,
  updatedAt: true,
  messageConfig: { select: { translations: true } },
  placementConfig: true,
  cartConfig: true,
};

function mapWidgetSummary(widget) {
  const translations = widget.messageConfig?.translations || {};
  const placement = widget.placementConfig && typeof widget.placementConfig === "object" ? widget.placementConfig : {};
  const placementConfig = {
    ...DEFAULT_PLACEMENT,
    ...placement,
    ...syncedPlacementIds(placement),
    products: placement.products || [],
    collections: placement.collections || [],
  };
  const cartConfig = { ...DEFAULT_CART, ...(widget.cartConfig || {}) };
  const applyToLabel = widgetApplyToLabel({
    location: widget.location,
    placementConfig,
    cartConfig,
  });
  return {
    id: widget.id,
    name: widget.name,
    location: widget.location,
    status: widget.status,
    updatedAt: widget.updatedAt,
    scheduledPublishAt: translations[PUBLISH_AT_KEY] || null,
    liveNotice: translations[LIVE_NOTICE_KEY] || null,
    activationConflict: parseActivationConflict(translations[ACTIVATION_CONFLICT_KEY]),
    applyToLabel,
    // Home/analytics lists only need labels - omit product/collection arrays from the document.
    placementConfig: { mode: placementConfig.mode },
    cartConfig: { displayMode: cartConfig.displayMode },
  };
}

export async function listWidgetSummaries(merchantId) {
  // Scheduled activations must not block the home document; live-status poll catches up.
  void activateDueWidgets(merchantId).catch((error) => {
    console.warn("[edd] activateDueWidgets", error?.message || error);
  });
  const widgets = await prisma.widget.findMany({
    where: { merchantId },
    select: summarySelect,
    orderBy: { updatedAt: "desc" },
  });
  return widgets.map(mapWidgetSummary);
}

export async function getPublishStatus(merchantId, widgetId = null) {
  await activateDueWidgets(merchantId);

  if (widgetId) {
    const widget = await prisma.widget.findFirst({
      where: { id: widgetId, merchantId },
      select: summarySelect,
    });
    return { widget: widget ? mapWidgetSummary(widget) : null };
  }

  const widgets = await prisma.widget.findMany({
    where: { merchantId },
    select: summarySelect,
    orderBy: { updatedAt: "desc" },
  });
  const summaries = widgets.map(mapWidgetSummary);
  return {
    widgets: summaries,
    liveNotices: summaries
      .filter((widget) => widget.status === WIDGET_STATUSES.ACTIVE && widget.liveNotice)
      .map((widget) => ({
        id: widget.id,
        name: widget.name,
        location: widget.location,
        at: widget.liveNotice,
      })),
    activationConflicts: summaries
      .filter((widget) => widget.activationConflict?.conflicts?.length)
      .map((widget) => ({
        id: widget.id,
        name: widget.name,
        location: widget.location,
        status: widget.status,
        dueAt: widget.activationConflict.dueAt || null,
        conflicts: widget.activationConflict.conflicts,
      })),
  };
}

export async function listWidgets(merchantId) {
  const widgets = await prisma.widget.findMany({
    where: { merchantId },
    orderBy: { updatedAt: "desc" },
  });
  return widgets.map(withDefaults);
}

export async function getWidgetForMerchant(merchantId, widgetId) {
  await activateDueWidgets(merchantId);
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
  });
  return inheritCartShipping(withDefaults(widget), merchantId);
}

export async function getWidgetForSave(merchantId, widgetId) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
  });
  return withDefaults(widget);
}

async function inheritCartShipping(widget, merchantId) {
  if (!widget || widget.location !== "CART" || !merchantId) return widget;
  const product = await prisma.widget.findFirst({
    where: { merchantId, location: "PRODUCT", status: WIDGET_STATUSES.ACTIVE },
    orderBy: { updatedAt: "desc" },
  });
  if (!product) return widget;
  const sourced = withDefaults(product);
  return {
    ...widget,
    timezone: sourced.timezone || widget.timezone,
    shippingRules: sourced.shippingRules,
  };
}

function shippingCreateData(rules) {
  if (!rules) {
    return {
      ...DEFAULT_SHIPPING,
      blockedDates: [],
      transitBlockedDates: [],
    };
  }
  return {
    ...clampShippingDayFields(rules),
    cutoffTime: rules.cutoffTime,
    workingDays: rules.workingDays || DEFAULT_SHIPPING.workingDays,
    blockedDates: rules.blockedDates || [],
    transitWorkingDays: rules.transitWorkingDays || rules.workingDays || DEFAULT_SHIPPING.transitWorkingDays,
    transitBlockedDates: rules.transitBlockedDates || [],
    pincodeRules: rules.pincodeRules || DEFAULT_PINCODE_RULES,
    weightRules: rules.weightRules || DEFAULT_WEIGHT_RULES,
    countryRules: rules.countryRules || toCountryRules(rules.pincodeRules),
  };
}

function iconCreateData(icon = {}) {
  const merged = { ...DEFAULT_ICONS, ...compact(icon) };
  return {
    purchased: merged.purchased,
    processing: merged.processing,
    delivered: merged.delivered,
    headerIcon: merged.headerIcon || "flag",
    headerIconEnabled: merged.headerIconEnabled !== false,
    purchasedEnabled: merged.purchasedEnabled !== false,
    processingEnabled: merged.processingEnabled !== false,
    deliveredEnabled: merged.deliveredEnabled !== false,
    purchasedTitle: merged.purchasedTitle,
    processingTitle: merged.processingTitle,
    deliveredTitle: merged.deliveredTitle,
    purchasedColor: merged.purchasedColor || "",
    processingColor: merged.processingColor || "",
    deliveredColor: merged.deliveredColor || "",
    savedIcons: normalizeIconLibrary(merged.savedIcons),
  };
}

function styleCreateData(style = {}) {
  return { ...DEFAULT_STYLE, ...compact(style) };
}

function placementCreateData(placement = {}, location) {
  const merged = { ...DEFAULT_PLACEMENT, ...compact(placement) };
  return {
    mode: merged.mode,
    productIds: merged.productIds || [],
    collectionIds: merged.collectionIds || [],
    products: merged.products || [],
    collections: merged.collections || [],
    position: merged.position || defaultPosition(location),
  };
}

function cartCreateData(cart = {}, displayMode) {
  return { displayMode: displayMode || cart.displayMode || DEFAULT_CART.displayMode };
}

function checkoutCreateData(checkout = {}) {
  return { ...DEFAULT_CHECKOUT, ...compact(checkout) };
}

export async function createDraftWidget(merchantId, options = {}) {
  const location = options.location || "PRODUCT";
  const displayMode = options.displayMode || "GENERAL";
  let timezone = resolveTimeZone(options.timezone);
  const name = String(options.name || "").trim() || defaultWidgetName(location);

  if (location === "CHECKOUT") {
    const error = new Error("Checkout widgets are not available. Shopify only supports checkout UI extensions on Plus.");
    error.code = "CHECKOUT_UNAVAILABLE";
    throw error;
  }

  let shippingCreate = shippingCreateData();
  if (location === "CART" || location === "CHECKOUT") {
    const product = await prisma.widget.findFirst({
      where: { merchantId, location: "PRODUCT", status: WIDGET_STATUSES.ACTIVE },
      orderBy: { updatedAt: "desc" },
    });
    if (product?.shippingRules) {
      shippingCreate = shippingCreateData(product.shippingRules);
      timezone = resolveTimeZone(product.timezone || timezone);
    }
  }

  return prisma.widget.create({
    data: {
      merchantId,
      name,
      location,
      status: WIDGET_STATUSES.DRAFT,
      currentStep: "conditions",
      timezone,
      marketMode: "ALL",
      marketIds: [],
      markets: [],
      shippingRules: embedSet(shippingCreate),
      messageConfig: embedSet(prismaMessageData(DEFAULT_MESSAGE)),
      iconConfig: embedSet(iconCreateData()),
      styleConfig: embedSet(styleCreateData()),
      placementConfig: embedSet(placementCreateData({}, location)),
      cartConfig: embedSet(cartCreateData({}, displayMode)),
      checkoutConfig: embedSet(checkoutCreateData()),
    },
  });
}

export async function updateWidget(merchantId, widgetId, data) {
  const existing = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.widget.update({
    where: { id: widgetId },
    data,
  });
}

export async function saveShippingRules(merchantId, widgetId, shipping) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  const shippingBase = {
    ...clampShippingDayFields(shipping),
    cutoffTime: shipping.cutoffTime,
    workingDays: shipping.workingDays,
    blockedDates: shipping.blockedDates,
    transitWorkingDays: shipping.transitWorkingDays,
    transitBlockedDates: shipping.transitBlockedDates,
  };
  const pincodeRules = await expandPincodeRulesForCheck(
    shipping.pincodeRules || DEFAULT_PINCODE_RULES,
    shippingBase,
  );
  const payload = {
    ...shippingBase,
    pincodeRules,
    weightRules: shipping.weightRules || DEFAULT_WEIGHT_RULES,
    countryRules: shipping.countryRules || toCountryRules(pincodeRules),
  };

  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      shippingRules: embedSet(payload),
      timezone: shipping.timezone ? resolveTimeZone(shipping.timezone) : undefined,
      currentStep: "shipping",
    },
  });

  return getWidgetForMerchant(merchantId, widgetId);
}

export async function saveMessageAndIcons(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      messageConfig: embedSet(prismaMessageData({ heading: values.heading, template: values.template })),
      iconConfig: embedSet(iconCreateData(values)),
      currentStep: "message",
    },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function saveStyle(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  const payload = {
    backgroundType: values.backgroundType,
    backgroundColor: values.backgroundColor,
    gradientStart: values.gradientStart,
    gradientEnd: values.gradientEnd,
    gradientDirection: values.gradientDirection,
    borderRadius: values.borderRadius,
    themeColor: values.themeColor,
  };

  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      styleConfig: embedSet(styleCreateData(payload)),
      currentStep: "style",
    },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function savePlacement(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true, location: true, placementConfig: true },
  });
  if (!widget) return null;

  const payload = {
    mode: values.mode,
    ...syncedPlacementIds(values),
    products: values.products || [],
    collections: values.collections || [],
  };

  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      placementConfig: embedSet(placementCreateData({ ...widget.placementConfig, ...payload }, widget.location)),
      currentStep: "placement",
    },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function saveCartConfig(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      cartConfig: embedSet(cartCreateData({}, values.displayMode)),
      currentStep: "display",
    },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function saveCheckoutConfig(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  const payload = {
    heading: values.heading,
    template: values.template,
    purchasedIcon: values.purchased || values.purchasedIcon,
    processingIcon: values.processing || values.processingIcon,
    deliveredIcon: values.delivered || values.deliveredIcon,
    backgroundType: values.backgroundType,
    backgroundColor: values.backgroundColor,
    gradientStart: values.gradientStart,
    gradientEnd: values.gradientEnd,
    gradientDirection: values.gradientDirection,
    borderRadius: values.borderRadius,
    themeColor: values.themeColor,
  };

  await prisma.widget.update({
    where: { id: widgetId },
    data: {
      checkoutConfig: embedSet(checkoutCreateData(payload)),
      currentStep: "display",
    },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function setWidgetStatus(merchantId, widgetId, status, { force = false } = {}) {
  if (status === WIDGET_STATUSES.ACTIVE && !force) {
    const widget = await prisma.widget.findFirst({
      where: { id: widgetId, merchantId },
      select: { id: true, name: true, location: true, placementConfig: true, cartConfig: true },
    });
    if (widget && supportsLiveConflict(widget.location)) {
      const placement = {
        ...DEFAULT_PLACEMENT,
        ...(widget.placementConfig || {}),
        ...syncedPlacementIds(widget.placementConfig || {}),
      };
      const conflicts = await findLiveConflicts(merchantId, widgetId, {
        location: widget.location,
        placement,
        cartConfig: widget.cartConfig,
      });
      if (conflicts.length) {
        const error = new Error(
          widget.location === WIDGET_LOCATIONS.CART
            ? "Another cart widget is already live. Choose which widget should stay live."
            : "Another live widget already uses the same products or collections. Choose which widget should stay live.",
        );
        error.code = "PLACEMENT_CONFLICT";
        error.conflicts = conflicts;
        error.widget = {
          id: widget.id,
          name: widget.name,
          location: widget.location,
          placementLabel:
            widget.location === WIDGET_LOCATIONS.CART
              ? widget.cartConfig?.displayMode === "PER_PRODUCT"
                ? "Cart · Per product"
                : "Cart page"
              : describePlacement(placement).label,
        };
        throw error;
      }
    }
  }
  return updateWidget(merchantId, widgetId, { status });
}

export async function duplicateWidget(merchantId, widgetId) {
  const widget = await getWidgetForMerchant(merchantId, widgetId);
  if (!widget) return null;
  if (widget.location === "CHECKOUT") {
    const error = new Error("Checkout widgets are not available.");
    error.code = "CHECKOUT_UNAVAILABLE";
    throw error;
  }

  const { shippingRules, messageConfig, iconConfig, styleConfig, placementConfig, cartConfig, checkoutConfig } =
    widget;

  return prisma.widget.create({
    data: {
      merchantId,
      name: `${widget.name} copy`,
      location: widget.location,
      status: WIDGET_STATUSES.DRAFT,
      currentStep: widget.currentStep,
      timezone: resolveTimeZone(widget.timezone),
      marketMode: widget.marketMode || "ALL",
      marketIds: widget.marketIds || [],
      markets: widget.markets || [],
      shippingRules: embedSet(shippingCreateData(shippingRules)),
      messageConfig: embedSet(prismaMessageData({ ...messageConfig, scheduledPublishAt: null })),
      iconConfig: embedSet(iconCreateData(iconConfig)),
      styleConfig: embedSet(styleCreateData(styleConfig)),
      placementConfig: embedSet(placementCreateData(placementConfig, widget.location)),
      cartConfig: embedSet(cartCreateData(cartConfig)),
      checkoutConfig: embedSet(checkoutCreateData(checkoutConfig)),
    },
  });
}

export async function deleteWidget(merchantId, widgetId) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return false;

  await Promise.all([prisma.widgetEvent.deleteMany({ where: { widgetId } })]);
  await prisma.widget.delete({ where: { id: widgetId } });

  return true;
}

export async function getActiveStorefrontWidgets(shopDomain, location) {
  const merchant = await findMerchantByShopDomain(shopDomain);
  if (!merchant) return [];
  await activateDueWidgets(merchant.id);

  const widgets = await prisma.widget.findMany({
    where: {
      merchantId: merchant.id,
      status: WIDGET_STATUSES.ACTIVE,
      location,
    },
    orderBy: { updatedAt: "desc" },
  });

  const mapped = widgets.map(withDefaults);
  if (location !== "CART") return mapped;
  return Promise.all(mapped.map((widget) => inheritCartShipping(widget, merchant.id)));
}

export async function getWidgetByShop(shopDomain, widgetId) {
  const merchant = await findMerchantByShopDomain(shopDomain);
  if (!merchant || !widgetId) return null;
  return prisma.widget.findFirst({
    where: { id: widgetId, merchantId: merchant.id },
    select: { id: true, merchantId: true },
  });
}

export async function saveWidgetEditor(merchantId, widgetId, values, options = {}) {
  const location =
    options.location ||
    (
      await prisma.widget.findFirst({
        where: { id: widgetId, merchantId },
        select: { id: true, location: true },
      })
    )?.location;
  if (!location) return null;

  const shippingBase = {
    ...clampShippingDayFields(values),
    cutoffTime: values.cutoffTime,
    workingDays: values.workingDays,
    blockedDates: values.blockedDates,
    transitWorkingDays: values.transitWorkingDays,
    transitBlockedDates: values.transitBlockedDates,
  };
  // Fill city pincode lists on save so storefront checks don't depend on admin-only hydration.
  const pincodeRules = await expandPincodeRulesForCheck(
    values.pincodeRules || DEFAULT_PINCODE_RULES,
    shippingBase,
  );
  const shippingPayload = {
    ...shippingBase,
    pincodeRules,
    weightRules: values.weightRules || DEFAULT_WEIGHT_RULES,
    countryRules: values.countryRules || toCountryRules(pincodeRules),
  };

  const messagePayload = prismaMessageData({
    ...values,
    // Going live or cancelling a schedule clears deferred activation conflicts.
    activationConflict:
      values.status === WIDGET_STATUSES.ACTIVE || values.activationConflict === null
        ? null
        : values.activationConflict,
  });

  const iconPayload = {
    purchased: values.purchased,
    processing: values.processing,
    delivered: values.delivered,
    headerIcon: values.headerIcon || "flag",
    headerIconEnabled: values.headerIconEnabled !== false,
    purchasedEnabled: values.purchasedEnabled !== false,
    processingEnabled: values.processingEnabled !== false,
    deliveredEnabled: values.deliveredEnabled !== false,
    purchasedTitle: values.purchasedTitle,
    processingTitle: values.processingTitle,
    deliveredTitle: values.deliveredTitle,
    purchasedColor: values.purchasedColor || "",
    processingColor: values.processingColor || "",
    deliveredColor: values.deliveredColor || "",
    savedIcons: normalizeIconLibrary(values.savedIcons),
  };

  const stylePayload = {
    backgroundType: values.backgroundType,
    backgroundColor: values.backgroundColor,
    gradientStart: values.gradientStart,
    gradientEnd: values.gradientEnd,
    gradientDirection: values.gradientDirection,
    borderRadius: values.borderRadius,
    themeColor: values.themeColor,
    borderWidth: values.borderWidth,
    borderColor: values.borderColor,
    paddingTop: values.paddingTop,
    paddingMiddle: values.paddingMiddle,
    paddingBottom: values.paddingBottom,
    paddingLeft: values.paddingLeft,
    paddingRight: values.paddingRight,
    iconSize: values.iconSize,
    progressWidth: values.progressWidth,
    progressColor: values.progressColor,
    fontFamily: values.fontFamily,
    fontSize: values.fontSize,
    textColor: values.textColor,
    statusFontSize: values.statusFontSize,
    statusColor: values.statusColor,
    dateFontSize: values.dateFontSize,
    dateColor: values.dateColor,
    dynamicColor: values.dynamicColor,
    headingFontWeight: Number(values.headingFontWeight) || 600,
    customCss: values.customCss || "",
  };

  const placementIds = syncedPlacementIds(values);
  const placementPayload = {
    mode: values.mode,
    productIds: placementIds.productIds,
    collectionIds: placementIds.collectionIds,
    products: values.products || [],
    collections: values.collections || [],
    position: values.position || defaultPosition(location),
  };

  const saved = await replaceWidgetFields(
    widgetId,
    {
    name: values.name,
    timezone: values.timezone ? resolveTimeZone(values.timezone) : undefined,
    marketMode: values.marketMode,
    marketIds: values.marketIds || [],
    markets: values.markets || [],
    currentStep: values.currentStep || "conditions",
    status: values.status,
    shippingRules: shippingPayload,
    messageConfig: messagePayload,
    iconConfig: iconPayload,
    styleConfig: stylePayload,
    placementConfig: placementPayload,
    ...(location === "CART"
      ? { cartConfig: cartCreateData({}, values.displayMode || DEFAULT_CART.displayMode) }
      : {}),
    ...(location === "CHECKOUT"
      ? {
          checkoutConfig: checkoutCreateData({
            heading: values.heading || "Estimated Delivery",
            template: values.template,
            themeColor: values.themeColor,
            backgroundType: values.backgroundType,
            backgroundColor: values.backgroundColor,
            borderRadius: values.borderRadius,
          }),
        }
      : {}),
    },
    { reload: options.returnWidget !== false },
  );

  if (!saved) return null;
  if (options.returnWidget === false) return true;
  const withSavedDefaults = withDefaults(saved);
  if (location === "CART") {
    return inheritCartShipping(withSavedDefaults, merchantId);
  }
  return withSavedDefaults;
}

export function serializeWidget(widget) {
  if (!widget) return null;
  return JSON.parse(JSON.stringify(widget));
}

