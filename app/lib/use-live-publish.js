import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
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
    },
  };
}

/**
 * Activates due scheduled widgets on the server and returns the latest
 * Live / Scheduled status without a full page refresh.
 */
export function useLivePublishPoll({ widgetId = null, items = [] }) {
  const fetcher = useFetcher();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
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
      const data = fetcherRef.current.data;
      if (widgetId) {
        return data?.widget?.id === widgetId && data.widget.status !== WIDGET_STATUSES.SCHEDULED;
      }
      if (!data?.widgets) return false;
      return scheduled.every((item) => {
        const next = data.widgets.find((row) => row.id === item.id);
        return next && next.status !== WIDGET_STATUSES.SCHEDULED;
      });
    };

    const load = () => {
      if (document.visibilityState === "hidden") return;
      if (fetcherRef.current.state !== "idle") return;
      if (isCaughtUp()) return;
      const separator = url.includes("?") ? "&" : "?";
      fetcherRef.current.load(`${url}${separator}t=${Date.now()}`);
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
    load();
    const clock = window.setInterval(tick, 1000);
    const backup = window.setInterval(() => {
      const nextDue = Math.min(
        ...scheduled.map((item) => new Date(item.scheduledPublishAt).getTime()).filter(Number.isFinite),
      );
      if (Number.isFinite(nextDue) && nextDue - Date.now() <= 120000) load();
    }, BACKUP_POLL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(clock);
      window.clearInterval(backup);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [widgetId, itemKey]);

  return { data: fetcher.data, now };
}
