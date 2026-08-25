import prisma from "../../lib/prisma.server";
import { EVENT_TYPES } from "../../lib/constants";
import { publicPincodeState } from "../../lib/pincode";

export async function recordWidgetEvent({
  widgetId,
  merchantId,
  type,
  productId,
  metadata,
  eventKey,
}) {
  if (eventKey) {
    const existing = await prisma.widgetEvent.findUnique({
      where: { eventKey },
      select: { id: true },
    });
    if (existing) return existing;
  }

  return prisma.widgetEvent.create({
    data: {
      widgetId,
      merchantId,
      type,
      productId: productId || null,
      metadata: metadata || undefined,
      eventKey: eventKey || undefined,
    },
  });
}

export async function getWidgetMetrics(widgetIds) {
  if (!widgetIds.length) {
    return {};
  }

  const grouped = await prisma.widgetEvent.groupBy({
    by: ["widgetId", "type"],
    where: { widgetId: { in: widgetIds } },
    _count: { _all: true },
  });

  const metrics = Object.fromEntries(
    widgetIds.map((id) => [
      id,
      { impressions: 0, clicks: 0, addToCart: 0, conversions: 0, conversionRate: 0 },
    ]),
  );

  for (const row of grouped) {
    const current = metrics[row.widgetId];
    if (!current) continue;
    if (row.type === EVENT_TYPES.IMPRESSION) current.impressions = row._count._all;
    if (row.type === EVENT_TYPES.CLICK) current.clicks = row._count._all;
    if (row.type === EVENT_TYPES.ADD_TO_CART) current.addToCart = row._count._all;
    if (row.type === EVENT_TYPES.CONVERSION) current.conversions = row._count._all;
  }

  for (const current of Object.values(metrics)) {
    current.conversionRate =
      current.impressions > 0
        ? Number(((current.conversions / current.impressions) * 100).toFixed(1))
        : 0;
  }

  return metrics;
}

export async function getMerchantTotals(merchantId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const where = { merchantId, timestamp: { gte: since } };
  const [impressions, clicks, addToCart, conversions] = await Promise.all([
    prisma.widgetEvent.count({ where: { ...where, type: EVENT_TYPES.IMPRESSION } }),
    prisma.widgetEvent.count({ where: { ...where, type: EVENT_TYPES.CLICK } }),
    prisma.widgetEvent.count({ where: { ...where, type: EVENT_TYPES.ADD_TO_CART } }),
    prisma.widgetEvent.count({ where: { ...where, type: EVENT_TYPES.CONVERSION } }),
  ]);

  const totals = {
    impressions,
    clicks,
    addToCart,
    conversions,
    conversionRate:
      impressions > 0 ? Number(((conversions / impressions) * 100).toFixed(1)) : 0,
  };

  return totals;
}

export function publicStorefrontConfig(widget, delivery, options = {}) {
  const locale = String(options.locale || "en").slice(0, 2).toLowerCase();
  const translation = widget.messageConfig.translations?.[locale] || {};
  const pincode = publicPincodeState(widget.shippingRules?.pincodeRules, { code: options.pincode });

  return {
    id: widget.id,
    location: widget.location,
    heading: widget.messageConfig.heading,
    message: translation.template || widget.messageConfig.template,
    layout: widget.messageConfig.widgetLayout || "FULL",
    design: widget.messageConfig.designTemplate || "TIMELINE",
    descriptionEnabled: widget.messageConfig.descriptionEnabled !== false,
    pincode,
    icons: {
      ...widget.iconConfig,
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
