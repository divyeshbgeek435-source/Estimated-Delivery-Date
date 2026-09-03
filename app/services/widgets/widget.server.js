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
  WIDGET_STATUSES,
} from "../../lib/constants";
import { normalizePincodeRules, normalizeWeightRules, toCountryRules } from "../../lib/pincode";
import { syncedPlacementIds } from "../../lib/form.server";
import { normalizePosition } from "../../lib/widget-profiles";
import { resolveTimeZone } from "../../lib/timezone";
import { findMerchantByShopDomain } from "../shopify/merchant.server";
import { syncWidgetStorefrontByShop } from "../shopify/store-block.server";

function compact(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null));
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

const DESIGN_KEY = "__design";
const PUBLISH_AT_KEY = "__publishAt";
const LIVE_NOTICE_KEY = "__liveNotice";

function prismaMessageData(message = {}) {
  const merged = { ...DEFAULT_MESSAGE, ...message };
  const translations = { ...(merged.translations || {}) };
  delete translations[DESIGN_KEY];
  delete translations[PUBLISH_AT_KEY];
  delete translations[LIVE_NOTICE_KEY];
  translations[DESIGN_KEY] = merged.designTemplate || "TIMELINE";
  if (merged.scheduledPublishAt) {
    translations[PUBLISH_AT_KEY] = merged.scheduledPublishAt;
  }
  if (merged.liveNotice) {
    translations[LIVE_NOTICE_KEY] = merged.liveNotice;
  }
  return {
    heading: merged.heading,
    template: merged.template,
    dateFormat: merged.dateFormat,
    dateSeparator: merged.dateSeparator,
    includeYear: merged.includeYear,
    widgetLayout: merged.widgetLayout || "FULL",
    descriptionEnabled: merged.descriptionEnabled !== false,
    translations,
  };
}

function messageFromRecord(message = {}) {
  const translations = { ...(message.translations || {}) };
  const designTemplate = message.designTemplate || translations[DESIGN_KEY] || "TIMELINE";
  const scheduledPublishAt = translations[PUBLISH_AT_KEY] || message.scheduledPublishAt || null;
  const liveNotice = translations[LIVE_NOTICE_KEY] || message.liveNotice || null;
  delete translations[DESIGN_KEY];
  delete translations[PUBLISH_AT_KEY];
  delete translations[LIVE_NOTICE_KEY];
  return {
    ...DEFAULT_MESSAGE,
    ...compact(message),
    designTemplate,
    scheduledPublishAt,
    liveNotice,
    translations,
  };
}

function withDefaults(widget) {
  if (!widget) return null;
  return {
    ...widget,
    shippingRules: {
      ...DEFAULT_SHIPPING,
      ...compact(widget.shippingRules || {}),
      blockedDates: widget.shippingRules?.blockedDates || [],
      transitBlockedDates: widget.shippingRules?.transitBlockedDates || [],
      transitWorkingDays: widget.shippingRules?.transitWorkingDays?.length
        ? widget.shippingRules.transitWorkingDays
        : DEFAULT_SHIPPING.transitWorkingDays,
      pincodeRules: normalizePincodeRules(
        widget.shippingRules?.pincodeRules || DEFAULT_PINCODE_RULES,
        widget.shippingRules,
      ),
      weightRules: normalizeWeightRules(widget.shippingRules?.weightRules || DEFAULT_WEIGHT_RULES),
      countryRules: widget.shippingRules?.countryRules || toCountryRules(widget.shippingRules?.pincodeRules),
    },
    messageConfig: messageFromRecord(widget.messageConfig),
    iconConfig: {
      ...DEFAULT_ICONS,
      ...compact(widget.iconConfig || {}),
      headerIcon: widget.iconConfig?.headerIcon || DEFAULT_ICONS.headerIcon,
      headerIconEnabled: widget.iconConfig?.headerIconEnabled !== false,
      purchasedEnabled: widget.iconConfig?.purchasedEnabled !== false,
      processingEnabled: widget.iconConfig?.processingEnabled !== false,
      deliveredEnabled: widget.iconConfig?.deliveredEnabled !== false,
      purchasedTitle: widget.iconConfig?.purchasedTitle || DEFAULT_ICONS.purchasedTitle,
      processingTitle: widget.iconConfig?.processingTitle || DEFAULT_ICONS.processingTitle,
      deliveredTitle: widget.iconConfig?.deliveredTitle || DEFAULT_ICONS.deliveredTitle,
    },
    styleConfig: { ...DEFAULT_STYLE, ...compact(widget.styleConfig || {}) },
    placementConfig: {
      ...DEFAULT_PLACEMENT,
      ...compact(widget.placementConfig || {}),
      ...syncedPlacementIds(widget.placementConfig || {}),
      products: widget.placementConfig?.products || [],
      collections: widget.placementConfig?.collections || [],
      position: normalizePosition(widget.location, widget.placementConfig?.position),
    },
    cartConfig: { ...DEFAULT_CART, ...compact(widget.cartConfig || {}) },
    checkoutConfig: { ...DEFAULT_CHECKOUT, ...compact(widget.checkoutConfig || {}) },
    marketMode: widget.marketMode || "ALL",
    marketIds: widget.marketIds || [],
    markets: widget.markets || [],
    timezone: resolveTimeZone(widget.timezone),
    scheduledPublishAt: messageFromRecord(widget.messageConfig).scheduledPublishAt,
  };
}

export async function activateDueWidgets(merchantId) {
  const widgets = await prisma.widget.findMany({
    where: { merchantId, status: WIDGET_STATUSES.SCHEDULED },
    select: {
      id: true,
      name: true,
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
  await Promise.all(
    due.map((widget) => {
      const translations = { ...(widget.messageConfig?.translations || {}) };
      translations[LIVE_NOTICE_KEY] = publishedAt;
      return prisma.widget.update({
        where: { id: widget.id },
        data: {
          status: WIDGET_STATUSES.ACTIVE,
          messageConfig: embedSet({
            ...(widget.messageConfig || prismaMessageData()),
            translations,
          }),
        },
      });
    }),
  );

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { shopDomain: true },
  });
  if (merchant?.shopDomain) {
    due.forEach((item) => {
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

  return due.map((widget) => ({ id: widget.id, name: widget.name, at: publishedAt }));
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
      messageConfig: embedSet({
        ...widget.messageConfig,
        translations,
      }),
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
};

function mapWidgetSummary(widget) {
  const translations = widget.messageConfig?.translations || {};
  return {
    id: widget.id,
    name: widget.name,
    location: widget.location,
    status: widget.status,
    updatedAt: widget.updatedAt,
    scheduledPublishAt: translations[PUBLISH_AT_KEY] || null,
    liveNotice: translations[LIVE_NOTICE_KEY] || null,
  };
}

export async function listWidgetSummaries(merchantId) {
  await activateDueWidgets(merchantId);
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
    processingMinDays: rules.processingMinDays,
    processingMaxDays: rules.processingMaxDays,
    cutoffTime: rules.cutoffTime,
    workingDays: rules.workingDays || DEFAULT_SHIPPING.workingDays,
    blockedDates: rules.blockedDates || [],
    transitMinDays: rules.transitMinDays,
    transitMaxDays: rules.transitMaxDays,
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

  if (location === "CART") {
    const existing = await prisma.widget.findMany({
      where: { merchantId, location: "CART" },
    });
    if (existing.some((item) => (item.cartConfig?.displayMode || "GENERAL") === displayMode)) {
      const error = new Error("You can only have one cart widget per mode (General or Per product).");
      error.code = "CART_MODE_EXISTS";
      throw error;
    }
  }

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

  const payload = {
    processingMinDays: shipping.processingMinDays,
    processingMaxDays: shipping.processingMaxDays,
    cutoffTime: shipping.cutoffTime,
    workingDays: shipping.workingDays,
    blockedDates: shipping.blockedDates,
    transitMinDays: shipping.transitMinDays,
    transitMaxDays: shipping.transitMaxDays,
    transitWorkingDays: shipping.transitWorkingDays,
    transitBlockedDates: shipping.transitBlockedDates,
    pincodeRules: shipping.pincodeRules || DEFAULT_PINCODE_RULES,
    weightRules: shipping.weightRules || DEFAULT_WEIGHT_RULES,
    countryRules: shipping.countryRules || toCountryRules(shipping.pincodeRules),
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

export async function setWidgetStatus(merchantId, widgetId, status) {
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

  await Promise.all([
    prisma.deliveryRequest.deleteMany({ where: { widgetId } }),
    prisma.widgetEvent.deleteMany({ where: { widgetId } }),
  ]);
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

  const shippingPayload = {
    processingMinDays: values.processingMinDays,
    processingMaxDays: values.processingMaxDays,
    cutoffTime: values.cutoffTime,
    workingDays: values.workingDays,
    blockedDates: values.blockedDates,
    transitMinDays: values.transitMinDays,
    transitMaxDays: values.transitMaxDays,
    transitWorkingDays: values.transitWorkingDays,
    transitBlockedDates: values.transitBlockedDates,
    pincodeRules: values.pincodeRules || DEFAULT_PINCODE_RULES,
    weightRules: values.weightRules || DEFAULT_WEIGHT_RULES,
    countryRules: values.countryRules || toCountryRules(values.pincodeRules),
  };

  const messagePayload = prismaMessageData(values);

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
    ...(location === "CART" && values.displayMode
      ? { cartConfig: cartCreateData({}, values.displayMode) }
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
  return withDefaults(saved);
}

export function serializeWidget(widget) {
  if (!widget) return null;
  return JSON.parse(JSON.stringify(widget));
}

