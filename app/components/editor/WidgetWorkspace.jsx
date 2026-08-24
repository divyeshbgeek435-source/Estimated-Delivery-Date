import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { EDITOR_TABS, locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { applyLiveStatus, formatCountdown, useLivePublishPoll } from "../../lib/use-live-publish";
import { normalizePosition, widgetProfile } from "../../lib/widget-profiles";
import { openProductPageEditor } from "../../lib/open-theme-editor";
import { LiveWidgetPreview } from "../widgets/PlacementPreview";
import { EmbedActivateBanner } from "../common/EmbedActivateBanner";
import { ErrorBanner } from "../common/Feedback";
import { LivePublishedDialog } from "../common/LivePublishedDialog";
import { ConditionsTab } from "./ConditionsTab";
import { ContentTab } from "./ContentTab";
import { DesignTab } from "./DesignTab";
import { PlacementTab } from "./PlacementTab";

function defaultScheduleValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  if (date.getTime() <= Date.now()) date.setHours(date.getHours() + 1);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatScheduleLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const NEXT_TAB = {
  conditions: { id: "content", label: "Continue to Content" },
  content: { id: "design", label: "Continue to Design" },
  design: { id: "placement", label: "Continue to Placement" },
};

function tabFromUrl() {
  if (typeof window === "undefined") return "conditions";
  const value = new URLSearchParams(window.location.search).get("tab");
  return EDITOR_TABS.some((item) => item.id === value) ? value : "conditions";
}

export function WidgetWorkspace({ widget, errors, themeEditorUrl }) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [tab, setTab] = useState(tabFromUrl);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([tabFromUrl()]));
  const [draft, setDraft] = useState(() => structuredClone(widget));
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saveState, setSaveState] = useState("saved");
  const [publishWhen, setPublishWhen] = useState("now");
  const [scheduleAt, setScheduleAt] = useState(defaultScheduleValue);
  const skipAutosave = useRef(true);
  const draftRef = useRef(draft);
  const tabRef = useRef(tab);
  draftRef.current = draft;
  tabRef.current = tab;
  const saving = fetcher.state !== "idle";
  const savedWidget =
    fetcher.data?.widget &&
    new Date(fetcher.data.widget.updatedAt || 0).getTime() >= new Date(widget.updatedAt || 0).getTime()
      ? fetcher.data.widget
      : widget.status === WIDGET_STATUSES.ACTIVE && fetcher.data?.widget?.status === WIDGET_STATUSES.SCHEDULED
        ? widget
        : fetcher.data?.widget || widget;
  const scheduledAt = savedWidget.scheduledPublishAt || savedWidget.messageConfig?.scheduledPublishAt || null;
  const livePoll = useLivePublishPoll({
    widgetId: widget.id,
    items: [{ id: widget.id, status: savedWidget.status, scheduledPublishAt: scheduledAt }],
  });
  const liveWidget = applyLiveStatus(savedWidget, livePoll.data?.widget);
  const published = liveWidget.status === WIDGET_STATUSES.ACTIVE;
  const scheduled = liveWidget.status === WIDGET_STATUSES.SCHEDULED;
  const scheduledLabel = formatScheduleLabel(liveWidget.scheduledPublishAt || liveWidget.messageConfig?.scheduledPublishAt);
  const remainingMs = scheduled && scheduledAt ? new Date(scheduledAt).getTime() - livePoll.now : null;
  const countdown = formatCountdown(remainingMs);
  const next = NEXT_TAB[tab];
  const profile = widgetProfile(widget.location);
  const isProduct = widget.location === "PRODUCT";

  useEffect(() => {
    setDraft(structuredClone(widget));
    skipAutosave.current = true;
  }, [widget.id]);

  useEffect(() => {
    if (fetcher.data?.silent) setSaveState("saved");
    if (fetcher.data?.errors) setSaveState("error");
    if (fetcher.data?.toast) shopify.toast.show(fetcher.data.toast);
  }, [fetcher.data, shopify]);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    setSaveState("saving");
    const timer = setTimeout(() => {
      fetcher.submit(
        {
          intent: "autosave",
          currentStep: tabRef.current,
          editorState: JSON.stringify(draftRef.current),
        },
        { method: "post", preventScrollReset: true },
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [draft]);

  const goTab = (id) => {
    if (id === tabRef.current) return;
    setTab(id);
    setVisitedTabs((current) => {
      if (current.has(id)) return current;
      const nextVisited = new Set(current);
      nextVisited.add(id);
      return nextVisited;
    });
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(window.history.state, "", url);
  };

  const hidePublishModal = () => {
    document.getElementById("edd-publish-modal")?.hideOverlay?.();
  };

  const submitIntent = (intent, extras = {}) => {
    fetcher.submit(
      {
        intent,
        currentStep: tabRef.current,
        editorState: JSON.stringify(draftRef.current),
        ...extras,
      },
      { method: "post" },
    );
  };

  const submitPublishNow = () => {
    submitIntent("publish", { publishWhen: "now" });
    hidePublishModal();
    openProductPageEditor(themeEditorUrl);
  };

  const submitSchedule = () => {
    if (!scheduleAt) {
      shopify.toast.show("Choose a date and time", { isError: true });
      return;
    }
    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      shopify.toast.show("Scheduled time must be in the future", { isError: true });
      return;
    }
    submitIntent("publish", {
      publishWhen: "schedule",
      scheduledPublishAt: when.toISOString(),
    });
    hidePublishModal();
  };

  const previewMessage = draft.messageConfig;
  const position = normalizePosition(widget.location, draft.placementConfig?.position);

  return (
    <s-page heading={draft.name || widget.name} inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Home
      </s-link>
      {isProduct ? (
        <s-button slot="primary-action" variant="primary" commandFor="edd-publish-modal" command="--show">
          Publish
        </s-button>
      ) : (
        <s-button
          slot="primary-action"
          variant="primary"
          {...(saving ? { loading: true } : {})}
          onClick={() => submitIntent("publish")}
        >
          Publish
        </s-button>
      )}

      <div className="edd-page edd-page--wide">
      <p className="edd-editor__kicker">
        <span>
          {profile.editorHeading} · {locationLabel(widget.location)}
        </span>
        {published ? (
          <s-badge tone="success">Live</s-badge>
        ) : scheduled ? (
          <s-badge tone="info">
            {remainingMs != null && remainingMs <= 0
              ? "Going live"
              : `Scheduled${countdown && countdown !== "now" ? ` · ${countdown}` : ""}`}
          </s-badge>
        ) : null}
      </p>
      <EmbedActivateBanner />
      {published && liveWidget.messageConfig?.liveNotice ? (
        <s-banner tone="success">This widget is live on the product page.</s-banner>
      ) : scheduled ? (
        <s-banner tone="info">
          {remainingMs != null && remainingMs <= 0
            ? "Scheduled time reached. Publishing to the storefront now."
            : `Scheduled to publish ${scheduledLabel ? `on ${scheduledLabel}` : "later"}${countdown && countdown !== "now" ? ` · goes live in ${countdown}` : ""}. It stays hidden on the storefront until then.`}
        </s-banner>
      ) : null}
      <ErrorBanner errors={errors || fetcher.data?.errors} />

      <div className="edd-tabs-row">
        <nav className="edd-tabs" aria-label="Widget settings">
          {EDITOR_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="edd-tab"
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => goTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="edd-editor">
        <div className="edd-editor__form">
          {visitedTabs.has("conditions") ? (
            <div className="edd-editor__panel" hidden={tab !== "conditions"}>
              <ConditionsTab widget={widget} draft={draft} onChange={setDraft} errors={errors} />
            </div>
          ) : null}
          {visitedTabs.has("content") ? (
            <div className="edd-editor__panel" hidden={tab !== "content"}>
              <ContentTab widget={widget} draft={draft} onChange={setDraft} errors={errors} />
            </div>
          ) : null}
          {visitedTabs.has("design") ? (
            <div className="edd-editor__panel" hidden={tab !== "design"}>
              <DesignTab widget={widget} draft={draft} onChange={setDraft} errors={errors} />
            </div>
          ) : null}
          {visitedTabs.has("placement") ? (
            <div className="edd-editor__panel" hidden={tab !== "placement"}>
              <PlacementTab widget={widget} draft={draft} onChange={setDraft} errors={errors} />
            </div>
          ) : null}
          <div className="edd-editor__footer">
            {next ? (
              <button type="button" className="edd-btn edd-btn--primary" onClick={() => goTab(next.id)}>
                {next.label}
              </button>
            ) : isProduct ? (
              <s-button variant="primary" commandFor="edd-publish-modal" command="--show">
                Publish
              </s-button>
            ) : (
              <button type="button" className="edd-btn edd-btn--primary" onClick={() => submitIntent("publish")}>
                Publish
              </button>
            )}
            {published || scheduled ? (
              <button type="button" className="edd-btn" onClick={() => submitIntent("unpublish")}>
                {scheduled ? "Cancel schedule" : "Unpublish"}
              </button>
            ) : null}
          </div>
        </div>
        <aside className="edd-editor__preview" aria-label="Live preview">
          <div className="edd-preview-toolbar">
            <span className="edd-preview-toolbar__live">Live preview</span>
            <div className="edd-preview-devices" role="group" aria-label="Preview size">
              <button
                type="button"
                className="edd-preview-device"
                aria-pressed={previewDevice === "desktop"}
                aria-label="Desktop preview"
                onClick={() => setPreviewDevice("desktop")}
              >
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <rect x="2" y="4" width="16" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="edd-preview-device"
                aria-pressed={previewDevice === "mobile"}
                aria-label="Mobile preview"
                onClick={() => setPreviewDevice("mobile")}
              >
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <rect x="6" y="2" width="8" height="16" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="10" cy="15.2" r="0.7" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
          <div className={`edd-preview-frame edd-preview-frame--${previewDevice}`}>
            <LiveWidgetPreview
              location={widget.location}
              position={position}
              heading={previewMessage.heading || ""}
              template={previewMessage.template}
              icons={draft.iconConfig}
              style={draft.styleConfig}
              shipping={draft.shippingRules}
              timezone={draft.timezone}
              dateSettings={draft.messageConfig}
              layout={previewMessage.widgetLayout || "FULL"}
              design={previewMessage.designTemplate || "TIMELINE"}
              showDescription={previewMessage.descriptionEnabled !== false}
            />
          </div>
        </aside>
      </div>
      </div>

      <s-modal id="edd-publish-modal" heading="Publish">
        <s-paragraph>Choose when this widget should go live.</s-paragraph>
        <div className="edd-publish-when">
          <label className="edd-publish-option">
            <input
              type="radio"
              name="publishWhen"
              value="now"
              checked={publishWhen === "now"}
              onChange={() => setPublishWhen("now")}
            />
            <span>
              <strong>Publish now</strong>
              <em>Open the product page with the Estimated delivery block added. You only need to click Save.</em>
            </span>
          </label>
          <label className="edd-publish-option">
            <input
              type="radio"
              name="publishWhen"
              value="schedule"
              checked={publishWhen === "schedule"}
              onChange={() => setPublishWhen("schedule")}
            />
            <span>
              <strong>Schedule</strong>
              <em>Keep it hidden until the date and time you choose. We'll show a popup when it goes live.</em>
            </span>
          </label>
        </div>

        {publishWhen === "schedule" ? (
          <label className="edd-field edd-publish-when__time">
            <span>Date and time</span>
            <input
              className="edd-input"
              type="datetime-local"
              value={scheduleAt}
              min={defaultScheduleValue()}
              onChange={(event) => setScheduleAt(event.currentTarget.value)}
            />
          </label>
        ) : null}

        <s-button
          slot="primary-action"
          variant="primary"
          onClick={publishWhen === "now" ? submitPublishNow : submitSchedule}
        >
          {publishWhen === "now" ? "Publish now" : "Schedule"}
        </s-button>
        <s-button slot="secondary-actions" variant="secondary" commandFor="edd-publish-modal" command="--hide">
          Cancel
        </s-button>
      </s-modal>
      <LivePublishedDialog
        notices={
          liveWidget.messageConfig?.liveNotice
            ? [{ id: liveWidget.id, name: liveWidget.name || draft.name, at: liveWidget.messageConfig.liveNotice }]
            : []
        }
        editorUrl={themeEditorUrl}
        onDismiss={() => submitIntent("ack-live")}
      />
    </s-page>
  );
}
