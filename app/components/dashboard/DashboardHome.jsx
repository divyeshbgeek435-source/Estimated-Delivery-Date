import { useEffect, useRef, useState } from "react";
import { useFetcher, useSubmit } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { locationLabel, WIDGET_LOCATIONS, WIDGET_STATUSES } from "../../lib/constants";
import { formatCountdown, mergeLiveRows, useLivePublishPoll } from "../../lib/use-live-publish";
import { LivePublishedDialog } from "../common/LivePublishedDialog";

const SECTIONS = [
  { location: WIDGET_LOCATIONS.PRODUCT, heading: "Product page widgets" },
  { location: WIDGET_LOCATIONS.CART, heading: "Cart page widgets" },
  { location: WIDGET_LOCATIONS.CHECKOUT, heading: "Checkout page widgets" },
];

export function DashboardHome({
  widgets,
  totals,
  liveNotices = [],
  themeEditorEmbed,
  themeEditorBlock,
  saving,
  error,
}) {
  const embed = useEmbedStatus(themeEditorEmbed, themeEditorBlock);
  const submit = useSubmit();
  const livePoll = useLivePublishPoll({ items: widgets });
  const [acked, setAcked] = useState(() => new Set());
  const rows = mergeLiveRows(widgets, livePoll.data?.widgets);  
  const notices = (livePoll.data?.liveNotices ?? liveNotices).filter(
    (notice) => !acked.has(`${notice.id}:${notice.at || ""}`),
  );

  return (
    <s-page heading="Estimated delivery">
      <s-button
        slot="primary-action"
        variant="primary"
        href="/app/widgets/new"
        {...(saving ? { loading: true } : {})}
      >
        Create new widget
      </s-button>

      {error ? <s-banner tone="critical">{error}</s-banner> : null}

      <div className="edd-page">
      {SECTIONS.map((section) => {
        const items = rows.filter((widget) => widget.location === section.location);
        if (!items.length && section.location !== WIDGET_LOCATIONS.PRODUCT) return null;
        return (
          <WidgetList
            key={section.location}
            heading={section.heading}
            widgets={items}
            now={livePoll.now}
          />
        );
      })}

      <div className="edd-card edd-impressions">
        <p className="edd-impressions__label">Impressions</p>
        <p className="edd-impressions__value">{totals.impressions || 0}</p>
        <p className="edd-impressions__help">Past 30 days</p>
      </div>

      <div className="edd-status-grid">
        <AppEmbedStatusCard embed={embed} fallbackEmbedUrl={themeEditorEmbed} />
        <AppBlockStatusCard fallbackBlockUrl={embed.blockUrl || themeEditorBlock} />
      </div>
      </div>
      <LivePublishedDialog
        notices={notices}
        editorUrl={themeEditorBlock}
        onDismiss={(widgetId) => {
          const notice = notices.find((item) => item.id === widgetId);
          setAcked((current) => new Set(current).add(`${widgetId}:${notice?.at || ""}`));
          submit({ widgetId, intent: "ack-live" }, { method: "post" });
        }}
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
  const [refreshing, setRefreshing] = useState(true);

  const loadStatus = async (showRefreshing, requestScope = false) => {
    if (showRefreshing) setRefreshing(true);
    if (requestScope && !requestedScope.current) {
      requestedScope.current = true;
      try {
        const current = await shopify.scopes?.query?.();
        const granted = current?.granted || [];
        if (!granted.includes("read_themes")) {
          await shopify.scopes.request(["read_themes"]);
        }
      } catch {
        // Continue with whatever theme access the session already has.
      }
    }
    fetcherRef.current.load("/app/embed-status");
  };

  useEffect(() => {
    loadStatus(true, true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadStatus(false);
    }, 30000);
    return () => window.clearInterval(timer);
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
    reload: () => loadStatus(true),
  };
}

function AppEmbedStatusCard({ embed, fallbackEmbedUrl }) {
  const { refreshing, enabled, activateUrl, manageUrl, reload } = embed;
  const openEditor = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    reload();
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

function WidgetList({ heading, widgets, now }) {
  return (
    <section className="edd-widget-list">
      <h2 className="edd-widget-list__heading">{heading}</h2>
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
                <s-link href={`/app/widgets/${widget.id}?tab=conditions`}>{widget.name}</s-link>
                <span>{locationLabel(widget.location)}</span>
                <span className="edd-widget-row__status">
                  <s-badge tone={published ? "success" : scheduled ? "info" : "neutral"}>
                    {statusLabel}
                  </s-badge>
                  <WidgetActions widget={widget} published={published} scheduled={scheduled} />
                </span>
              </div>
            );
          })
        ) : (
          <div className="edd-widget-row edd-widget-row--empty">
            <span>No widgets yet. Create one to show estimated delivery dates.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function WidgetActions({ widget, published, scheduled }) {
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
          <s-link href={`/app/widgets/${widget.id}?tab=conditions`}>Edit</s-link>
          <button type="button" role="menuitem" onClick={() => run("duplicate")}>
            Duplicate
          </button>
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
          <button type="button" role="menuitem" className="edd-actions__danger" onClick={() => run("delete")}>
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
