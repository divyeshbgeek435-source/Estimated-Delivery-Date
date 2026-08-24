import { useActionData, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { requireWidget } from "../lib/auth.server";
import {
  editorSchema,
  formErrors,
  messageSchema,
  placementSchema,
  shippingSchema,
  styleSchema,
} from "../lib/validation";
import { readJsonField } from "../lib/form.server";
import {
  acknowledgeLiveNotice,
  saveWidgetEditor,
  serializeWidget,
} from "../services/widgets/widget.server";
import { WidgetWorkspace } from "../components/editor/WidgetWorkspace";
import { DEFAULT_STYLE, DEFAULT_WORKING_DAYS, WIDGET_STATUSES, WORKING_DAYS } from "../lib/constants";
import { normalizePosition } from "../lib/widget-profiles";
import { productThemeEditorUrl } from "../lib/theme-editor";
import { syncCheckoutMetafield } from "../services/shopify/metafields.server";

export const loader = async ({ request, params }) => {
  const { widget, shop } = await requireWidget(request, params.id);
  return {
    widget: serializeWidget(widget),
    themeEditorUrl: productThemeEditorUrl(shop),
  };
};

function flattenDraft(widget, draft = {}) {
  const shipping = { ...widget.shippingRules, ...(draft.shippingRules || {}) };
  const message = { ...widget.messageConfig, ...(draft.messageConfig || {}) };
  const icons = { ...widget.iconConfig, ...(draft.iconConfig || {}) };
  const style = pickStyle({ ...widget.styleConfig, ...(draft.styleConfig || {}) });
  const placement = { ...widget.placementConfig, ...(draft.placementConfig || {}) };
  const cart = { ...widget.cartConfig, ...(draft.cartConfig || {}) };

  return {
    shipping: {
      processingMinDays: shipping.processingMinDays,
      processingMaxDays: shipping.processingMaxDays,
      cutoffTime: shipping.cutoffTime,
      workingDays: (() => {
        const days = (shipping.workingDays || []).filter((day) => WORKING_DAYS.includes(day));
        return days.length ? days : DEFAULT_WORKING_DAYS;
      })(),
      blockedDates: shipping.blockedDates || [],
      transitMinDays: shipping.transitMinDays,
      transitMaxDays: shipping.transitMaxDays,
      transitWorkingDays: (() => {
        const days = (shipping.transitWorkingDays || []).filter((day) => WORKING_DAYS.includes(day));
        return days.length ? days : DEFAULT_WORKING_DAYS;
      })(),
      transitBlockedDates: shipping.transitBlockedDates || [],
      timezone: draft.timezone || widget.timezone,
      pincodeRules: shipping.pincodeRules || widget.shippingRules.pincodeRules,
      weightRules: shipping.weightRules || widget.shippingRules.weightRules,
    },
    message: {
      heading: message.heading ?? "",
      template: message.template || "",
      dateFormat: message.dateFormat,
      dateSeparator: message.dateSeparator,
      includeYear: Boolean(message.includeYear),
      widgetLayout: message.widgetLayout || "FULL",
      designTemplate: message.designTemplate || "TIMELINE",
      descriptionEnabled: message.descriptionEnabled !== false,
      translations: message.translations || {},
      purchased: icons.purchased,
      processing: icons.processing,
      delivered: icons.delivered,
      purchasedTitle: icons.purchasedTitle,
      processingTitle: icons.processingTitle,
      deliveredTitle: icons.deliveredTitle,
      purchasedColor: icons.purchasedColor || "",
      processingColor: icons.processingColor || "",
      deliveredColor: icons.deliveredColor || "",
      scheduledPublishAt: message.scheduledPublishAt || widget.messageConfig?.scheduledPublishAt || null,
      liveNotice: message.liveNotice || widget.messageConfig?.liveNotice || null,
    },
    style,
    placement: {
      mode: placement.mode,
      productIds: placement.productIds || [],
      collectionIds: placement.collectionIds || [],
      products: placement.products || [],
      collections: placement.collections || [],
      position: normalizePosition(widget.location, placement.position),
    },
    editor: {
      name: draft.name || widget.name,
      timezone: draft.timezone || widget.timezone,
      marketMode: draft.marketMode || widget.marketMode || "ALL",
      marketIds: draft.marketIds || widget.marketIds || [],
      markets: draft.markets || widget.markets || [],
      displayMode: cart.displayMode,
    },
  };
}

function pickStyle(style = {}) {
  const next = { ...DEFAULT_STYLE };
  for (const key of Object.keys(DEFAULT_STYLE)) {
    if (style[key] !== undefined && style[key] !== null && style[key] !== "") {
      next[key] = style[key];
    }
  }
  return next;
}

export const action = async ({ request, params }) => {
  const { admin, merchant, widget } = await requireWidget(request, params.id);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save");
  const draft = readJsonField(formData, "editorState", {});
  const values = flattenDraft(widget, draft);

  if (intent === "ack-live") {
    await acknowledgeLiveNotice(merchant.id, widget.id);
    return {
      widget: serializeWidget({
        ...widget,
        messageConfig: { ...widget.messageConfig, liveNotice: null },
      }),
      silent: true,
    };
  }

  if (intent === "unpublish") {
    try {
      const saved = await saveWidgetEditor(merchant.id, widget.id, {
        ...values.shipping,
        ...values.message,
        scheduledPublishAt: null,
        ...values.style,
        ...values.placement,
        ...values.editor,
        status: WIDGET_STATUSES.INACTIVE,
      });
      return { widget: serializeWidget(saved), toast: widget.status === WIDGET_STATUSES.SCHEDULED ? "Schedule cancelled" : "Widget unpublished" };
    } catch (error) {
      return { errors: { form: error?.message || "Could not unpublish the widget." } };
    }
  }

  const shippingParsed = shippingSchema.safeParse(values.shipping);
  const messageParsed = messageSchema.safeParse(values.message);
  const styleParsed = styleSchema.safeParse(values.style);
  const placementParsed = placementSchema.safeParse(values.placement);
  const editorParsed = editorSchema.safeParse(values.editor);

  const errors = {};
  for (const result of [shippingParsed, messageParsed, styleParsed, placementParsed, editorParsed]) {
    if (!result.success) Object.assign(errors, formErrors(result.error));
  }
  if (Object.keys(errors).length) {
    return { errors };
  }

  const publishWhen = String(formData.get("publishWhen") || "now");
  const scheduledRaw = String(formData.get("scheduledPublishAt") || "");
  let scheduledPublishAt = values.message.scheduledPublishAt || null;
  let status =
    widget.status === WIDGET_STATUSES.ACTIVE || widget.status === WIDGET_STATUSES.SCHEDULED
      ? widget.status
      : WIDGET_STATUSES.DRAFT;
  let toast = "Widget saved";

  if (intent === "publish") {
    if (publishWhen === "schedule") {
      const when = new Date(scheduledRaw);
      if (!scheduledRaw || Number.isNaN(when.getTime())) {
        return { errors: { form: "Choose a date and time to schedule this widget." } };
      }
      if (when.getTime() <= Date.now()) {
        return { errors: { form: "Scheduled time must be in the future." } };
      }
      scheduledPublishAt = when.toISOString();
      status = WIDGET_STATUSES.SCHEDULED;
      toast = `Scheduled for ${when.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })}`;
    } else {
      scheduledPublishAt = null;
      status = WIDGET_STATUSES.ACTIVE;
      toast = "Widget published";
    }
  }

  try {
    const saved = await saveWidgetEditor(
      merchant.id,
      widget.id,
      {
        ...shippingParsed.data,
        ...messageParsed.data,
        scheduledPublishAt,
        liveNotice: intent === "publish" ? null : values.message.liveNotice || null,
        ...styleParsed.data,
        ...placementParsed.data,
        ...editorParsed.data,
        currentStep: String(formData.get("currentStep") || "conditions"),
        status,
      },
      { returnWidget: intent !== "autosave" },
    );

    if (intent === "publish") {
      await syncCheckoutMetafield(admin, saved);
    }

    if (intent === "autosave") {
      return { silent: true };
    }

    return {
      widget: serializeWidget(saved),
      toast: intent === "publish" ? toast : "Widget saved",
      published: intent === "publish" && status === WIDGET_STATUSES.ACTIVE,
    };
  } catch (error) {
    return {
      errors: { form: error?.message || "Could not save the widget. Try again." },
    };
  }
};

export function shouldRevalidate({ formData, defaultShouldRevalidate }) {
  if (formData?.get("intent") === "autosave") return false;
  return defaultShouldRevalidate;
}

function currentWidget(actionWidget, loaderWidget) {
  if (!actionWidget) return loaderWidget;
  if (!loaderWidget) return actionWidget;
  if (loaderWidget.status === WIDGET_STATUSES.ACTIVE && actionWidget.status === WIDGET_STATUSES.SCHEDULED) {
    return loaderWidget;
  }
  const actionTime = new Date(actionWidget.updatedAt || 0).getTime();
  const loaderTime = new Date(loaderWidget.updatedAt || 0).getTime();
  return actionTime >= loaderTime ? actionWidget : loaderWidget;
}

export default function WidgetEditorRoute() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const shopify = useAppBridge();
  const widget = currentWidget(actionData?.widget, loaderData.widget);

  useEffect(() => {
    if (actionData?.silent) return;
    if (actionData?.toast) shopify.toast.show(actionData.toast);
    if (actionData?.errors) {
      shopify.toast.show("Could not save. Check the highlighted fields.", { isError: true });
    }
  }, [actionData, shopify]);

  return (
    <WidgetWorkspace
      widget={widget}
      errors={actionData?.errors}
      themeEditorUrl={loaderData.themeEditorUrl}
    />
  );
}
