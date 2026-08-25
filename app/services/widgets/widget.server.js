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
import { normalizePincodeRules, normalizeWeightRules } from "../../lib/pincode";
import { normalizePosition } from "../../lib/widget-profiles";
import { syncWidgetStorefrontByShop } from "../shopify/store-block.server";

const widgetInclude = {
  shippingRules: true,
  messageConfig: true,
  iconConfig: true,
  styleConfig: true,
  placementConfig: true,
  cartConfig: true,
  checkoutConfig: true,
};

function compact(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null));
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
    },
    messageConfig: messageFromRecord(widget.messageConfig),
    iconConfig: {
      ...DEFAULT_ICONS,
      ...compact(widget.iconConfig || {}),
      purchasedTitle: widget.iconConfig?.purchasedTitle || DEFAULT_ICONS.purchasedTitle,
      processingTitle: widget.iconConfig?.processingTitle || DEFAULT_ICONS.processingTitle,
      deliveredTitle: widget.iconConfig?.deliveredTitle || DEFAULT_ICONS.deliveredTitle,
    },
    styleConfig: { ...DEFAULT_STYLE, ...compact(widget.styleConfig || {}) },
    placementConfig: {
      ...DEFAULT_PLACEMENT,
      ...compact(widget.placementConfig || {}),
      products: widget.placementConfig?.products || [],
      collections: widget.placementConfig?.collections || [],
      position: normalizePosition(widget.location, widget.placementConfig?.position),
    },
    cartConfig: { ...DEFAULT_CART, ...compact(widget.cartConfig || {}) },
    checkoutConfig: { ...DEFAULT_CHECKOUT, ...compact(widget.checkoutConfig || {}) },
    marketMode: widget.marketMode || "ALL",
    marketIds: widget.marketIds || [],
    markets: widget.markets || [],
    scheduledPublishAt: messageFromRecord(widget.messageConfig).scheduledPublishAt,
  };
}

export async function activateDueWidgets(merchantId) {
  const widgets = await prisma.widget.findMany({
    where: { merchantId, status: WIDGET_STATUSES.SCHEDULED },
    select: {
      id: true,
      name: true,
      messageConfig: { select: { translations: true } },
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
      return Promise.all([
        prisma.widget.update({
          where: { id: widget.id },
          data: { status: WIDGET_STATUSES.ACTIVE },
        }),
        prisma.messageConfig.update({
          where: { widgetId: widget.id },
          data: { translations },
        }),
      ]);
    }),
  );

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { shopDomain: true },
  });
  if (merchant?.shopDomain) {
    await Promise.all(
      due.map(async (item) => {
        const widget = await prisma.widget.findFirst({
          where: { id: item.id, merchantId },
          include: widgetInclude,
        });
        if (!widget) return;
        await syncWidgetStorefrontByShop(merchant.shopDomain, withDefaults(widget));
      }),
    );
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
    include: { messageConfig: true },
  });
  if (!widget?.messageConfig) return false;
  const translations = { ...(widget.messageConfig.translations || {}) };
  delete translations[LIVE_NOTICE_KEY];
  await prisma.messageConfig.update({
    where: { widgetId },
    data: { translations },
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
    include: widgetInclude,
    orderBy: { updatedAt: "desc" },
  });
  return widgets.map(withDefaults);
}

export async function getWidgetForMerchant(merchantId, widgetId) {
  await activateDueWidgets(merchantId);
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    include: widgetInclude,
  });
  return withDefaults(widget);
}

export async function createDraftWidget(merchantId, options = {}) {
  const location = options.location || "PRODUCT";
  const displayMode = options.displayMode || "GENERAL";
  const timezone = options.timezone || "UTC";
  const name = String(options.name || "").trim() || defaultWidgetName(location);

  if (location === "CART") {
    const existing = await prisma.widget.findMany({
      where: { merchantId, location: "CART" },
      include: { cartConfig: true },
    });
    if (existing.some((item) => (item.cartConfig?.displayMode || "GENERAL") === displayMode)) {
      const error = new Error("You can only have one cart widget per mode (General or Per product).");
      error.code = "CART_MODE_EXISTS";
      throw error;
    }
  }

  if (location === "CHECKOUT") {
    const existing = await prisma.widget.findFirst({
      where: { merchantId, location: "CHECKOUT" },
    });
    if (existing) {
      const error = new Error("You can only have one checkout widget.");
      error.code = "CHECKOUT_EXISTS";
      throw error;
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
      shippingRules: {
        create: {
          ...DEFAULT_SHIPPING,
          blockedDates: [],
          transitBlockedDates: [],
        },
      },
      messageConfig: { create: prismaMessageData(DEFAULT_MESSAGE) },
      iconConfig: { create: DEFAULT_ICONS },
      styleConfig: { create: DEFAULT_STYLE },
      placementConfig: {
        create: {
          ...DEFAULT_PLACEMENT,
          products: [],
          collections: [],
          position: defaultPosition(location),
        },
      },
      cartConfig: { create: { displayMode } },
      checkoutConfig: { create: DEFAULT_CHECKOUT },
    },
    include: widgetInclude,
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
    include: widgetInclude,
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
  };

  await prisma.shippingRules.upsert({
    where: { widgetId },
    update: payload,
    create: { widgetId, ...payload },
  });

  if (shipping.timezone) {
    await prisma.widget.update({
      where: { id: widgetId },
      data: { timezone: shipping.timezone, currentStep: "shipping" },
    });
  } else {
    await prisma.widget.update({
      where: { id: widgetId },
      data: { currentStep: "shipping" },
    });
  }

  return getWidgetForMerchant(merchantId, widgetId);
}

export async function saveMessageAndIcons(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  await prisma.messageConfig.upsert({
    where: { widgetId },
    update: { heading: values.heading, template: values.template },
    create: { widgetId, heading: values.heading, template: values.template },
  });
  await prisma.iconConfig.upsert({
    where: { widgetId },
    update: {
      purchased: values.purchased,
      processing: values.processing,
      delivered: values.delivered,
      purchasedTitle: values.purchasedTitle,
      processingTitle: values.processingTitle,
      deliveredTitle: values.deliveredTitle,
    },
    create: {
      widgetId,
      purchased: values.purchased,
      processing: values.processing,
      delivered: values.delivered,
      purchasedTitle: values.purchasedTitle,
      processingTitle: values.processingTitle,
      deliveredTitle: values.deliveredTitle,
    },
  });
  await prisma.widget.update({
    where: { id: widgetId },
    data: { currentStep: "message" },
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

  await prisma.styleConfig.upsert({
    where: { widgetId },
    update: payload,
    create: { widgetId, ...payload },
  });
  await prisma.widget.update({
    where: { id: widgetId },
    data: { currentStep: "style" },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function savePlacement(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  const payload = {
    mode: values.mode,
    productIds: values.productIds || [],
    collectionIds: values.collectionIds || [],
    products: values.products || [],
    collections: values.collections || [],
  };

  await prisma.placementConfig.upsert({
    where: { widgetId },
    update: payload,
    create: { widgetId, ...payload },
  });
  await prisma.widget.update({
    where: { id: widgetId },
    data: { currentStep: "placement" },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function saveCartConfig(merchantId, widgetId, values) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return null;

  await prisma.cartConfig.upsert({
    where: { widgetId },
    update: { displayMode: values.displayMode },
    create: { widgetId, displayMode: values.displayMode },
  });
  await prisma.widget.update({
    where: { id: widgetId },
    data: { currentStep: "display" },
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

  await prisma.checkoutConfig.upsert({
    where: { widgetId },
    update: payload,
    create: { widgetId, ...payload },
  });
  await prisma.widget.update({
    where: { id: widgetId },
    data: { currentStep: "display" },
  });
  return getWidgetForMerchant(merchantId, widgetId);
}

export async function setWidgetStatus(merchantId, widgetId, status) {
  return updateWidget(merchantId, widgetId, { status });
}

export async function duplicateWidget(merchantId, widgetId) {
  const widget = await getWidgetForMerchant(merchantId, widgetId);
  if (!widget) return null;

  const { shippingRules, messageConfig, iconConfig, styleConfig, placementConfig, cartConfig, checkoutConfig } =
    widget;

  return prisma.widget.create({
    data: {
      merchantId,
      name: `${widget.name} copy`,
      location: widget.location,
      status: WIDGET_STATUSES.DRAFT,
      currentStep: widget.currentStep,
      timezone: widget.timezone,
      shippingRules: {
        create: {
          processingMinDays: shippingRules.processingMinDays,
          processingMaxDays: shippingRules.processingMaxDays,
          cutoffTime: shippingRules.cutoffTime,
          workingDays: shippingRules.workingDays,
          blockedDates: shippingRules.blockedDates || [],
          transitMinDays: shippingRules.transitMinDays,
          transitMaxDays: shippingRules.transitMaxDays,
          transitWorkingDays: shippingRules.transitWorkingDays,
          transitBlockedDates: shippingRules.transitBlockedDates || [],
          pincodeRules: shippingRules.pincodeRules || undefined,
          weightRules: shippingRules.weightRules || undefined,
          countryRules: shippingRules.countryRules || undefined,
        },
      },
      messageConfig: {
        create: prismaMessageData({ ...messageConfig, scheduledPublishAt: null }),
      },
      iconConfig: {
        create: {
          purchased: iconConfig.purchased,
          processing: iconConfig.processing,
          delivered: iconConfig.delivered,
          purchasedTitle: iconConfig.purchasedTitle,
          processingTitle: iconConfig.processingTitle,
          deliveredTitle: iconConfig.deliveredTitle,
        },
      },
      styleConfig: {
        create: {
          backgroundType: styleConfig.backgroundType,
          backgroundColor: styleConfig.backgroundColor,
          gradientStart: styleConfig.gradientStart,
          gradientEnd: styleConfig.gradientEnd,
          gradientDirection: styleConfig.gradientDirection,
          borderRadius: styleConfig.borderRadius,
          themeColor: styleConfig.themeColor,
        },
      },
      placementConfig: {
        create: {
          mode: placementConfig.mode,
          productIds: placementConfig.productIds || [],
          collectionIds: placementConfig.collectionIds || [],
          products: placementConfig.products || [],
          collections: placementConfig.collections || [],
        },
      },
      cartConfig: {
        create: { displayMode: cartConfig.displayMode },
      },
      checkoutConfig: {
        create: {
          heading: checkoutConfig.heading,
          template: checkoutConfig.template,
          purchasedIcon: checkoutConfig.purchasedIcon,
          processingIcon: checkoutConfig.processingIcon,
          deliveredIcon: checkoutConfig.deliveredIcon,
          backgroundType: checkoutConfig.backgroundType,
          backgroundColor: checkoutConfig.backgroundColor,
          gradientStart: checkoutConfig.gradientStart,
          gradientEnd: checkoutConfig.gradientEnd,
          gradientDirection: checkoutConfig.gradientDirection,
          borderRadius: checkoutConfig.borderRadius,
          themeColor: checkoutConfig.themeColor,
        },
      },
    },
    include: widgetInclude,
  });
}

export async function deleteWidget(merchantId, widgetId) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true },
  });
  if (!widget) return false;

  await Promise.all([
    prisma.widgetEvent.deleteMany({ where: { widgetId } }),
    prisma.shippingRules.deleteMany({ where: { widgetId } }),
    prisma.messageConfig.deleteMany({ where: { widgetId } }),
    prisma.iconConfig.deleteMany({ where: { widgetId } }),
    prisma.styleConfig.deleteMany({ where: { widgetId } }),
    prisma.placementConfig.deleteMany({ where: { widgetId } }),
    prisma.cartConfig.deleteMany({ where: { widgetId } }),
    prisma.checkoutConfig.deleteMany({ where: { widgetId } }),
  ]);
  await prisma.widget.delete({ where: { id: widgetId } });

  return true;
}

export async function getActiveStorefrontWidgets(shopDomain, location) {
  const raw = String(shopDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  if (!raw) return [];
  const full = raw.includes(".") ? raw : `${raw}.myshopify.com`;
  const handle = full.replace(/\.myshopify\.com$/i, "");
  const variants = [...new Set([shopDomain, raw, full, handle, `${handle}.myshopify.com`].filter(Boolean))];

  const merchant = await prisma.merchant.findFirst({
    where: { shopDomain: { in: variants } },
  });
  if (!merchant || merchant.uninstalledAt) return [];
  await activateDueWidgets(merchant.id);

  const widgets = await prisma.widget.findMany({
    where: {
      merchantId: merchant.id,
      status: WIDGET_STATUSES.ACTIVE,
      location,
    },
    include: widgetInclude,
  });

  return widgets.map(withDefaults);
}

export async function getWidgetByShop(shopDomain, widgetId) {
  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain },
    select: { id: true, uninstalledAt: true },
  });
  if (!merchant || merchant.uninstalledAt) return null;
  return getWidgetForMerchant(merchant.id, widgetId);
}

export async function saveWidgetEditor(merchantId, widgetId, values, options = {}) {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, merchantId },
    select: { id: true, location: true },
  });
  if (!widget) return null;

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
  };

  const messagePayload = prismaMessageData(values);

  const iconPayload = {
    purchased: values.purchased,
    processing: values.processing,
    delivered: values.delivered,
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

  const placementPayload = {
    mode: values.mode,
    productIds: values.productIds || [],
    collectionIds: values.collectionIds || [],
    products: values.products || [],
    collections: values.collections || [],
    position: values.position || defaultPosition(widget.location),
  };

  const writes = [
    prisma.shippingRules.upsert({
      where: { widgetId },
      update: shippingPayload,
      create: { widgetId, ...shippingPayload },
    }),
    prisma.messageConfig.upsert({
      where: { widgetId },
      update: messagePayload,
      create: { widgetId, ...messagePayload },
    }),
    prisma.iconConfig.upsert({
      where: { widgetId },
      update: iconPayload,
      create: { widgetId, ...iconPayload },
    }),
    prisma.styleConfig.upsert({
      where: { widgetId },
      update: stylePayload,
      create: { widgetId, ...stylePayload },
    }),
    prisma.placementConfig.upsert({
      where: { widgetId },
      update: placementPayload,
      create: { widgetId, ...placementPayload },
    }),
  ];

  if (widget.location === "CART" && values.displayMode) {
    writes.push(
      prisma.cartConfig.upsert({
        where: { widgetId },
        update: { displayMode: values.displayMode },
        create: { widgetId, displayMode: values.displayMode },
      }),
    );
  }

  if (widget.location === "CHECKOUT") {
    const checkoutPayload = {
      heading: values.heading || "Estimated Delivery",
      template: values.template,
      themeColor: values.themeColor,
      backgroundType: values.backgroundType,
      backgroundColor: values.backgroundColor,
      borderRadius: values.borderRadius,
    };
    writes.push(
      prisma.checkoutConfig.upsert({
        where: { widgetId },
        update: checkoutPayload,
        create: { widgetId, ...DEFAULT_CHECKOUT, ...checkoutPayload },
      }),
    );
  }

  await Promise.all(writes);

  const saved = await prisma.widget.update({
    where: { id: widgetId },
    data: {
      name: values.name,
      timezone: values.timezone || undefined,
      marketMode: values.marketMode,
      marketIds: values.marketIds || [],
      markets: values.markets || [],
      currentStep: values.currentStep || "conditions",
      status: values.status,
    },
    ...(options.returnWidget === false ? {} : { include: widgetInclude }),
  });

  if (options.returnWidget === false) return true;
  return withDefaults(saved);
}

export function serializeWidget(widget) {
  if (!widget) return null;
  return JSON.parse(JSON.stringify(widget));
}

