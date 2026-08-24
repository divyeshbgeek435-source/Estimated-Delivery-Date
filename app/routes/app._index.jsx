import { useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { requireAdmin } from "../lib/auth.server";
import { loadDashboardAnalytics } from "../lib/analytics.server";
import {
  deleteWidget,
  duplicateWidget,
  listLiveNotices,
  listWidgetSummaries,
  setWidgetStatus,
  acknowledgeLiveNotice,
} from "../services/widgets/widget.server";
import { WIDGET_STATUSES } from "../lib/constants";
import { appBlockEditorUrl, appEmbedEditorUrl } from "../lib/theme-editor";
import { DashboardHome } from "../components/dashboard/DashboardHome";

export const loader = async ({ request }) => {
  const { merchant, shop } = await requireAdmin(request);
  const [widgets, totals, liveNotices] = await Promise.all([
    listWidgetSummaries(merchant.id),
    loadDashboardAnalytics(merchant.id),
    listLiveNotices(merchant.id),
  ]);

  return {
    widgets,
    totals,
    liveNotices,
    shop,
    themeEditorEmbed: appEmbedEditorUrl(shop),
    themeEditorBlock: appBlockEditorUrl(shop),
  };
};

export const action = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const widgetIds = formData
    .getAll("widgetId")
    .map((value) => String(value || ""))
    .filter(Boolean);
  const widgetId = widgetIds[0] || String(formData.get("widgetId") || "");

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
      await setWidgetStatus(merchant.id, widgetId, WIDGET_STATUSES.ACTIVE);
      return { toast: "Widget published" };
    }
    if (intent === "deactivate") {
      await setWidgetStatus(merchant.id, widgetId, WIDGET_STATUSES.INACTIVE);
      return { toast: "Widget unpublished" };
    }
    if (intent === "delete") {
      for (const id of widgetIds.length ? widgetIds : [widgetId]) {
        await deleteWidget(merchant.id, id);
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
      themeEditorEmbed={data.themeEditorEmbed}
      themeEditorBlock={data.themeEditorBlock}
      saving={navigation.state !== "idle"}
      error={actionData?.error}
    />
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
