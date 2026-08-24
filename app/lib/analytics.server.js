import prisma from "./prisma.server";
import { getMerchantTotals, getWidgetMetrics } from "../services/analytics/analytics.server";

export async function loadDashboardAnalytics(merchantId) {
  const totals = await getMerchantTotals(merchantId);
  return totals;
}

export async function loadWidgetAnalytics(widgetIds) {
  return getWidgetMetrics(widgetIds);
}

export { prisma };
