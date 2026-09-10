import { useEffect, useRef, useState } from "react";
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

/** Totals refresh cadence — keep a live feel without hammering the API. */
const HOME_DATA_POLL_MS = 5000;

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
  const [liveTotals, setLiveTotals] = useState(() => initialTotals || { impressions: 0 });
  const deliveryRequests = requestsFetcher.data?.deliveryRequests || [];
  const requestsReady = requestsFetcher.data != null;
  const totalsReady = initialTotals != null || totalsFetcher.data?.totals != null || liveTotals != null;

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
    const refreshTotals = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const fetcher = totalsRef.current;
      // Allow overlap only when idle so we never stall the live counter.
      if (fetcher.state !== "idle") return;
      fetcher.load(`/app/home-data?part=totals&fresh=1&t=${Date.now()}`);
    };

    refreshTotals();
    const timer = window.setInterval(refreshTotals, HOME_DATA_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshTotals();
    };
    window.addEventListener("focus", refreshTotals);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshTotals);
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
  const embedTone = embedRefreshing
    ? "info"
    : embed.missingThemeAccess
      ? "warning"
      : embed.enabled
        ? "success"
        : "warning";
  const widgetsHelp =
    scheduledCount > 0
      ? `${liveCount} live · ${scheduledCount} scheduled · ${widgetCount} total`
      : `${liveCount} live · ${widgetCount} total`;

  return (
    <s-section heading="Store overview">
      <div className="edd-metrics-grid">
        <s-box padding="base" border="base" borderRadius="base" background="base">
          <s-stack gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-icon type="product" color="subdued" />
              <s-heading>Live widgets</s-heading>
            </s-stack>
            <p className="edd-metric-value">{liveCount}</p>
            <s-paragraph color="subdued">{widgetsHelp}</s-paragraph>
          </s-stack>
        </s-box>

        <s-box padding="base" border="base" borderRadius="base" background="base">
          <s-stack gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-icon type="data-presentation" color="subdued" />
              <s-heading>Impressions</s-heading>
            </s-stack>
            {impressionsReady ? (
              <p className="edd-metric-value" key={impressions}>
                {impressions.toLocaleString()}
              </p>
            ) : (
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-spinner size="base" accessibilityLabel="Loading impressions" />
                <s-text color="subdued">Loading</s-text>
              </s-stack>
            )}
            <s-paragraph color="subdued">Past 30 days · updates live</s-paragraph>
          </s-stack>
        </s-box>

        <s-box
          padding="base"
          border="base"
          borderRadius="base"
          background={pendingCount ? "subdued" : "base"}
        >
          <s-stack gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-icon type="delivery" color="subdued" />
              <s-heading>Delivery requests</s-heading>
              {pendingCount ? (
                <s-badge tone="warning" color="base" size="base">
                  {pendingCount}
                </s-badge>
              ) : null}
            </s-stack>
            <p className="edd-metric-value">{pendingCount}</p>
            <s-paragraph color="subdued">
              {pendingCount ? "Waiting for your review" : "No pending requests"}
            </s-paragraph>
          </s-stack>
        </s-box>

        <s-box padding="base" border="base" borderRadius="base" background="base">
          <s-stack gap="small-200">
            <s-stack direction="inline" gap="small-200" alignItems="center" justifyContent="space-between">
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-icon type="desktop" color="subdued" />
                <s-heading>App embed</s-heading>
              </s-stack>
              <s-badge tone={embedTone} color="base" size="base" {...(embed.enabled ? { icon: "check-circle" } : {})}>
                {embedLabel}
              </s-badge>
            </s-stack>
            {embed.enabled ? (
              <s-paragraph color="subdued">
                Manage in the{" "}
                <s-link href={embed.manageUrl || fallbackEmbedUrl} target="_blank">
                  theme editor
                </s-link>
              </s-paragraph>
            ) : embed.missingThemeAccess ? (
              <s-stack gap="small-300">
                <s-paragraph color="subdued">Allow theme access to check embed status.</s-paragraph>
                {!embedRefreshing ? (
                  <ActionButton variant="primary" onClick={() => embed.requestAccess?.()}>
                    Allow theme access
                  </ActionButton>
                ) : null}
              </s-stack>
            ) : (
              <s-stack gap="small-300">
                <s-paragraph color="subdued">
                  Turn on Estimated delivery embed, then click Save in the theme editor.
                </s-paragraph>
                {!embedRefreshing ? (
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
                ) : null}
              </s-stack>
            )}
          </s-stack>
        </s-box>
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
  };

  const loadStatus = (showRefreshing, { fresh = false } = {}) => {
    if (fetcherRef.current.state !== "idle") return;
    if (showRefreshing) setRefreshing(true);
    fetcherRef.current.load(fresh ? "/app/embed-status?fresh=1" : "/app/embed-status");
  };

  useEffect(() => {
    // Initial status comes from the page loader — only refetch in the background.
    if (!initialStatus) {
      loadStatus(true);
    } else if (initialStatus.missingThemeAccess && !requestedScope.current) {
      // Ask for theme scopes without blocking the first paint.
      window.setTimeout(() => {
        requestThemeAccess();
      }, 0);
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const fresh = openedEditor.current;
      openedEditor.current = false;
      loadStatus(false, { fresh });
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadStatus(false);
    }, 30000);
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

  return {
    refreshing: refreshing && data == null,
    enabled: data?.appEmbedEnabled,
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

function requestStatusTone(status) {
  if (status === "ACCEPTED") return "success";
  if (status === "REJECTED") return "neutral";
  return "warning";
}

function requestStatusLabel(status) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
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
  const act = (item, intent) => {
    submit({ intent, requestId: item.id, widgetId: item.widgetId }, { method: "post" });
  };
  const sorted = [...requests].sort((a, b) => {
    const rank = (status) => (status === "PENDING" ? 0 : status === "ACCEPTED" ? 1 : 2);
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus) return byStatus;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  const showInitialLoad = !ready && refreshing;

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
          disabled={refreshing || saving}
          {...(refreshing ? { loading: true } : {})}
          onClick={() => onRefresh?.()}
        >
          Refresh
        </ActionButton>
      </div>

      <s-paragraph color="subdued">
        When a shopper asks for delivery to a pincode you don’t cover yet, their request shows up here.
      </s-paragraph>

      {showInitialLoad ? (
        <s-box padding="base" background="subdued" borderRadius="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-spinner size="base" accessibilityLabel="Loading delivery requests" />
            <s-text color="subdued">Loading requests…</s-text>
          </s-stack>
        </s-box>
      ) : sorted.length ? (
        <s-query-container>
          <s-stack gap="small">
            {sorted.map((item) => {
              const place = [item.city, item.state, item.country].filter(Boolean).join(", ");
              const source =
                [item.productTitle, item.widgetName].filter(Boolean).join(" · ") || "Storefront request";
              const pending = item.status === "PENDING";
              return (
                <s-box
                  key={item.id}
                  padding="base"
                  border="base"
                  borderRadius="base"
                  {...(pending ? { background: "subdued" } : {})}
                >
                  <s-grid
                    gridTemplateColumns="@container (inline-size <= 520px) 1fr, 1fr auto"
                    gap="base"
                    alignItems="center"
                  >
                    <s-stack gap="small-100">
                      <s-stack direction="inline" gap="small-200" alignItems="center">
                        <s-text type="strong">{item.pincode}</s-text>
                        <s-badge tone={requestStatusTone(item.status)}>
                          {requestStatusLabel(item.status)}
                        </s-badge>
                      </s-stack>
                      <s-paragraph color="subdued">{place || "Location unavailable"}</s-paragraph>
                      <s-paragraph color="subdued">{source}</s-paragraph>
                      <s-text color="subdued">{formatRequestWhen(item.createdAt)}</s-text>
                    </s-stack>
                    {pending ? (
                      <s-button-group gap="base">
                        <ActionButton
                          variant="primary"
                          disabled={saving}
                          onClick={() => act(item, "accept-delivery-request")}
                        >
                          Accept
                        </ActionButton>
                        <ActionButton
                          variant="secondary"
                          disabled={saving}
                          onClick={() => act(item, "reject-delivery-request")}
                        >
                          Decline
                        </ActionButton>
                      </s-button-group>
                    ) : null}
                  </s-grid>
                </s-box>
              );
            })}
          </s-stack>
        </s-query-container>
      ) : (
        <s-box padding="base" border="base" borderRadius="base" background="subdued">
          <s-empty-state heading="No delivery requests yet">
            <s-text slot="subheading">
              Requests appear when customers ask about delivery to an unavailable pincode.
            </s-text>
          </s-empty-state>
        </s-box>
      )}
    </s-section>
  );
}

function WidgetList({ heading, empty, location, widgets, now, onRequestDelete, hideCreate = false }) {
  const canCreate = !(hideCreate || location === WIDGET_LOCATIONS.CHECKOUT);
  const sectionIcon = location === WIDGET_LOCATIONS.CART ? "cart" : "product";

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
        <s-table variant="auto" className="edd-home-widget-table">
          <s-table-header-row>
            <s-table-header listSlot="primary">Name</s-table-header>
            <s-table-header listSlot="labeled">Location</s-table-header>
            <s-table-header listSlot="labeled">Apply to</s-table-header>
            <s-table-header listSlot="labeled">Status</s-table-header>
            <s-table-header listSlot="kicker" format="numeric">
              Actions
            </s-table-header>
          </s-table-header-row>
          <s-table-body>
            {widgets.map((widget) => {
              const published = widget.status === WIDGET_STATUSES.ACTIVE;
              const scheduled = widget.status === WIDGET_STATUSES.SCHEDULED;
              const hasActivationConflict = Boolean(widget.activationConflict?.conflicts?.length);
              const remainingMs =
                scheduled && widget.scheduledPublishAt
                  ? new Date(widget.scheduledPublishAt).getTime() - now
                  : null;
              const countdown = formatCountdown(remainingMs);
              const statusLabel = published
                ? "Live"
                : hasActivationConflict
                  ? "Needs attention"
                  : scheduled
                    ? remainingMs != null && remainingMs <= 0
                      ? "Going live"
                      : countdown && countdown !== "now"
                        ? `Scheduled · ${countdown}`
                        : "Scheduled"
                    : widget.status === "DRAFT"
                      ? "Draft"
                      : "Unpublished";
              const applyTo = widget.applyToLabel || widgetApplyToLabel(widget);
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
                      {statusLabel}
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
            })}
          </s-table-body>
        </s-table>
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
