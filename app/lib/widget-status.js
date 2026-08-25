import { WIDGET_STATUSES } from "./constants";

export const SAVE_ACTIONS = {
  DRAFT: "draft",
  SCHEDULE: "schedule",
  PUBLISH: "publish",
};

export function saveActionFromStatus(status) {
  if (status === WIDGET_STATUSES.ACTIVE) return SAVE_ACTIONS.PUBLISH;
  if (status === WIDGET_STATUSES.SCHEDULED) return SAVE_ACTIONS.SCHEDULE;
  return SAVE_ACTIONS.DRAFT;
}

export function toDatetimeLocal(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultScheduleValue(from = new Date()) {
  const date = new Date(from.getTime() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  if (date.getTime() <= Date.now()) date.setHours(date.getHours() + 1);
  return toDatetimeLocal(date.toISOString());
}

export function parseScheduleInput(raw) {
  const when = new Date(raw);
  if (!raw || Number.isNaN(when.getTime())) {
    return { error: "Choose a date and time to schedule this widget." };
  }
  if (when.getTime() <= Date.now()) {
    return { error: "Scheduled time must be in the future." };
  }
  return { when };
}

export function formatScheduleToast(when) {
  return `Scheduled for ${when.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

export function formatScheduleLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function storefrontPageLabel(location) {
  if (location === "CART") return "cart page";
  if (location === "CHECKOUT") return "checkout page";
  return "product page";
}

export function storefrontActionLabel(location) {
  if (location === "CART") return "View cart page";
  if (location === "CHECKOUT") return "View checkout page";
  return "View product page";
}

export function storefrontPageUrl(shop, location, productHandle = "") {
  const handle = String(shop || "").replace(/\.myshopify\.com$/i, "");
  const host = handle.includes(".") ? handle : `${handle}.myshopify.com`;
  if (!handle) return "";
  if (location === "CART") return `https://${host}/cart`;
  if (location === "CHECKOUT") return `https://${host}/checkout`;
  if (productHandle) return `https://${host}/products/${encodeURIComponent(productHandle)}`;
  return `https://${host}`;
}

export function confirmKindForStatus(status) {
  if (status === WIDGET_STATUSES.ACTIVE) return "live";
  if (status === WIDGET_STATUSES.SCHEDULED) return "schedule";
  return "draft";
}

export function resolveEditorStatus({
  intent,
  saveAction,
  publishWhen,
  scheduledRaw, 
  currentStatus,
  currentScheduledAt,
}) {
  if (intent === "autosave") {
    const keep =
      currentStatus === WIDGET_STATUSES.ACTIVE || currentStatus === WIDGET_STATUSES.SCHEDULED;
    return {
      status: keep ? currentStatus : WIDGET_STATUSES.DRAFT,
      scheduledPublishAt: currentScheduledAt || null,
      toast: "Widget saved",
    };
  }

  const action =
    saveAction ||
    (intent === "publish"
      ? publishWhen === "schedule"
        ? SAVE_ACTIONS.SCHEDULE
        : SAVE_ACTIONS.PUBLISH
      : SAVE_ACTIONS.DRAFT);

  if (action === SAVE_ACTIONS.SCHEDULE) {
    const parsed = parseScheduleInput(scheduledRaw);
    if (parsed.error) return { error: parsed.error };
    return {
      status: WIDGET_STATUSES.SCHEDULED,
      scheduledPublishAt: parsed.when.toISOString(),
      toast: formatScheduleToast(parsed.when),
    };
  }

  if (action === SAVE_ACTIONS.PUBLISH) {
    return {
      status: WIDGET_STATUSES.ACTIVE,
      scheduledPublishAt: null,
      toast: currentStatus === WIDGET_STATUSES.ACTIVE ? "Widget saved" : "Widget published",
    };
  }

  return {
    status: WIDGET_STATUSES.DRAFT,
    scheduledPublishAt: null,
    toast: "Widget saved as draft",
  };
}
