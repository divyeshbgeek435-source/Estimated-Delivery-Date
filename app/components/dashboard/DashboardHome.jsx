import { useEffect, useRef, useState } from "react";
import { useFetcher, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { locationLabel, WIDGET_LOCATIONS, WIDGET_STATUSES } from "../../lib/constants";
import { formatCountdown, mergeLiveRows, useLivePublishPoll } from "../../lib/use-live-publish";
import { ActionButton } from "../common/ActionButton";
import { AppLink } from "../common/AppLink";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { LivePublishedDialog } from "../common/LivePublishedDialog";

const SECTIONS = [
  { location: WIDGET_LOCATIONS.PRODUCT, heading: "Product page widgets" },
  { location: WIDGET_LOCATIONS.CART, heading: "Cart page widgets" },
];

export function DashboardHome({
  widgets,
  liveNotices = [],
  themeEditorEmbed,
  themeEditorBlock,
  saving,
  error,
  actionData,
}) {
  const extras = useFetcher();
  const extrasRef = useRef(extras);
  extrasRef.current = extras;
  const embed = useEmbedStatus(themeEditorEmbed, themeEditorBlock);
  const totals = extras.data?.totals || { impressions: 0 };
  const deliveryRequests = extras.data?.deliveryRequests || [];

  useEffect(() => {
    extrasRef.current.load("/app/home-data");
  }, [actionData]);
  const submit = useSubmit();
  const livePoll = useLivePublishPoll({ items: widgets });
  const [acked, setAcked] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletedNotice, setDeletedNotice] = useState(null);
  const seenDelete = useRef("");
  const rows = mergeLiveRows(widgets, livePoll.data?.widgets);  
  const notices = (livePoll.data?.liveNotices ?? liveNotices).filter(
    (notice) => !acked.has(`${notice.id}:${notice.at || ""}`),
  );
  const checkoutItems = rows.filter((widget) => widget.location === WIDGET_LOCATIONS.CHECKOUT);
  const deleting = Boolean(saving && pendingDelete);

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

  return (
    <s-page heading="Estimated delivery">
      <ActionButton
        slot="primary-action"
        variant="primary"
        to="/app/widgets/new"
        {...(saving ? { loading: true } : {})}
      >
        Create new widget
      </ActionButton>

      {error ? <s-banner tone="critical">{error}</s-banner> : null}

      <div className="edd-page">
      {SECTIONS.map((section) => {
        const items = rows.filter((widget) => widget.location === section.location);
        return (
          <WidgetList
            key={section.location}
            heading={section.heading}
            location={section.location}
            widgets={items}
            now={livePoll.now}
            onRequestDelete={setPendingDelete}
          />
        );
      })}
      {checkoutItems.length ? (
        <WidgetList
          heading="Checkout widgets (no longer offered)"
          location={WIDGET_LOCATIONS.CHECKOUT}
          widgets={checkoutItems}
          now={livePoll.now}
          onRequestDelete={setPendingDelete}
        />
      ) : null}

      <div className="edd-card edd-impressions">
        <p className="edd-impressions__label">Impressions</p>
        <p className="edd-impressions__value">{totals.impressions || 0}</p>
        <p className="edd-impressions__help">Past 30 days</p>
      </div>

      <div className="edd-status-grid">
        <AppEmbedStatusCard embed={embed} fallbackEmbedUrl={themeEditorEmbed} />
        <AppBlockStatusCard fallbackBlockUrl={embed.blockUrl || themeEditorBlock} />
      </div>

      <DeliveryRequestsList
        requests={deliveryRequests}
        saving={saving}
        refreshing={extras.state !== "idle"}
        onRefresh={() => extras.load("/app/home-data")}
      />
      </div>
      <LivePublishedDialog
        notices={notices}
        onDismiss={(widgetId) => {
          const notice = notices.find((item) => item.id === widgetId);
          setAcked((current) => new Set(current).add(`${widgetId}:${notice?.at || ""}`));
          submit({ widgetId, intent: "ack-live" }, { method: "post" });
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

function useEmbedStatus(fallbackEmbedUrl, fallbackBlockUrl) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestedScope = useRef(false);
  const openedEditor = useRef(false);
  const [refreshing, setRefreshing] = useState(true);

  const loadStatus = async (showRefreshing, { fresh = false, requestScope = false } = {}) => {
    if (fetcherRef.current.state !== "idle") return;
    if (showRefreshing) setRefreshing(true);
    if (requestScope && !requestedScope.current) {
      requestedScope.current = true;
      try {
        const current = await shopify.scopes?.query?.();
        const granted = current?.granted || [];
        const needed = ["read_themes", "write_themes"].filter((scope) => !granted.includes(scope));
        if (needed.length) {
          await shopify.scopes.request(needed);
        }
      } catch {
        // Continue with whatever theme access the session already has.
      }
    }
    fetcherRef.current.load(fresh ? "/app/embed-status?fresh=1" : "/app/embed-status");
  };

  useEffect(() => {
    loadStatus(true, { requestScope: true });
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
  }, []);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data != null) setRefreshing(false);
  }, [fetcher.state, fetcher.data]);

  return {
    refreshing,
    enabled: fetcher.data?.appEmbedEnabled,
    activateUrl: fetcher.data?.themeEditorEmbed || fallbackEmbedUrl,
    manageUrl: fetcher.data?.themeEditorEmbedManage || fallbackEmbedUrl,
    blockUrl: fetcher.data?.themeEditorBlock || fallbackBlockUrl,
    reload: (fresh = false) => loadStatus(true, { fresh }),
    markEditorOpened: () => {
      openedEditor.current = true;
    },
  };
}

function AppEmbedStatusCard({ embed, fallbackEmbedUrl }) {
  const { refreshing, enabled, activateUrl, manageUrl, markEditorOpened } = embed;
  const openEditor = (url) => {
    if (!url) return;
    markEditorOpened?.();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="edd-card edd-embed-card">
      <div className="edd-status-card__head">
        <s-heading>App Embed</s-heading>
        {refreshing || enabled == null ? (
          <s-badge tone="info">Refreshing</s-badge>
        ) : (
          <s-badge tone={enabled ? "success" : "warning"}>{enabled ? "Active" : "Disabled"}</s-badge>
        )}
        {!refreshing && enabled === false ? (
          <button type="button" className="edd-activate" onClick={() => openEditor(activateUrl || fallbackEmbedUrl)}>
            Activate
          </button>
        ) : null}
      </div>
      {enabled ? (
        <s-paragraph>
          Manage app embed in the online{" "}
          <s-link href={manageUrl} target="_blank">
            store editor
          </s-link>
        </s-paragraph>
      ) : (
        <s-paragraph>Activate by clicking 'Activate' and then 'Save' in the following page.</s-paragraph>
      )}
    </div>
  );
}

function AppBlockStatusCard({ fallbackBlockUrl }) {

  return (
    <div className="edd-card edd-embed-card">
      <div className="edd-status-card__head">
        <s-heading>App Block</s-heading>
        <s-badge tone="warning">Disabled</s-badge>
        <button
          type="button"
          className="edd-activate"
          onClick={() => window.open(fallbackBlockUrl, "_blank", "noopener,noreferrer")}
        >
          Activate
        </button>
      </div>
      <s-paragraph>Activate by clicking 'Activate' and then 'Save' in the following page.</s-paragraph>
    </div>
  );
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

function DeliveryRequestsList({ requests = [], saving, refreshing = false, onRefresh }) {
  const submit = useSubmit();
  const act = (item, intent) => {
    submit({ intent, requestId: item.id, widgetId: item.widgetId }, { method: "post" });
  };

  return (
    <section className="edd-widget-list">
      <div className="edd-widget-list__toolbar">
        <h2 className="edd-widget-list__heading">Delivery requests</h2>
        <button
          type="button"
          className="edd-btn edd-btn--secondary"
          disabled={refreshing || saving}
          onClick={() => onRefresh?.()}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="edd-card edd-widget-list__table">
        <div className="edd-widget-row edd-request-row edd-widget-row--head">
          <span>Pincode</span>
          <span>Location</span>
          <span>Product / widget</span>
          <span>Received</span>
          <span>Status</span>
        </div>
        {requests.length ? (
          requests.map((item) => {
            const place = [item.city, item.state, item.country].filter(Boolean).join(", ");
            const source = [item.productTitle, item.widgetName].filter(Boolean).join(" · ") || "Storefront request";
            return (
              <div key={item.id} className="edd-widget-row edd-request-row">
                <strong>{item.pincode}</strong>
                <span>{place || "—"}</span>
                <span>{source}</span>
                <span>{formatRequestWhen(item.createdAt)}</span>
                <span className="edd-widget-row__status">
                  <s-badge tone={requestStatusTone(item.status)}>{requestStatusLabel(item.status)}</s-badge>
                  {item.status === "PENDING" ? (
                    <span className="edd-request-actions">
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
                        className="edd-pin-list__remove"
                        disabled={saving}
                        onClick={() => act(item, "reject-delivery-request")}
                      >
                        Reject
                      </button>
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })
        ) : (
          <div className="edd-widget-row edd-widget-row--empty">
            <span>No delivery requests yet. When a customer requests delivery for an unavailable pincode, it appears here.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function WidgetList({ heading, location, widgets, now, onRequestDelete }) {
  const empty =
    location === WIDGET_LOCATIONS.CART
      ? "No cart widget yet. Create one to show estimated delivery above checkout."
      : location === WIDGET_LOCATIONS.CHECKOUT
        ? "Checkout widgets are no longer available. Unpublish or delete any leftover widgets."
        : "No widgets yet. Create one to show estimated delivery dates.";
  return (
    <section className="edd-widget-list">
      <div className="edd-widget-list__heading-row">
        <h2 className="edd-widget-list__heading">{heading}</h2>
        {location === WIDGET_LOCATIONS.PRODUCT || location === WIDGET_LOCATIONS.CHECKOUT ? null : (
          <AppLink to="/app/widgets/new">{widgets.length ? "Create another" : "Create new widget"}</AppLink>
        )}
      </div>
      <div className="edd-card edd-widget-list__table">
        <div className="edd-widget-row edd-widget-row--head">
          <span>Estimated delivery name</span>
          <span>Widget location</span>
          <span>Status</span>
        </div>
        {widgets.length ? (
          widgets.map((widget) => {
            const published = widget.status === WIDGET_STATUSES.ACTIVE;
            const scheduled = widget.status === WIDGET_STATUSES.SCHEDULED;
            const remainingMs = scheduled && widget.scheduledPublishAt
              ? new Date(widget.scheduledPublishAt).getTime() - now
              : null;
            const countdown = formatCountdown(remainingMs);
            const statusLabel = published
              ? "Live"
              : scheduled
                ? remainingMs != null && remainingMs <= 0
                  ? "Going live"
                  : countdown && countdown !== "now"
                    ? `Scheduled · ${countdown}`
                    : "Scheduled"
                : widget.status === "DRAFT"
                  ? "Not published"
                  : "Unpublished";
            return (
              <div key={widget.id} className="edd-widget-row">
                <AppLink to={`/app/widgets/${widget.id}?tab=conditions`}>{widget.name}</AppLink>
                <span>{locationLabel(widget.location)}</span>
                <span className="edd-widget-row__status">
                  <s-badge tone={published ? "success" : scheduled ? "info" : "neutral"}>
                    {statusLabel}
                  </s-badge>
                  <WidgetActions
                    widget={widget}
                    published={published}
                    scheduled={scheduled}
                    onRequestDelete={onRequestDelete}
                  />
                </span>
              </div>
            );
          })
        ) : (
          <div className="edd-widget-row edd-widget-row--empty">
            <span>{empty}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function WidgetActions({ widget, published, scheduled, onRequestDelete }) {
  const submit = useSubmit();
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = (intent) => {
    setOpen(false);
    submit({ widgetId: widget.id, intent }, { method: "post" });
  };

  return (
    <div className="edd-actions" ref={root}>
      <button
        type="button"
        className="edd-actions__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${widget.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        ⋯
      </button>
      {open ? (
        <div className="edd-actions__menu" role="menu">
          <AppLink to={`/app/widgets/${widget.id}?tab=conditions`}>Edit</AppLink>
          {widget.location === WIDGET_LOCATIONS.CHECKOUT ? null : (
            <button type="button" role="menuitem" onClick={() => run("duplicate")}>
              Duplicate
            </button>
          )}
          {scheduled ? (
            <>
              <button type="button" role="menuitem" onClick={() => run("activate")}>
                Publish now
              </button>
              <button type="button" role="menuitem" onClick={() => run("deactivate")}>
                Cancel schedule
              </button>
            </>
          ) : (
            <button type="button" role="menuitem" onClick={() => run(published ? "deactivate" : "activate")}>
              {published ? "Unpublish" : "Publish"}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="edd-actions__danger"
            onClick={() => {
              setOpen(false);
              onRequestDelete?.(widget);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
