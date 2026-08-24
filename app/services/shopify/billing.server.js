import { getMerchantTotals } from "../analytics/analytics.server";

export const PLANS = {
  FREE: {
    handle: "FREE",
    name: "Free",
    features: ["product_widget", "basic_analytics"],
  },
  BASIC: {
    handle: "BASIC",
    name: "Basic",
    features: ["product_widget", "cart_widget", "basic_analytics"],
  },
  PRO: {
    handle: "PRO",
    name: "Pro",
    features: [
      "product_widget",
      "cart_widget",
      "checkout_widget",
      "advanced_analytics",
      "pincode_rules",
    ],
  },
  ENTERPRISE: {
    handle: "ENTERPRISE",
    name: "Enterprise",
    features: [
      "product_widget",
      "cart_widget",
      "checkout_widget",
      "advanced_analytics",
      "pincode_rules",
      "weight_rules",
      "country_rules",
    ],
  },
};

export function canUseFeature(planHandle, feature) {
  const plan = PLANS[planHandle] || PLANS.FREE;
  return plan.features.includes(feature);
}

export async function getBillingStatus(merchant) {
  return {
    plan: PLANS[merchant.billingPlan] || PLANS.FREE,
    active: true,
  };
}

export async function requireFeature(merchant, feature) {
  if (canUseFeature(merchant.billingPlan, feature)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `${PLANS[merchant.billingPlan]?.name || "Current"} plan does not include this feature.`,
  };
}

export async function usageSummary(merchantId) {
  return getMerchantTotals(merchantId);
}
