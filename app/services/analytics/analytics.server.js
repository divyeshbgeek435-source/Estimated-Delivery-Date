import prisma, { hasWidgetEventKind } from "../../lib/prisma.server";
import { ACTIVITY_KINDS, EVENT_TYPES } from "../../lib/constants";
import { publicPincodeState, resolveWeightDisplayMode } from "../../lib/pincode";

function newEventKey(type, widgetId) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `evt:${type}:${widgetId}:${Date.now()}:${rand}`;
}

export async function recordWidgetEvent({
  widgetId,
  merchantId,
  type,
  productId,
  metadata,
  eventKey,
}) {
  // Mongo unique indexes treat missing/null eventKey as one value, so every insert
  // needs a distinct key. Client-supplied keys are still used for idempotent dedupe.
  const key = eventKey || newEventKey(type, widgetId);
  const now = new Date();

  if (eventKey) {
    const existing = await prisma.widgetEvent.findUnique({
      where: { eventKey },
      select: { id: true },
    });
    if (existing) return existing;
  }

  try {
    return await prisma.widgetEvent.create({
      data: {
        widgetId,
        merchantId,
        type,
        productId: productId || null,
        metadata: metadata || undefined,
        eventKey: key,
        timestamp: now,
        createdAt: now,
        ...(hasWidgetEventKind() ? { kind: ACTIVITY_KINDS.EVENT } : {}),
      },
      select: { id: true },
    });
  } catch (error) {
    // Only treat unique conflicts as success when the caller asked for dedupe.
    if (error?.code === "P2002" && eventKey) return { id: null };
    throw error;
  }
}

function rate(part, whole) {
  return whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0;
}

function emptyMetrics() {
  return {
    impressions: 0,
    clicks: 0,
    addToCart: 0,
    conversions: 0,
    conversionRate: 0,
    clickThroughRate: 0,
    addToCartRate: 0,
  };
}

export async function getWidgetMetrics(widgetIds, options = {}) {
  if (!widgetIds.length) {
    return {};
  }

  const where = {
    widgetId: { in: widgetIds },
    type: { in: Object.values(EVENT_TYPES) },
  };
  if (options.since) where.timestamp = { gte: options.since };

  const grouped = await prisma.widgetEvent.groupBy({
    by: ["widgetId", "type"],
    where,
    _count: { _all: true },
  });

  const metrics = Object.fromEntries(widgetIds.map((id) => [id, emptyMetrics()]));

  for (const row of grouped) {
    const current = metrics[row.widgetId];
    if (!current) continue;
    if (row.type === EVENT_TYPES.IMPRESSION) current.impressions = row._count._all;
    if (row.type === EVENT_TYPES.CLICK) current.clicks = row._count._all;
    if (row.type === EVENT_TYPES.ADD_TO_CART) current.addToCart = row._count._all;
    if (row.type === EVENT_TYPES.CONVERSION) current.conversions = row._count._all;
  }

  for (const current of Object.values(metrics)) {
    current.conversionRate = rate(current.conversions, current.impressions);
    current.clickThroughRate = rate(current.clicks, current.impressions);
    current.addToCartRate = rate(current.addToCart, current.impressions);
  }

  return metrics;
}

export async function getMerchantTotals(merchantId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.widgetEvent.groupBy({
    by: ["type"],
    where: { merchantId, type: { in: Object.values(EVENT_TYPES) }, timestamp: { gte: since } },
    _count: { _all: true },
  });

  const totals = emptyMetrics();
  for (const row of grouped) {
    if (row.type === EVENT_TYPES.IMPRESSION) totals.impressions = row._count._all;
    if (row.type === EVENT_TYPES.CLICK) totals.clicks = row._count._all;
    if (row.type === EVENT_TYPES.ADD_TO_CART) totals.addToCart = row._count._all;
    if (row.type === EVENT_TYPES.CONVERSION) totals.conversions = row._count._all;
  }
  totals.conversionRate = rate(totals.conversions, totals.impressions);
  totals.clickThroughRate = rate(totals.clicks, totals.impressions);
  totals.addToCartRate = rate(totals.addToCart, totals.impressions);
  return totals;
}

export function publicStorefrontConfig(widget, delivery, options = {}) {
  const locale = String(options.locale || "en").slice(0, 2).toLowerCase();
  const translation = widget.messageConfig.translations?.[locale] || {};
  const pincodeRaw = publicPincodeState(widget.shippingRules?.pincodeRules, {
    code: options.pincode,
    weightRules: widget.shippingRules?.weightRules,
    place: options.place,
    productWeight: options.productWeight,
    shipping: widget.shippingRules,
  });
  const pincode = widget.location === "CART" || widget.location === "CHECKOUT"
    ? { ...pincodeRaw, enabled: false }
    : pincodeRaw;
  const displayMode = resolveWeightDisplayMode(widget.shippingRules?.weightRules, widget.shippingRules?.pincodeRules);

  return {
    id: widget.id,
    location: widget.location,
    heading: widget.messageConfig.heading,
    message: translation.template || widget.messageConfig.template,
    layout: widget.messageConfig.widgetLayout || "FULL",
    design: widget.messageConfig.designTemplate || "TIMELINE",
    descriptionEnabled: widget.messageConfig.descriptionEnabled !== false,
    headingEnabled: widget.messageConfig.headingEnabled !== false,
    pincode,
    weight: {
      displayMode,
      value: pincode.weight || "",
    },
    icons: {
      ...widget.iconConfig,
      headerIcon: widget.iconConfig?.headerIcon || "flag",
      headerIconEnabled: widget.iconConfig?.headerIconEnabled !== false,
      purchasedEnabled: widget.iconConfig?.purchasedEnabled !== false,
      processingEnabled: widget.iconConfig?.processingEnabled !== false,
      deliveredEnabled: widget.iconConfig?.deliveredEnabled !== false,
      purchasedTitle: translation.purchasedTitle || widget.iconConfig.purchasedTitle,
      processingTitle: translation.processingTitle || widget.iconConfig.processingTitle,
      deliveredTitle: translation.deliveredTitle || widget.iconConfig.deliveredTitle,
    },
    style: {
      backgroundType: widget.styleConfig.backgroundType,
      backgroundColor: widget.styleConfig.backgroundColor,
      gradientStart: widget.styleConfig.gradientStart,
      gradientEnd: widget.styleConfig.gradientEnd,
      gradientDirection: widget.styleConfig.gradientDirection,
      borderRadius: widget.styleConfig.borderRadius,
      themeColor: widget.styleConfig.themeColor,
      borderWidth: widget.styleConfig.borderWidth,
      borderColor: widget.styleConfig.borderColor,
      paddingTop: widget.styleConfig.paddingTop,
      paddingMiddle: widget.styleConfig.paddingMiddle,
      paddingBottom: widget.styleConfig.paddingBottom,
      paddingLeft: widget.styleConfig.paddingLeft,
      paddingRight: widget.styleConfig.paddingRight,
      iconSize: widget.styleConfig.iconSize,
      progressWidth: widget.styleConfig.progressWidth,
      progressColor: widget.styleConfig.progressColor,
      fontFamily: widget.styleConfig.fontFamily,
      fontSize: widget.styleConfig.fontSize,
      textColor: widget.styleConfig.textColor,
      statusFontSize: widget.styleConfig.statusFontSize,
      statusColor: widget.styleConfig.statusColor,
      dateFontSize: widget.styleConfig.dateFontSize,
      dateColor: widget.styleConfig.dateColor,
      dynamicColor: widget.styleConfig.dynamicColor,
      headingFontWeight: widget.styleConfig.headingFontWeight || 600,
      customCss: widget.styleConfig.customCss,
    },
    cart: widget.cartConfig,
    placement: {
      position: widget.placementConfig?.position,
      mode: widget.placementConfig?.mode,
    },
    items: options.items || [],
    checkout: {
      heading: widget.checkoutConfig?.heading,
      message: translation.template || widget.checkoutConfig?.template || widget.messageConfig.template,
      icons: {
        purchased: widget.checkoutConfig?.purchasedIcon,
        processing: widget.checkoutConfig?.processingIcon,
        delivered: widget.checkoutConfig?.deliveredIcon,
      },
      style: {
        backgroundType: widget.checkoutConfig?.backgroundType,
        backgroundColor: widget.checkoutConfig?.backgroundColor,
        gradientStart: widget.checkoutConfig?.gradientStart,
        gradientEnd: widget.checkoutConfig?.gradientEnd,
        gradientDirection: widget.checkoutConfig?.gradientDirection,
        borderRadius: widget.checkoutConfig?.borderRadius,
        themeColor: widget.checkoutConfig?.themeColor,
      },
    },
    delivery,
  };
}
