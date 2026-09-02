import { useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { requireAdmin } from "../lib/auth.server";
import { loadDashboardAnalytics } from "../lib/analytics.server";
import {
  deleteWidget,
  duplicateWidget,
  getWidgetForMerchant,
  listLiveNotices,
  listWidgetSummaries,
  setWidgetStatus,
  acknowledgeLiveNotice,
} from "../services/widgets/widget.server";
import {
  listMerchantDeliveryRequests,
  REQUEST_STATUSES,
  setDeliveryRequestStatus,
} from "../services/widgets/delivery-requests.server";
import { WIDGET_STATUSES } from "../lib/constants";
import { syncWidgetStorefront } from "../services/shopify/store-block.server";
import { appBlockEditorUrl, appEmbedEditorUrl } from "../lib/theme-editor";
import { DashboardHome } from "../components/dashboard/DashboardHome";

export const loader = async ({ request }) => {
  const { admin, merchant, shop } = await requireAdmin(request);
  const [widgets, totals, liveNotices, deliveryRequests] = await Promise.all([
    listWidgetSummaries(merchant.id),
    loadDashboardAnalytics(merchant.id),
    listLiveNotices(merchant.id),
    listMerchantDeliveryRequests(merchant.id),
  ]);

  let productHandle = "";
  try {
    const response = await admin.graphql(`#graphql
      query DashboardStorefrontProduct {
        products(first: 1, query: "status:active") {
          nodes {
            handle
          }
        }
      }
    `);
    const json = await response.json();
    productHandle = json.data?.products?.nodes?.[0]?.handle || "";
  } catch {
    productHandle = "";
  }

  return {
    widgets,
    totals,
    liveNotices,
    deliveryRequests,
    shop,
    productHandle,
    themeEditorEmbed: appEmbedEditorUrl(shop),
    themeEditorBlock: appBlockEditorUrl(shop),
  };
};

export const action = async ({ request }) => {
  const { admin, session, merchant } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const widgetIds = formData
    .getAll("widgetId")
    .map((value) => String(value || ""))
    .filter(Boolean);
  const widgetId = widgetIds[0] || String(formData.get("widgetId") || "");

  if (intent === "accept-delivery-request" || intent === "reject-delivery-request") {
    const requestId = String(formData.get("requestId") || "");
    if (!widgetId || !requestId) return { error: "Missing request" };
    try {
      const status = intent === "accept-delivery-request" ? REQUEST_STATUSES.ACCEPTED : REQUEST_STATUSES.REJECTED;
      const saved = await setDeliveryRequestStatus(merchant.id, widgetId, requestId, status);
      if (!saved) return { error: "Could not update that delivery request." };
      if (status === REQUEST_STATUSES.ACCEPTED) {
        await syncWidgetStorefront(admin, session, saved);
      }
      return {
        toast: status === REQUEST_STATUSES.ACCEPTED ? "Pincode added as an eligible location" : "Delivery request declined",
      };
    } catch (error) {
      return { error: error?.message || "Could not update that delivery request." };
    }
  }

  if (!widgetId && !widgetIds.length) return { error: "Missing widget" };

  try {
    if (intent === "ack-live") {
      await acknowledgeLiveNotice(merchant.id, widgetId);
      return { silent: true };
    }
    if (intent === "duplicate") {
      await duplicateWidget(merchant.id, widgetId);
      return { toast: "Widget duplicated" };
    }
    if (intent === "activate") {
      const saved = await setWidgetStatus(merchant.id, widgetId, WIDGET_STATUSES.ACTIVE);
      await syncWidgetStorefront(admin, session, saved);
      return { toast: "Widget published" };
    }
    if (intent === "deactivate") {
      const saved = await setWidgetStatus(merchant.id, widgetId, WIDGET_STATUSES.DRAFT);
      await syncWidgetStorefront(admin, session, saved);
      return { toast: "Widget unpublished" };
    }
    if (intent === "delete") {
      for (const id of widgetIds.length ? widgetIds : [widgetId]) {
        const existing = await getWidgetForMerchant(merchant.id, id);
        await deleteWidget(merchant.id, id);
        if (existing) {
          await syncWidgetStorefront(admin, session, { ...existing, status: WIDGET_STATUSES.INACTIVE });
        }
      }
      return { toast: "Widget deleted" };
    }
  } catch (error) {
    return { error: error?.message || "That action could not be completed." };
  }

  return { error: "Unsupported action" };
};

export default function Dashboard() {
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  useEffect(() => {
    if (actionData?.toast) shopify.toast.show(actionData.toast);
    if (actionData?.error) shopify.toast.show(actionData.error, { isError: true });
  }, [actionData, shopify]);

  return (
    <DashboardHome
      widgets={data.widgets}
      totals={data.totals}
      liveNotices={data.liveNotices}
      deliveryRequests={data.deliveryRequests || []}
      shop={data.shop}
      productHandle={data.productHandle}
      themeEditorEmbed={data.themeEditorEmbed}
      themeEditorBlock={data.themeEditorBlock}
      saving={navigation.state !== "idle"}
      error={actionData?.error}
    />
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
