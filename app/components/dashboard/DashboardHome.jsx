import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useNavigate, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { locationLabel, WIDGET_LOCATIONS, WIDGET_STATUSES } from "../../lib/constants";
import {
  clearHomeReturnState,
  homeWidgetAnchorId,
  peekHomeReturnState,
  rememberHomeFocusWidget,
  rememberHomeScroll,
  restoreHomePosition,
} from "../../lib/home-scroll";
import { formatCountdown, mergeLiveRows, useLivePublishPoll } from "../../lib/use-live-publish";
import { ActionButton } from "../common/ActionButton";
import { AppLink } from "../common/AppLink";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { LivePublishedDialog } from "../common/LivePublishedDialog";
import { PlacementConflictDialog } from "../common/PlacementConflictDialog";
import { conflictDialogCopy, widgetApplyToLabel } from "../../lib/widget-conflicts";

const SECTIONS = [
  {
    location: WIDGET_LOCATIONS.PRODUCT,
    heading: "Product page",
    empty: "Show estimated delivery on product pages so shoppers know when their order will arrive.",
  },
  {
    location: WIDGET_LOCATIONS.CART,
    heading: "Cart page",
    empty: "Reassure shoppers at checkout with delivery estimates above the cart totals.",
  },
];

/** Totals refresh cadence — live enough without competing with first paint. */
const HOME_DATA_POLL_MS = 15000;

export function DashboardHome({
  widgets,
  totals: initialTotals = null,
  embedStatus: initialEmbedStatus = null,
  liveNotices = [],
  activationConflicts = [],
  themeEditorEmbed,
  saving,
  error,
  actionData,
}) {
  const requestsFetcher = useFetcher();
  const totalsFetcher = useFetcher();
  const requestsRef = useRef(requestsFetcher);
  const totalsRef = useRef(totalsFetcher);
  requestsRef.current = requestsFetcher;
  totalsRef.current = totalsFetcher;
  const embed = useEmbedStatus(themeEditorEmbed, initialEmbedStatus);
  const [liveTotals, setLiveTotals] = useState(() => initialTotals);
  const deliveryRequests = requestsFetcher.data?.deliveryRequests || [];
  const requestsReady = requestsFetcher.data != null;
  const totalsReady = initialTotals != null || totalsFetcher.data?.totals != null;

  useEffect(() => {
    if (initialTotals?.impressions != null) {
      setLiveTotals((current) =>
        current?.impressions === initialTotals.impressions ? current : initialTotals,
      );
    }
  }, [initialTotals?.impressions]);

  useEffect(() => {
    const next = totalsFetcher.data?.totals;
    if (!next || totalsFetcher.state !== "idle") return;
    setLiveTotals((current) => {
      if (!current) return next;
      if (current.impressions === next.impressions) return current;
      return next;
    });
  }, [totalsFetcher.state, totalsFetcher.data]);

  useEffect(() => {
    requestsRef.current.load(`/app/home-data?part=requests&t=${Date.now()}`);
  }, [actionData]);

  useEffect(() => {
    const refreshTotals = ({ fresh = false } = {}) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const fetcher = totalsRef.current;
      // Allow overlap only when idle so we never stall the live counter.
      if (fetcher.state !== "idle") return;
      const qs = fresh ? "fresh=1&" : "";
      fetcher.load(`/app/home-data?part=totals&${qs}t=${Date.now()}`);
    };

    // Prefer cached totals on first paint; refresh in the background without busting cache.
    refreshTotals({ fresh: false });
    const timer = window.setInterval(() => refreshTotals({ fresh: false }), HOME_DATA_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshTotals({ fresh: true });
    };
    const onFocus = () => refreshTotals({ fresh: true });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const totals = liveTotals || initialTotals || { impressions: 0 };

  const submit = useSubmit();
  const livePoll = useLivePublishPoll({ items: widgets });
  const [acked, setAcked] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletedNotice, setDeletedNotice] = useState(null);
  const [conflict, setConflict] = useState(null);
  const seenDelete = useRef("");
  const seenConflict = useRef("");
  const rows = mergeLiveRows(widgets, livePoll.data?.widgets);
  const notices = (livePoll.data?.liveNotices ?? liveNotices).filter(
    (notice) => !acked.has(`${notice.id}:${notice.at || ""}`),
  );
  const polledActivationConflicts =
    livePoll.data?.activationConflicts ?? activationConflicts;
  const checkoutItems = rows.filter((widget) => widget.location === WIDGET_LOCATIONS.CHECKOUT);
  const deleting = Boolean(saving && pendingDelete);

  useEffect(() => {
    if (!actionData?.conflict) return;
    const key = `publish:${actionData.conflict.widgetId}:${actionData.conflict.conflicts?.[0]?.id || ""}`;
    if (seenConflict.current === key) return;
    seenConflict.current = key;
    setConflict(actionData.conflict);
  }, [actionData]);

  useEffect(() => {
    if (conflict || !polledActivationConflicts?.length) return;
    const next = polledActivationConflicts[0];
    const key = `activation:${next.id}:${next.dueAt || ""}`;
    if (seenConflict.current === key) return;
    seenConflict.current = key;
    setConflict({
      mode: "activation",
      location: next.location || null,
      widgetId: next.id,
      widgetName: next.name,
      placementLabel: null,
      conflicts: next.conflicts || [],
    });
  }, [polledActivationConflicts, conflict]);

  useEffect(() => {
    if (actionData?.conflictResolved) setConflict(null);
  }, [actionData?.conflictResolved]);
  const liveCount = rows.filter((widget) => widget.status === WIDGET_STATUSES.ACTIVE).length;
  const scheduledCount = rows.filter((widget) => widget.status === WIDGET_STATUSES.SCHEDULED).length;
  const pendingRequests = deliveryRequests.filter((item) => item.status === "PENDING");
  const hasWidgets = rows.some((widget) => widget.location !== WIDGET_LOCATIONS.CHECKOUT);

  useEffect(() => {
    if (actionData?.error) setPendingDelete(null);
    if (!actionData?.deleted) return;
    const key = String(actionData.deletedAt || actionData.deletedName);
    if (seenDelete.current === key) return;
    seenDelete.current = key;
    setPendingDelete(null);
    setDeletedNotice({
      name: actionData.deletedName || "Widget",
      count: actionData.deletedCount || 1,
    });
  }, [actionData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("widget");
    if (fromQuery) rememberHomeFocusWidget(fromQuery);

    const stored = peekHomeReturnState();
    const widgetId = fromQuery || stored.widgetId;
    restoreHomePosition({
      widgetId,
      scrollY: stored.scrollY,
      onDone: clearHomeReturnState,
    });

    if (fromQuery) {
      params.delete("widget");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", next);
    }
  }, []);

  useEffect(() => {
    return () => rememberHomeScroll();
  }, []);

  return (
    <s-page heading="Estimated delivery">
      <ActionButton
        slot="primary-action"
        variant="primary"
        icon="plus"
        to="/app/widgets/new"
        onClick={() => rememberHomeScroll()}
        {...(saving ? { loading: true } : {})}
      >
        Create widget
      </ActionButton>

      {error ? <s-banner tone="critical">{error}</s-banner> : null}

      {!error && embed.enabled === false && !embed.missingThemeAccess ? (
        <s-banner tone="warning" heading="App embed is off">
          Widgets won’t show on your storefront until you turn on Estimated delivery embed in the theme editor, then
          click Save.
        </s-banner>
      ) : null}

      {!error && embed.missingThemeAccess ? (
        <s-banner tone="warning" heading="Theme access needed">
          Allow theme access so the app can detect whether the embed is on. Then turn on Estimated delivery embed and
          Save in the theme editor.
        </s-banner>
      ) : null}

      <div className="edd-page">
      <s-stack gap="large">
        <OverviewMetrics
          liveCount={liveCount}
          scheduledCount={scheduledCount}
          widgetCount={rows.length}
          impressions={totals.impressions || 0}
          impressionsReady={totalsReady}
          pendingCount={pendingRequests.length}
          embed={embed}
          fallbackEmbedUrl={themeEditorEmbed}
        />

        {!hasWidgets ? (
          <GettingStartedCard />
        ) : (
          SECTIONS.map((section) => {
            const items = rows.filter((widget) => widget.location === section.location);
            return (
              <WidgetList
                key={section.location}
                heading={section.heading}
                empty={section.empty}
                location={section.location}
                widgets={items}
                now={livePoll.now}
                onRequestDelete={setPendingDelete}
              />
            );
          })
        )}

        {checkoutItems.length ? (
          <WidgetList
            heading="Checkout (legacy)"
            empty="Checkout widgets are no longer available. Unpublish or delete any leftovers."
            location={WIDGET_LOCATIONS.CHECKOUT}
            widgets={checkoutItems}
            now={livePoll.now}
            onRequestDelete={setPendingDelete}
            hideCreate
          />
        ) : null}

        <DeliveryRequestsList
          requests={deliveryRequests}
          pendingCount={pendingRequests.length}
          saving={saving}
          ready={requestsReady}
          refreshing={requestsFetcher.state !== "idle"}
          onRefresh={() => {
            if (requestsFetcher.state === "idle") {
              requestsFetcher.load(`/app/home-data?part=requests&t=${Date.now()}`);
            }
          }}
        />
      </s-stack>
      </div>

      <LivePublishedDialog
        notices={notices}
        onDismiss={(widgetId) => {
          const notice = notices.find((item) => item.id === widgetId);
          setAcked((current) => new Set(current).add(`${widgetId}:${notice?.at || ""}`));
          submit({ widgetId, intent: "ack-live" }, { method: "post" });
        }}
      />
      <PlacementConflictDialog
        open={Boolean(conflict)}
        title={
          conflictDialogCopy(
            conflict?.location,
            conflict?.mode === "activation" ? "activation" : "publish",
          ).title
        }
        body={
          conflictDialogCopy(
            conflict?.location,
            conflict?.mode === "activation" ? "activation" : "publish",
          ).body
        }
        candidate={{
          id: conflict?.widgetId,
          name: conflict?.widgetName || "This widget",
          placementLabel: conflict?.placementLabel || "This widget",
        }}
        conflicts={conflict?.conflicts || []}
        confirming={saving}
        onCancel={() => setConflict(null)}
        onChoose={(keepWidgetId) => {
          if (!conflict?.widgetId || saving || !keepWidgetId) return;
          submit(
            {
              widgetId: conflict.widgetId,
              intent: "resolve-conflict",
              keepWidgetId,
              conflictMode: conflict.mode || "publish",
            },
            { method: "post" },
          );
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tone="danger"
        title="Delete this widget?"
        body={
          <>
            <strong>{pendingDelete?.name || "This widget"}</strong> will be removed from your storefront, along with its
            settings and analytics. This cannot be undone.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm"
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete || deleting) return;
          submit({ widgetId: pendingDelete.id, intent: "delete" }, { method: "post" });
        }}
      />
      <ConfirmDialog
        open={Boolean(deletedNotice) && !pendingDelete}
        tone="success"
        title="Widget deleted"
        body={
          deletedNotice?.count > 1
            ? `${deletedNotice.count} widgets were deleted.`
            : (
              <>
                <strong>{deletedNotice?.name || "Widget"}</strong> was deleted successfully.
              </>
            )
        }
        confirmLabel="Done"
        hideCancel
        onCancel={() => setDeletedNotice(null)}
        onConfirm={() => setDeletedNotice(null)}
      />
    </s-page>
  );
}

function OverviewMetrics({
  liveCount,
  scheduledCount,
  widgetCount,
  impressions,
  impressionsReady,
  pendingCount,
  embed,
  fallbackEmbedUrl,
}) {
  const embedRefreshing = embed.refreshing || (embed.enabled == null && !embed.missingThemeAccess);
  const embedLabel = embedRefreshing
    ? "Checking…"
    : embed.missingThemeAccess
      ? "Needs access"
      : embed.enabled
        ? "Active"
        : "Off";
  const widgetsHelp =
    scheduledCount > 0
      ? `${liveCount} live · ${scheduledCount} scheduled · ${widgetCount} total`
      : `${liveCount} live · ${widgetCount} total`;

  return (
    <s-section heading="Store overview">
      <div className="edd-metrics-grid">
        <article className="edd-metric-card">
          <div className="edd-metric-card__head">
            <h3 className="edd-metric-card__label">Live widgets</h3>
            <span className="edd-metric-card__icon edd-metric-card__icon--green" aria-hidden="true">
              <s-icon type="product" />
            </span>
          </div>
          <p className="edd-metric-card__value">{liveCount}</p>
          <p className="edd-metric-card__help">{widgetsHelp}</p>
        </article>

        <article className="edd-metric-card">
          <div className="edd-metric-card__head">
            <h3 className="edd-metric-card__label">Impressions</h3>
            <span className="edd-metric-card__icon edd-metric-card__icon--teal" aria-hidden="true">
              <s-icon type="data-presentation" />
            </span>
          </div>
          {impressionsReady ? (
            <p className="edd-metric-card__value" key={impressions}>
              {impressions.toLocaleString()}
            </p>
          ) : (
            <div className="edd-metric-card__loading">
              <s-spinner size="base" accessibilityLabel="Loading impressions" />
              <span>Loading</span>
            </div>
          )}
          <p className="edd-metric-card__help">Last 30 days</p>
        </article>

        <a href="#delivery-requests" className="edd-metric-card">
          <div className="edd-metric-card__head">
            <h3 className="edd-metric-card__label">Delivery requests</h3>
            <span className="edd-metric-card__icon edd-metric-card__icon--amber">
              <s-icon type="delivery" />
            </span>
          </div>
          <p className="edd-metric-card__value">{pendingCount}</p>
          <p className="edd-metric-card__help">
            {pendingCount ? "Needs review" : "No pending requests"}
          </p>
        </a>

        <article className={`edd-metric-card${embed.enabled ? " edd-metric-card--ok" : ""}`}>
          <div className="edd-metric-card__head">
            <h3 className="edd-metric-card__label">App embed</h3>
            <span className="edd-metric-card__icon edd-metric-card__icon--slate" aria-hidden="true">
              <s-icon type="desktop" />
            </span>
          </div>
          <p className="edd-metric-card__value edd-metric-card__value--status">{embedLabel}</p>
          {embed.enabled ? (
            <p className="edd-metric-card__help edd-metric-card__help--action">
              <button
                type="button"
                className="edd-metric-card__text-link"
                onClick={() => {
                  const url = embed.manageUrl || fallbackEmbedUrl;
                  if (!url) return;
                  embed.markEditorOpened?.();
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                Manage in Theme Editor
              </button>
            </p>
          ) : embed.missingThemeAccess ? (
            !embedRefreshing ? (
              <div className="edd-metric-card__actions">
                <span
                  className="edd-tooltip edd-tooltip--above"
                  data-tooltip="Allow theme access so the app can check whether the embed is on."
                >
                  <ActionButton variant="primary" onClick={() => embed.requestAccess?.()}>
                    Allow theme access
                  </ActionButton>
                </span>
              </div>
            ) : null
          ) : !embedRefreshing ? (
            <div className="edd-metric-card__actions">
              <span
                className="edd-tooltip edd-tooltip--above"
                data-tooltip="Turn on the embed, then Save in the theme editor"
              >
                <ActionButton
                  variant="primary"
                  onClick={() => {
                    const url = embed.activateUrl || fallbackEmbedUrl;
                    if (!url) return;
                    embed.markEditorOpened?.();
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  Open theme editor
                </ActionButton>
              </span>
            </div>
          ) : null}
        </article>
      </div>
    </s-section>
  );
}

function GettingStartedCard() {
  return (
    <s-section padding="base">
      <s-empty-state heading="Get delivery dates on your store">
        <s-icon slot="graphic" type="delivery" />
        <s-text slot="subheading">
          Create a product or cart widget, set your shipping rules, then publish. Shoppers see a clear estimated arrival
          date before they buy.
        </s-text>
        <ActionButton slot="primary-action" variant="primary" icon="plus" to="/app/widgets/new">
          Create your first widget
        </ActionButton>
      </s-empty-state>
      <s-box paddingBlockStart="base">
        <s-ordered-list>
          <s-list-item>Create a widget for product or cart pages</s-list-item>
          <s-list-item>Set locations, shipping time, and message style</s-list-item>
          <s-list-item>Publish — and keep the app embed on</s-list-item>
        </s-ordered-list>
      </s-box>
    </s-section>
  );
}

function useEmbedStatus(fallbackEmbedUrl, initialStatus = null) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestedScope = useRef(false);
  const openedEditor = useRef(false);
  const [refreshing, setRefreshing] = useState(!initialStatus);
  const [bridgeEnabled, setBridgeEnabled] = useState(null);

  const readBridgeEmbedStatus = async () => {
    try {
      const extensions = await shopify?.app?.extensions?.();
      if (!Array.isArray(extensions)) return null;
      for (const extension of extensions) {
        if (extension?.type !== "theme_app_extension") continue;
        const blocks = Array.isArray(extension.activations) ? extension.activations : [];
        const embed = blocks.find(
          (block) =>
            block?.handle === "app-embed" ||
            block?.target === "body" ||
            /estimated delivery/i.test(String(block?.name || "")),
        );
        if (!embed) continue;
        // App Bridge: active = on in published theme; available = installed but Off.
        return embed.status === "active";
      }
      return false;
    } catch {
      return null;
    }
  };

  const refreshBridge = async () => {
    const enabled = await readBridgeEmbedStatus();
    if (enabled != null) setBridgeEnabled(enabled);
    return enabled;
  };

  const requestThemeAccess = async () => {
    try {
      const current = await shopify.scopes?.query?.();
      const granted = current?.granted || [];
      const needed = ["read_themes", "write_themes"].filter((scope) => !granted.includes(scope));
      if (needed.length) {
        await shopify.scopes.request(needed);
      }
    } catch {
      // Continue and re-check with whatever access the session has.
    }
    requestedScope.current = true;
    if (fetcherRef.current.state === "idle") {
      setRefreshing(true);
      fetcherRef.current.load("/app/embed-status?fresh=1");
    }
    await refreshBridge();
  };

  const loadStatus = (showRefreshing, { fresh = false } = {}) => {
    if (fetcherRef.current.state !== "idle") return;
    if (showRefreshing) setRefreshing(true);
    fetcherRef.current.load(fresh ? "/app/embed-status?fresh=1" : "/app/embed-status");
    void refreshBridge();
  };

  useEffect(() => {
    void refreshBridge();
    // Initial status comes from the page loader — only refetch in the background.
    if (!initialStatus) {
      loadStatus(true, { fresh: true });
    } else if (initialStatus.missingThemeAccess && !requestedScope.current) {
      // Ask for theme scopes without blocking the first paint.
      window.setTimeout(() => {
        requestThemeAccess();
      }, 0);
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      openedEditor.current = false;
      // Always re-read when returning so Off/On matches Theme Editor.
      loadStatus(false, { fresh: true });
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadStatus(false, { fresh: true });
    }, 15000);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [initialStatus]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data != null) setRefreshing(false);
  }, [fetcher.state, fetcher.data]);

  const data = fetcher.data || initialStatus;
  // Prefer App Bridge (published-theme activation). Fall back to settings_data parse.
  const enabled = bridgeEnabled != null ? bridgeEnabled : data?.appEmbedEnabled;

  return {
    refreshing: refreshing && enabled == null && data == null,
    enabled,
    missingThemeAccess: Boolean(data?.missingThemeAccess),
    activateUrl: data?.themeEditorEmbed || fallbackEmbedUrl,
    manageUrl: data?.themeEditorEmbedManage || fallbackEmbedUrl,
    reload: (fresh = false) => loadStatus(true, { fresh }),
    requestAccess: requestThemeAccess,
    markEditorOpened: () => {
      openedEditor.current = true;
    },
  };
}

function formatRequestWhen(value) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function requestStatusLabel(status) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

const REQUESTS_PAGE_SIZE = 5;

const REQUEST_TABLE_COLUMNS = [
  { key: "widget", label: "Widget", listSlot: "primary" },
  { key: "pincode", label: "Pincode", listSlot: "labeled" },
  { key: "requested", label: "Requested", listSlot: "labeled" },
  { key: "status", label: "Status", listSlot: "kicker" },
];

function requestStatusRank(status) {
  if (status === "PENDING") return 0;
  if (status === "ACCEPTED") return 1;
  if (status === "REJECTED") return 2;
  return 3;
}

function requestSortValue(item, key) {
  switch (key) {
    case "widget":
      return String(item.widgetName || "").trim().toLowerCase() || "untitled widget";
    case "pincode":
      return String(item.pincode || "");
    case "requested":
      return new Date(item.createdAt || 0).getTime() || 0;
    case "status":
      return requestStatusRank(item.status);
    default:
      return "";
  }
}

function compareRequestRows(a, b, sortKey, sortDir) {
  const left = requestSortValue(a, sortKey);
  const right = requestSortValue(b, sortKey);
  let result = 0;
  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }
  return sortDir === "asc" ? result : -result;
}

function DeliveryRequestsList({
  requests = [],
  pendingCount = 0,
  saving,
  ready = false,
  refreshing = false,
  onRefresh,
}) {
  const submit = useSubmit();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const act = (item, intent) => {
    submit({ intent, requestId: item.id, widgetId: item.widgetId }, { method: "post" });
  };
  const sorted = useMemo(() => {
    const rows = [...requests];
    if (!sortKey) {
      return rows.sort((a, b) => {
        const byStatus = requestStatusRank(a.status) - requestStatusRank(b.status);
        if (byStatus) return byStatus;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }
    return rows.sort((a, b) => compareRequestRows(a, b, sortKey, sortDir));
  }, [requests, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / REQUESTS_PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [requests.length, sortKey, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = sorted.slice((page - 1) * REQUESTS_PAGE_SIZE, page * REQUESTS_PAGE_SIZE);
  const pages = homePageList(totalPages, page);
  const showPagination = totalPages > 1;
  const showInitialLoad = !ready && refreshing;

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <s-section id="delivery-requests">
      <div className="edd-section-toolbar">
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-icon type="delivery" />
          <h2 className="edd-section-toolbar__title">Delivery requests</h2>
          {pendingCount > 0 ? (
            <s-badge tone="warning" color="base" size="base">
              {pendingCount} pending
            </s-badge>
          ) : null}
        </s-stack>
        <ActionButton
          variant="secondary"
          icon="refresh"
          disabled={refreshing || saving}
          {...(refreshing ? { loading: true } : {})}
          onClick={() => onRefresh?.()}
        >
          Refresh
        </ActionButton>
      </div>

      <p className="edd-section-help">
        When a shopper asks for delivery to a pincode you don’t cover yet, their request shows up here.
      </p>

      {showInitialLoad ? (
        <s-box padding="base" background="subdued" borderRadius="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-spinner size="base" accessibilityLabel="Loading delivery requests" />
            <s-text color="subdued">Loading requests…</s-text>
          </s-stack>
        </s-box>
      ) : sorted.length ? (
        <div className="edd-request-panel">
          <s-table variant="auto" className="edd-request-table">
            <s-table-header-row>
              {REQUEST_TABLE_COLUMNS.map((column) => (
                <HomeSortableHeader
                  key={column.key}
                  column={column}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
              ))}
            </s-table-header-row>
            <s-table-body>
              {pageRows.map((item) => {
                const pending = item.status === "PENDING";
                const status = String(item.status || "PENDING").toLowerCase();
                const when = formatRequestWhen(item.createdAt);
                const widgetName = String(item.widgetName || "").trim() || "Untitled widget";
                return (
                  <s-table-row
                    key={item.id}
                    className={`edd-request-row edd-request-row--${status}`}
                  >
                    <s-table-cell>
                      <span className="edd-request-card__widget" title={widgetName}>
                        {widgetName}
                      </span>
                    </s-table-cell>
                    <s-table-cell>
                      <span className="edd-request-card__pin">{item.pincode}</span>
                    </s-table-cell>
                    <s-table-cell>
                      {when ? (
                        <span className="edd-request-card__when">
                          <s-icon type="clock" />
                          {when}
                        </span>
                      ) : (
                        <span className="edd-request-muted">—</span>
                      )}
                    </s-table-cell>
                    <s-table-cell className="edd-table-actions-cell">
                      <div className="edd-request-status-cell">
                        {pending ? (
                          <div className="edd-table-actions edd-request-actions">
                            <button
                              type="button"
                              className="edd-btn edd-btn--primary"
                              disabled={saving}
                              onClick={() => act(item, "accept-delivery-request")}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="edd-btn"
                              disabled={saving}
                              onClick={() => act(item, "reject-delivery-request")}
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className={`edd-request-status edd-request-status--${status}`}>
                            <s-icon
                              type={status === "accepted" ? "check-circle" : "x-circle"}
                            />
                            {requestStatusLabel(item.status)}
                          </span>
                        )}
                      </div>
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>

          {showPagination ? (
            <nav className="edd-table-pagination" aria-label="Delivery requests pagination">
              <button
                type="button"
                className="edd-btn edd-table-pagination__nav"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <div className="edd-table-pagination__pages">
                {pages.map((pageNumber, index) => {
                  const previous = pages[index - 1];
                  const gap = previous != null && pageNumber - previous > 1;
                  return (
                    <span key={pageNumber} className="edd-table-pagination__page-wrap">
                      {gap ? <span className="edd-table-pagination__ellipsis">…</span> : null}
                      <button
                        type="button"
                        className={`edd-table-pagination__page${
                          pageNumber === page ? " edd-table-pagination__page--active" : ""
                        }`}
                        aria-current={pageNumber === page ? "page" : undefined}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                className="edd-btn edd-table-pagination__nav"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>
      ) : (
        <div className="edd-request-empty">
          <s-empty-state heading="No delivery requests yet">
            <s-text slot="subheading">
              Requests appear when customers ask about delivery to an unavailable pincode.
            </s-text>
          </s-empty-state>
        </div>
      )}
    </s-section>
  );
}

function WidgetList({ heading, empty, location, widgets, now, onRequestDelete, hideCreate = false }) {
  const canCreate = !(hideCreate || location === WIDGET_LOCATIONS.CHECKOUT);
  const sectionIcon = location === WIDGET_LOCATIONS.CART ? "cart" : "product";
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const mapped = widgets.map((widget) => {
      const applyTo = widget.applyToLabel || widgetApplyToLabel(widget);
      const statusText = homeWidgetStatusLabel(widget, now);
      return { widget, applyTo, statusText };
    });

    const filtered = needle
      ? mapped.filter(({ widget, applyTo, statusText }) => {
          const haystack = [widget.name, locationLabel(widget.location), applyTo, statusText]
            .join(" ")
            .toLowerCase();
          return haystack.includes(needle);
        })
      : mapped;

    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => compareHomeRows(a, b, sortKey, sortDir));
  }, [widgets, query, sortKey, sortDir, now]);

  const totalPages = Math.max(1, Math.ceil(rows.length / HOME_TABLE_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, sortKey, sortDir, widgets.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = rows.slice((page - 1) * HOME_TABLE_PAGE_SIZE, page * HOME_TABLE_PAGE_SIZE);
  const pages = homePageList(totalPages, page);
  const showPagination = totalPages > 1;

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <s-section>
      <div className="edd-section-toolbar">
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-icon type={sectionIcon} />
          <h2 className="edd-section-toolbar__title">{heading}</h2>
          {widgets.length ? (
            <s-badge color="base" size="base">
              {widgets.length}
            </s-badge>
          ) : null}
        </s-stack>
        {canCreate ? (
          <ActionButton
            variant="secondary"
            icon="plus"
            to="/app/widgets/new"
            onClick={() => rememberHomeScroll()}
          >
            Create
          </ActionButton>
        ) : null}
      </div>

      {widgets.length ? (
        <div className="edd-widget-table">
          <div className="edd-widget-table__filters">
            <label className="edd-widget-table__search">
              <span className="edd-widget-table__search-label">Search</span>
              <input
                type="search"
                className="edd-widget-table__search-input"
                value={query}
                placeholder="Search by name, apply to, or status"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <s-table variant="auto" className="edd-home-widget-table">
            <s-table-header-row>
              {HOME_TABLE_COLUMNS.map((column) => (
                <HomeSortableHeader
                  key={column.key}
                  column={column}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
              ))}
            </s-table-header-row>
            <s-table-body>
              {pageRows.length ? (
                pageRows.map(({ widget, applyTo, statusText }) => {
                  const published = widget.status === WIDGET_STATUSES.ACTIVE;
                  const scheduled = widget.status === WIDGET_STATUSES.SCHEDULED;
                  const hasActivationConflict = Boolean(widget.activationConflict?.conflicts?.length);
                  return (
                    <s-table-row
                      key={widget.id}
                      id={homeWidgetAnchorId(widget.id)}
                      className="edd-home-widget-row"
                    >
                      <s-table-cell>
                        <AppLink
                          to={`/app/widgets/${widget.id}?tab=conditions`}
                          onClick={() => {
                            rememberHomeScroll();
                            rememberHomeFocusWidget(widget.id);
                          }}
                        >
                          {widget.name}
                        </AppLink>
                      </s-table-cell>
                      <s-table-cell>{locationLabel(widget.location)}</s-table-cell>
                      <s-table-cell>
                        <span className="edd-apply-to" title={applyTo}>
                          {applyTo}
                        </span>
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge
                          tone={
                            published
                              ? "success"
                              : hasActivationConflict
                                ? "warning"
                                : scheduled
                                  ? "info"
                                  : "neutral"
                          }
                          {...(published
                            ? { icon: "check-circle" }
                            : hasActivationConflict
                              ? { icon: "alert-triangle" }
                              : scheduled
                                ? { icon: "clock" }
                                : {})}
                        >
                          {statusText}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell className="edd-table-actions-cell">
                        <div className="edd-table-actions">
                          <WidgetActions
                            widget={widget}
                            published={published}
                            scheduled={scheduled}
                            onRequestDelete={onRequestDelete}
                          />
                        </div>
                      </s-table-cell>
                    </s-table-row>
                  );
                })
              ) : (
                <s-table-row>
                  <s-table-cell>
                    {query.trim() ? "No widgets match your search." : `No ${heading.toLowerCase()} widgets.`}
                  </s-table-cell>
                  <s-table-cell>—</s-table-cell>
                  <s-table-cell>—</s-table-cell>
                  <s-table-cell>—</s-table-cell>
                  <s-table-cell>—</s-table-cell>
                </s-table-row>
              )}
            </s-table-body>
          </s-table>

          {showPagination ? (
            <nav className="edd-table-pagination" aria-label={`${heading} pagination`}>
              <button
                type="button"
                className="edd-btn edd-table-pagination__nav"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <div className="edd-table-pagination__pages">
                {pages.map((pageNumber, index) => {
                  const previous = pages[index - 1];
                  const gap = previous != null && pageNumber - previous > 1;
                  return (
                    <span key={pageNumber} className="edd-table-pagination__page-wrap">
                      {gap ? <span className="edd-table-pagination__ellipsis">…</span> : null}
                      <button
                        type="button"
                        className={`edd-table-pagination__page${
                          pageNumber === page ? " edd-table-pagination__page--active" : ""
                        }`}
                        aria-current={pageNumber === page ? "page" : undefined}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                className="edd-btn edd-table-pagination__nav"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>
      ) : (
        <s-box padding="base" border="base" borderRadius="base" background="subdued">
          <s-empty-state heading={`No ${heading.toLowerCase()} widgets`}>
            <s-icon slot="graphic" type={sectionIcon} />
            <s-text slot="subheading">{empty}</s-text>
            {canCreate ? (
              <ActionButton
                slot="primary-action"
                variant="primary"
                icon="plus"
                to="/app/widgets/new"
                onClick={() => rememberHomeScroll()}
              >
                Create
              </ActionButton>
            ) : null}
          </s-empty-state>
        </s-box>
      )}
    </s-section>
  );
}

const HOME_TABLE_PAGE_SIZE = 5;

const HOME_TABLE_COLUMNS = [
  { key: "name", label: "Name", listSlot: "primary" },
  { key: "location", label: "Location", listSlot: "labeled" },
  { key: "applyTo", label: "Apply to", listSlot: "labeled" },
  { key: "status", label: "Status", listSlot: "labeled" },
  { key: "actions", label: "Actions", listSlot: "kicker", format: "numeric", sortable: false },
];

function homeWidgetStatusLabel(widget, now) {
  const published = widget.status === WIDGET_STATUSES.ACTIVE;
  const scheduled = widget.status === WIDGET_STATUSES.SCHEDULED;
  const hasActivationConflict = Boolean(widget.activationConflict?.conflicts?.length);
  const remainingMs =
    scheduled && widget.scheduledPublishAt
      ? new Date(widget.scheduledPublishAt).getTime() - now
      : null;
  const countdown = formatCountdown(remainingMs);
  if (published) return "Live";
  if (hasActivationConflict) return "Needs attention";
  if (scheduled) {
    if (remainingMs != null && remainingMs <= 0) return "Going live";
    if (countdown && countdown !== "now") return `Scheduled · ${countdown}`;
    return "Scheduled";
  }
  if (widget.status === "DRAFT") return "Draft";
  return "Unpublished";
}

function homeSortValue(row, key) {
  switch (key) {
    case "name":
      return String(row.widget.name || "").toLowerCase();
    case "location":
      return locationLabel(row.widget.location).toLowerCase();
    case "applyTo":
      return String(row.applyTo || "").toLowerCase();
    case "status":
      return String(row.statusText || "").toLowerCase();
    default:
      return "";
  }
}

function compareHomeRows(a, b, sortKey, sortDir) {
  const left = homeSortValue(a, sortKey);
  const right = homeSortValue(b, sortKey);
  const result = String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return sortDir === "asc" ? result : -result;
}

function homePageList(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

function HomeSortableHeader({ column, sortKey, sortDir, onSort }) {
  if (column.sortable === false) {
    return (
      <s-table-header listSlot={column.listSlot} {...(column.format ? { format: column.format } : {})}>
        {column.label}
      </s-table-header>
    );
  }

  const active = sortKey === column.key;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  return (
    <s-table-header
      listSlot={column.listSlot}
      {...(column.format ? { format: column.format } : {})}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        className={`edd-table-sort${active ? " edd-table-sort--active" : ""}`}
        onClick={() => onSort(column.key)}
        aria-label={`Sort by ${column.label}${active ? `, ${sortDir === "asc" ? "ascending" : "descending"}` : ""}`}
      >
        <span>{column.label}</span>
        <span className="edd-table-sort__icon" aria-hidden="true">
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </s-table-header>
  );
}

function WidgetActions({ widget, published, scheduled, onRequestDelete }) {
  const submit = useSubmit();
  const navigate = useNavigate();
  const menuId = `widget-actions-${widget.id}`;

  const run = (intent) => {
    submit({ widgetId: widget.id, intent }, { method: "post" });
  };

  const openEditor = () => {
    rememberHomeScroll();
    rememberHomeFocusWidget(widget.id);
    navigate(`/app/widgets/${widget.id}?tab=conditions`);
  };

  return (
    <>
      <ActionButton variant="secondary" onClick={openEditor}>
        Edit
      </ActionButton>
      <s-button
        commandFor={menuId}
        icon="menu-horizontal"
        variant="tertiary"
        accessibilityLabel={`More actions for ${widget.name}`}
      />
      <s-menu id={menuId} accessibilityLabel={`More actions for ${widget.name}`}>
        {widget.location === WIDGET_LOCATIONS.CHECKOUT ? null : (
          <ActionButton icon="duplicate" variant="tertiary" onClick={() => run("duplicate")}>
            Duplicate
          </ActionButton>
        )}
        {scheduled ? (
          <>
            <ActionButton icon="enabled" variant="tertiary" onClick={() => run("activate")}>
              Publish now
            </ActionButton>
            <ActionButton icon="disabled" variant="tertiary" onClick={() => run("deactivate")}>
              Cancel schedule
            </ActionButton>
          </>
        ) : (
          <ActionButton
            icon={published ? "disabled" : "enabled"}
            variant="tertiary"
            onClick={() => run(published ? "deactivate" : "activate")}
          >
            {published ? "Unpublish" : "Publish"}
          </ActionButton>
        )}
        <ActionButton
          icon="delete"
          variant="tertiary"
          tone="critical"
          onClick={() => onRequestDelete?.(widget)}
        >
          Delete
        </ActionButton>
      </s-menu>
    </>
  );
}
