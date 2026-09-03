import prisma from "./prisma.server";
import { getMerchantTotals, getWidgetMetrics } from "../services/analytics/analytics.server";

export async function loadDashboardAnalytics(merchantId) {
  const totals = await getMerchantTotals(merchantId);
  return totals;
}

export async function loadWidgetAnalytics(widgetIds) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return getWidgetMetrics(widgetIds, { since });
}

export { prisma };
