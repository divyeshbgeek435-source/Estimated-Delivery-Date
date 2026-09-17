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
import { readJsonField, syncedPlacementIds } from "../lib/form.server";
import {
  acknowledgeLiveNotice,
  findLiveConflicts,
  listLiveProductWidgets,
  resolvePlacementConflict,
  saveWidgetEditor,
  serializeWidget,
} from "../services/widgets/widget.server";
import {
  listDeliveryRequests,
  REQUEST_STATUSES,
  setDeliveryRequestStatus,
} from "../services/widgets/delivery-requests.server";
import { WidgetWorkspace } from "../components/editor/WidgetWorkspace";
import { DEFAULT_STYLE, DEFAULT_WORKING_DAYS, WIDGET_LOCATIONS, WIDGET_STATUSES, WORKING_DAYS } from "../lib/constants";
import { describePlacement, supportsLiveConflict } from "../lib/widget-conflicts";
import { normalizePosition } from "../lib/widget-profiles";
import { confirmKindForStatus, resolveEditorStatus } from "../lib/widget-status";
import { resolveTimeZone } from "../lib/timezone";
import { getCollectionProductHandle } from "../services/shopify/catalog.server";
import { storefrontPageUrl, widgetThemeEditorUrl } from "../lib/theme-editor";
import { queueWidgetStorefrontSync, needsThemeSync } from "../services/shopify/store-block.server";
import { mergeIconLibraries } from "../lib/icon-media";
import { saveMerchantIconLibrary } from "../services/shopify/merchant.server";

async function firstProductHandle(admin, widget) {
  const fromPlacement = widget.placementConfig?.products?.[0]?.handle;
  if (fromPlacement) return fromPlacement;
  const collectionId =
    widget.placementConfig?.collectionIds?.[0] || widget.placementConfig?.collections?.[0]?.id;
  if (admin && collectionId) {
    const fromCollection = await getCollectionProductHandle(admin, collectionId);
    if (fromCollection) return fromCollection;
  }
  if (!admin) return "";
  try {
    const response = await admin.graphql(`#graphql
      query FirstStorefrontProduct {
        products(first: 1, query: "status:active") {
          nodes {
            handle
          }
        }
      }
    `);
    const json = await response.json();
    return json.data?.products?.nodes?.[0]?.handle || "";
  } catch {
    return "";
  }
}

export const loader = async ({ request, params }) => {
  const { admin, widget, shop, merchant } = await requireWidget(request, params.id);
  const [productHandle, deliveryRequests, liveProductWidgets] = await Promise.all([
    firstProductHandle(admin, widget),
    listDeliveryRequests(widget.merchantId, widget.id),
    widget.location === WIDGET_LOCATIONS.PRODUCT
      ? listLiveProductWidgets(merchant.id, { excludeId: widget.id })
      : Promise.resolve([]),
  ]);
  const iconLibrary = mergeIconLibraries(merchant?.iconLibrary, widget.iconConfig?.savedIcons);
  return {
    widget: serializeWidget({
      ...widget,
      iconConfig: {
        ...(widget.iconConfig || {}),
        savedIcons: iconLibrary,
      },
    }),
    iconLibrary,
    deliveryRequests,
    liveProductWidgets: liveProductWidgets.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      placementConfig: item.placementConfig,
      placementLabel: describePlacement(item.placementConfig || {}).label,
    })),
    themeEditorUrl: widgetThemeEditorUrl(shop, widget.location, {
      position: widget.placementConfig?.position,
    }),
    shop,
    storefrontUrl: storefrontPageUrl(shop, widget.location, productHandle),
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
        if (shipping.workingDays == null) return [...DEFAULT_WORKING_DAYS];
        return (shipping.workingDays || []).filter((day) => WORKING_DAYS.includes(day));
      })(),
      blockedDates: shipping.blockedDates || [],
      transitMinDays: shipping.transitMinDays,
      transitMaxDays: shipping.transitMaxDays,
      transitWorkingDays: (() => {
        if (shipping.transitWorkingDays == null) return [...DEFAULT_WORKING_DAYS];
        return (shipping.transitWorkingDays || []).filter((day) => WORKING_DAYS.includes(day));
      })(),
      transitBlockedDates: shipping.transitBlockedDates || [],
      timezone: resolveTimeZone(draft.timezone || widget.timezone),
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
      headingEnabled: message.headingEnabled !== false,
      translations: message.translations || {},
      purchased: icons.purchased,
      processing: icons.processing,
      delivered: icons.delivered,
      headerIcon: icons.headerIcon || "flag",
      headerIconEnabled: icons.headerIconEnabled !== false,
      purchasedEnabled: icons.purchasedEnabled !== false,
      processingEnabled: icons.processingEnabled !== false,
      deliveredEnabled: icons.deliveredEnabled !== false,
      purchasedTitle: icons.purchasedTitle,
      processingTitle: icons.processingTitle,
      deliveredTitle: icons.deliveredTitle,
      purchasedColor: icons.purchasedColor || "",
      processingColor: icons.processingColor || "",
      deliveredColor: icons.deliveredColor || "",
      savedIcons: icons.savedIcons || [],
      scheduledPublishAt: message.scheduledPublishAt || widget.messageConfig?.scheduledPublishAt || null,
      liveNotice: message.liveNotice || widget.messageConfig?.liveNotice || null,
      activationConflict:
        message.activationConflict === null
          ? null
          : message.activationConflict || widget.messageConfig?.activationConflict || null,
    },
    style,
    placement: {
      mode: placement.mode,
      ...syncedPlacementIds(placement),
      products: placement.products || [],
      collections: placement.collections || [],
      position: normalizePosition(widget.location, placement.position),
    },
    editor: {
      name: draft.name || widget.name,
      timezone: resolveTimeZone(draft.timezone || widget.timezone),
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
  const { admin, session, merchant, widget } = await requireWidget(request, params.id, { fast: true });
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save");
  const revision = Number(formData.get("saveRevision") || 0);
  const draft = readJsonField(formData, "editorState", {});
  const values = flattenDraft(widget, draft);

  if (intent === "accept-delivery-request" || intent === "reject-delivery-request") {
    const requestId = String(formData.get("requestId") || "");
    const status = intent === "accept-delivery-request" ? REQUEST_STATUSES.ACCEPTED : REQUEST_STATUSES.REJECTED;
    const saved = await setDeliveryRequestStatus(merchant.id, widget.id, requestId, status);
    const deliveryRequests = await listDeliveryRequests(merchant.id, widget.id);
    if (!saved) return { errors: { form: "Could not update that delivery request." } };
    if (status === REQUEST_STATUSES.ACCEPTED) {
      queueWidgetStorefrontSync(admin, session, saved);
    }
    return {
      widget: serializeWidget(saved),
      deliveryRequests,
      revision,
      toast: status === REQUEST_STATUSES.ACCEPTED ? "Pincode added as an eligible location" : "Delivery request declined",
    };
  }

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

  if (intent === "resolve-conflict") {
    const keepWidgetId = String(formData.get("keepWidgetId") || widget.id);
    const conflictMode = String(formData.get("conflictMode") || "publish");
    try {
      const saved = await resolvePlacementConflict({
        merchantId: merchant.id,
        widgetId: widget.id,
        keepWidgetId,
        placement: values.placement,
        publishNow: conflictMode !== "schedule",
        scheduledPublishAt:
          conflictMode === "schedule"
            ? values.message.scheduledPublishAt || widget.messageConfig?.scheduledPublishAt || null
            : null,
      });
      if (!saved) return { errors: { form: "Could not resolve the placement conflict." } };
      queueWidgetStorefrontSync(admin, session, saved);
      const keptThis = keepWidgetId === widget.id;
      return {
        widget: serializeWidget(saved),
        revision,
        toast: keptThis
          ? conflictMode === "activation"
            ? "Scheduled widget is now live"
            : "Widget published"
          : "Kept the existing live widget",
        confirm: keptThis
          ? {
              kind: confirmKindForStatus(
                conflictMode === "schedule" ? WIDGET_STATUSES.SCHEDULED : WIDGET_STATUSES.ACTIVE,
              ),
              scheduledAt: conflictMode === "schedule" ? values.message.scheduledPublishAt : null,
            }
          : null,
        published: keptThis && conflictMode !== "schedule",
      };
    } catch (error) {
      return { errors: { form: error?.message || "Could not resolve the placement conflict." } };
    }
  }

  if (intent === "unpublish") {
    try {
      const saved = await saveWidgetEditor(merchant.id, widget.id, {
        ...values.shipping,
        ...values.message,
        scheduledPublishAt: null,
        activationConflict: null,
        ...values.style,
        ...values.placement,
        ...values.editor,
        status: WIDGET_STATUSES.DRAFT,
      }, { location: widget.location });
      queueWidgetStorefrontSync(admin, session, saved);
      return { widget: serializeWidget(saved), revision, toast: widget.status === WIDGET_STATUSES.SCHEDULED ? "Schedule cancelled" : "Widget unpublished" };
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

  const resolved = resolveEditorStatus({
    intent,
    saveAction: String(formData.get("saveAction") || ""),
    publishWhen: String(formData.get("publishWhen") || "now"),
    scheduledRaw: String(formData.get("scheduledPublishAt") || ""),
    currentStatus: widget.status,
    currentScheduledAt: values.message.scheduledPublishAt || null,
  });
  if (resolved.error) {
    return { errors: { form: resolved.error } };
  }
  const { status, scheduledPublishAt } = resolved;

  if (
    intent !== "autosave" &&
    supportsLiveConflict(widget.location) &&
    status === WIDGET_STATUSES.ACTIVE
  ) {
    const conflicts = await findLiveConflicts(merchant.id, widget.id, {
      location: widget.location,
      placement: placementParsed.data,
      cartConfig: {
        ...(widget.cartConfig || {}),
        displayMode: values.editor.displayMode || widget.cartConfig?.displayMode,
      },
    });
    if (conflicts.length) {
      try {
        const saved = await saveWidgetEditor(
          merchant.id,
          widget.id,
          {
            ...shippingParsed.data,
            ...messageParsed.data,
            scheduledPublishAt: null,
            activationConflict: null,
            liveNotice: null,
            ...styleParsed.data,
            ...placementParsed.data,
            ...editorParsed.data,
            currentStep: String(formData.get("currentStep") || "conditions"),
            status: WIDGET_STATUSES.DRAFT,
          },
          { location: widget.location },
        );
        if (widget.status === WIDGET_STATUSES.ACTIVE) {
          queueWidgetStorefrontSync(admin, session, saved);
        }
        return {
          widget: serializeWidget(saved),
          revision,
          conflict: {
            mode: "publish",
            location: widget.location,
            widgetId: widget.id,
            widgetName: saved.name || widget.name,
            placementLabel:
              widget.location === WIDGET_LOCATIONS.CART
                ? values.editor.displayMode === "PER_PRODUCT"
                  ? "Cart · Per product"
                  : "Cart page"
                : describePlacement(placementParsed.data).label,
            conflicts,
          },
        };
      } catch (error) {
        return { errors: { form: error?.message || "Could not save the widget. Try again." } };
      }
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
        liveNotice: intent === "autosave" ? values.message.liveNotice || null : null,
        activationConflict:
          status === WIDGET_STATUSES.ACTIVE || status === WIDGET_STATUSES.DRAFT
            ? null
            : values.message.activationConflict || null,
        ...styleParsed.data,
        ...placementParsed.data,
        ...editorParsed.data,
        currentStep: String(formData.get("currentStep") || "conditions"),
        status,
      },
      { returnWidget: intent !== "autosave", location: widget.location },
    );

    await saveMerchantIconLibrary(
      merchant.id,
      mergeIconLibraries(merchant.iconLibrary, messageParsed.data.savedIcons, values.message.savedIcons),
    );

    if (intent === "autosave") {
      return { silent: true, revision };
    }

    if (needsThemeSync(widget, saved)) {
      queueWidgetStorefrontSync(admin, session, saved);
    }

    return {
      widget: serializeWidget(saved),
      revision,
      confirm: {
        kind: confirmKindForStatus(status),
        scheduledAt: scheduledPublishAt,
      },
      published: status === WIDGET_STATUSES.ACTIVE,
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
    if (actionData?.silent || actionData?.confirm || actionData?.conflict) return;
    if (actionData?.toast) shopify.toast.show(actionData.toast);
    if (actionData?.errors) {
      shopify.toast.show("Could not save. Check the highlighted fields.", { isError: true });
    }
  }, [actionData, shopify]);

  return (
    <WidgetWorkspace
      widget={widget}
      errors={actionData?.errors}
      deliveryRequests={actionData?.deliveryRequests || loaderData.deliveryRequests || []}
      liveProductWidgets={loaderData.liveProductWidgets || []}
      conflict={actionData?.conflict || null}
      themeEditorUrl={loaderData.themeEditorUrl}
      shop={loaderData.shop}
      storefrontUrl={loaderData.storefrontUrl}
    />
  );
}
