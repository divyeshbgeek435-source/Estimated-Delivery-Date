import { getMerchantHomeTotals, getMerchantTotals, getWidgetMetrics } from "../services/analytics/analytics.server";

export async function loadDashboardAnalytics(merchantId) {
  return getMerchantTotals(merchantId);
}

export async function loadHomeImpressionTotals(merchantId, options = {}) {
  return getMerchantHomeTotals(merchantId, options);
}

export async function loadWidgetAnalytics(widgetIds) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return getWidgetMetrics(widgetIds, { since });
}
