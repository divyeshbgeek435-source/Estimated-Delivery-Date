import { useEffect, useRef, useState } from "react";
import { afterPaint } from "./after-paint";
import { loadAdminJson } from "./admin-json";
import { WIDGET_STATUSES } from "./constants";

const BACKUP_POLL_MS = 15000;

export function formatCountdown(ms) {
  if (ms == null || Number.isNaN(ms)) return "";
  if (ms <= 0) return "now";
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function newerTimestamp(left, right) {
  return new Date(left || 0).getTime() - new Date(right || 0).getTime();
}

export function mergeLiveRows(widgets, polled) {
  if (!Array.isArray(polled) || !polled.length) return widgets;
  const byId = new Map(polled.map((row) => [row.id, row]));
  return widgets.map((widget) => {
    const next = byId.get(widget.id);
    if (!next) return widget;
    if (newerTimestamp(widget.updatedAt, next.updatedAt) > 0) return widget;
    return {
      ...widget,
      status: next.status,
      scheduledPublishAt: next.scheduledPublishAt,
      liveNotice: next.liveNotice,
      activationConflict: next.activationConflict,
      updatedAt: next.updatedAt || widget.updatedAt,
    };
  });
}

export function applyLiveStatus(widget, polled) {
  if (!widget || !polled || polled.id !== widget.id) return widget;
  if (newerTimestamp(widget.updatedAt, polled.updatedAt) > 0) return widget;
  return {
    ...widget,
    status: polled.status,
    scheduledPublishAt: polled.scheduledPublishAt,
    updatedAt: polled.updatedAt || widget.updatedAt,
    messageConfig: {
      ...widget.messageConfig,
      scheduledPublishAt: polled.scheduledPublishAt,
      liveNotice: polled.liveNotice,
      activationConflict: polled.activationConflict,
    },
  };
}

/**
 * Activates due scheduled widgets on the server and returns the latest
 * Live / Scheduled status without a full page refresh.
 */
export function useLivePublishPoll({ widgetId = null, items = [] }) {
  const [data, setData] = useState(null);
  const inFlight = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [now, setNow] = useState(() => Date.now());
  const itemKey = items
    .map((item) => `${item.id}:${item.status}:${item.scheduledPublishAt || ""}`)
    .sort()
    .join("|");
  const scheduled = items.filter(
    (item) => item.status === WIDGET_STATUSES.SCHEDULED && item.scheduledPublishAt,
  );

  useEffect(() => {
    if (!scheduled.length) return undefined;

    const url = widgetId
      ? `/app/live-status?widgetId=${encodeURIComponent(widgetId)}`
      : "/app/live-status";

    const isCaughtUp = () => {
      const current = dataRef.current;
      if (widgetId) {
        const row = current?.widget;
        if (!row || row.id !== widgetId) return false;
        if (row.activationConflict?.conflicts?.length) return true;
        return row.status !== WIDGET_STATUSES.SCHEDULED;
      }
      if (!current?.widgets) return false;
      return scheduled.every((item) => {
        const next = current.widgets.find((row) => row.id === item.id);
        if (!next) return false;
        if (next.activationConflict?.conflicts?.length) return true;
        return next.status !== WIDGET_STATUSES.SCHEDULED;
      });
    };

    const load = () => {
      if (document.visibilityState === "hidden") return;
      if (inFlight.current) return;
      if (isCaughtUp()) return;
      const separator = url.includes("?") ? "&" : "?";
      inFlight.current = true;
      loadAdminJson(`${url}${separator}t=${Date.now()}`)
        .then((payload) => {
          if (payload) setData(payload);
        })
        .finally(() => {
          inFlight.current = false;
        });
    };

    const tick = () => {
      const current = Date.now();
      setNow(current);
      const due = scheduled.some((item) => {
        const at = new Date(item.scheduledPublishAt).getTime();
        return Number.isFinite(at) && at <= current;
      });
      if (due) load();
    };

    tick();
    const cancelPaint = afterPaint(() => load());
    const clock = window.setInterval(tick, 1000);
    const backup = window.setInterval(() => {
      const nextDue = Math.min(
        ...scheduled.map((item) => new Date(item.scheduledPublishAt).getTime()).filter(Number.isFinite),
      );
      if (Number.isFinite(nextDue) && nextDue - Date.now() <= 120000) load();
    }, BACKUP_POLL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      cancelPaint();
      window.clearInterval(clock);
      window.clearInterval(backup);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [widgetId, itemKey]);

  return { data, now };
}
