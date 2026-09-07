import { useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { requireAdmin } from "../lib/auth.server";
import {
  deleteWidget,
  duplicateWidget,
  getWidgetForMerchant,
  listWidgetSummaries,
  setWidgetStatus,
  acknowledgeLiveNotice,
} from "../services/widgets/widget.server";
import {
  REQUEST_STATUSES,
  setDeliveryRequestStatus,
} from "../services/widgets/delivery-requests.server";
import { WIDGET_STATUSES } from "../lib/constants";
import { queueWidgetStorefrontSync } from "../services/shopify/store-block.server";
import { appEmbedEditorUrl } from "../lib/theme-editor";
import { DashboardHome } from "../components/dashboard/DashboardHome";

export const loader = async ({ request }) => {
  const { merchant, shop } = await requireAdmin(request);
  const widgets = await listWidgetSummaries(merchant.id);
  const liveNotices = widgets
    .filter((widget) => widget.status === WIDGET_STATUSES.ACTIVE && widget.liveNotice)
    .map((widget) => ({
      id: widget.id,
      name: widget.name,
      location: widget.location,
      at: widget.liveNotice,
    }));

  return {
    widgets,
    liveNotices,
    shop,
    themeEditorEmbed: appEmbedEditorUrl(shop),
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
        queueWidgetStorefrontSync(admin, session, saved);
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
      queueWidgetStorefrontSync(admin, session, saved);
      return { toast: "Widget published" };
    }
    if (intent === "deactivate") {
      const saved = await setWidgetStatus(merchant.id, widgetId, WIDGET_STATUSES.DRAFT);
      queueWidgetStorefrontSync(admin, session, saved);
      return { toast: "Widget unpublished" };
    }
    if (intent === "delete") {
      const names = [];
      let lastExisting = null;
      for (const id of widgetIds.length ? widgetIds : [widgetId]) {
        const existing = await getWidgetForMerchant(merchant.id, id);
        await deleteWidget(merchant.id, id);
        if (existing) {
          names.push(existing.name);
          lastExisting = existing;
        }
      }
      if (lastExisting) {
        queueWidgetStorefrontSync(admin, session, { ...lastExisting, status: WIDGET_STATUSES.INACTIVE });
      }
      return {
        deleted: true,
        deletedName: names[0] || "Widget",
        deletedCount: names.length || 1,
        deletedAt: Date.now(),
      };
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
      liveNotices={data.liveNotices}
      themeEditorEmbed={data.themeEditorEmbed}
      saving={navigation.state !== "idle"}
      error={actionData?.error}
      actionData={actionData}
    />
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
