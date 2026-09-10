import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { EDITOR_TABS, locationLabel, WIDGET_STATUSES } from "../../lib/constants";
import { rememberHomeFocusWidget } from "../../lib/home-scroll";
import { applyLiveStatus, formatCountdown, useLivePublishPoll } from "../../lib/use-live-publish";
import { SAVE_STATUS, useEditorSave } from "../../lib/use-editor-save";
import { normalizePosition, widgetProfile } from "../../lib/widget-profiles";
import {
  defaultScheduleValue,
  formatScheduleLabel,
  parseScheduleInput,
  SAVE_ACTIONS,
  saveActionFromStatus,
  storefrontPageLabel,
  toDatetimeLocal,
} from "../../lib/widget-status";
import { ActionButton } from "../common/ActionButton";
import { AppLink } from "../common/AppLink";
import { LiveWidgetPreview } from "../widgets/PlacementPreview";
import { EmbedActivateBanner } from "../common/EmbedActivateBanner";
import { ErrorBanner } from "../common/Feedback";
import { WidgetConfirmDialog } from "../common/LivePublishedDialog";
import { PlacementConflictDialog } from "../common/PlacementConflictDialog";
import { conflictDialogCopy } from "../../lib/widget-conflicts";
import { ConditionsTab } from "./ConditionsTab";
import { DesignTab } from "./DesignTab";
import { PlacementTab } from "./PlacementTab";
import { WidgetStatusPicker } from "./WidgetStatusPicker";

const NEXT_TAB = {
  conditions: { id: "design", label: "Continue to Design" },
  design: { id: "placement", label: "Continue to Placement" },
};

function normalizeTab(value) {
  if (value === "content" || value === "message" || value === "style") return "design";
  return EDITOR_TABS.some((item) => item.id === value) ? value : "conditions";
}

function tabFromUrl() {
  if (typeof window === "undefined") return "conditions";
  const value = new URLSearchParams(window.location.search).get("tab");
  return normalizeTab(value);
}

function SaveStatus({ status, onRetry }) {
  if (status === SAVE_STATUS.SAVING) {
    return <s-badge tone="info">Saving</s-badge>;
  }
  if (status === SAVE_STATUS.UNSAVED) {
    return <s-badge tone="warning">Unsaved</s-badge>;
  }
  if (status === SAVE_STATUS.ERROR) {
    return (
      <span className="edd-save-status edd-save-status--error">
        <s-badge tone="critical">Save failed</s-badge>
        <ActionButton type="button" variant="tertiary" onClick={onRetry}>
          Retry
        </ActionButton>
      </span>
    );
  }
  return <s-badge tone="success">Saved</s-badge>;
}

export function WidgetWorkspace({
  widget,
  errors,
  deliveryRequests = [],
  liveProductWidgets = [],
  conflict: conflictProp = null,
  themeEditorUrl = "",
  storefrontUrl = "",
}) {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const [tab, setTab] = useState(tabFromUrl);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([tabFromUrl()]));
  const [draft, setDraft] = useState(() => structuredClone(widget));
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saveAction, setSaveAction] = useState(() => saveActionFromStatus(widget.status));
  const [scheduleAt, setScheduleAt] = useState(() =>
    toDatetimeLocal(widget.scheduledPublishAt || widget.messageConfig?.scheduledPublishAt) || defaultScheduleValue(),
  );
  const seenConfirm = useRef("");
  const [confirm, setConfirm] = useState(null);
  const [conflict, setConflict] = useState(conflictProp);
  const resolvingConflict = useRef(false);
  const conflictSubmitStarted = useRef(false);
  const {
    fetcher: saveFetcher,
    status: saveStatus,
    errors: saveErrors,
    saving,
    submitSave: queueSave,
    retry,
  } = useEditorSave({
    draft,
    tab,
    widgetId: widget.id,
    marker: `${saveAction}:${scheduleAt}`,
  });
  const savedWidget =
    saveFetcher.data?.widget &&
    new Date(saveFetcher.data.widget.updatedAt || 0).getTime() >= new Date(widget.updatedAt || 0).getTime()
      ? saveFetcher.data.widget
      : widget.status === WIDGET_STATUSES.ACTIVE && saveFetcher.data?.widget?.status === WIDGET_STATUSES.SCHEDULED
        ? widget
        : saveFetcher.data?.widget || widget;
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
  const pageLabel = storefrontPageLabel(widget.location);
  const activationConflict =
    livePoll.data?.widget?.activationConflict ||
    liveWidget.messageConfig?.activationConflict ||
    null;

  useEffect(() => {
    setDraft(structuredClone(widget));
    setSaveAction(saveActionFromStatus(widget.status));
    setScheduleAt(
      toDatetimeLocal(widget.scheduledPublishAt || widget.messageConfig?.scheduledPublishAt) || defaultScheduleValue(),
    );
  }, [widget.id]);

  useEffect(() => {
    if (conflictProp) setConflict(conflictProp);
  }, [conflictProp]);

  useEffect(() => {
    if (liveWidget.status === WIDGET_STATUSES.ACTIVE && saveAction === SAVE_ACTIONS.SCHEDULE) {
      setSaveAction(SAVE_ACTIONS.PUBLISH);
    }
  }, [liveWidget.status, saveAction]);

  useEffect(() => {
    if (saveFetcher.data?.toast) shopify.toast.show(saveFetcher.data.toast);
  }, [saveFetcher.data, shopify]);

  useEffect(() => {
    if (saveStatus !== SAVE_STATUS.ERROR || !saveErrors) return;
    const token = JSON.stringify(saveErrors);
    if (seenConfirm.current === `err:${token}`) return;
    seenConfirm.current = `err:${token}`;
    shopify.toast.show("Could not save. Your latest changes are still in the editor.", { isError: true });
  }, [saveStatus, saveErrors, shopify]);

  useEffect(() => {
    if (saveFetcher.state !== "idle" || saveFetcher.data?.errors) return;
    if (saveFetcher.data?.conflict) {
      const key = `conflict:${saveFetcher.data.widget?.updatedAt}:${saveFetcher.data.conflict.mode}`;
      if (seenConfirm.current === key) return;
      seenConfirm.current = key;
      setConflict(saveFetcher.data.conflict);
      return;
    }
    if (!saveFetcher.data?.confirm) return;
    const key = `save:${saveFetcher.data.widget?.updatedAt}:${saveFetcher.data.confirm.kind}`;
    if (seenConfirm.current === key) return;
    seenConfirm.current = key;
    setConfirm({
      kind: saveFetcher.data.confirm.kind,
      name: saveFetcher.data.widget?.name || draft.name,
      scheduledLabel: formatScheduleLabel(saveFetcher.data.confirm.scheduledAt),
    });
  }, [saveFetcher.state, saveFetcher.data, draft.name]);

  useEffect(() => {
    const notice = liveWidget.messageConfig?.liveNotice;
    if (!notice || liveWidget.status !== WIDGET_STATUSES.ACTIVE) return;
    const key = `live:${liveWidget.id}:${notice}`;
    if (seenConfirm.current === key) return;
    seenConfirm.current = key;
    setConfirm({
      kind: "live",
      name: liveWidget.name || draft.name,
      fromSchedule: true,
    });
  }, [liveWidget.id, liveWidget.status, liveWidget.messageConfig?.liveNotice, liveWidget.name, draft.name]);

  useEffect(() => {
    if (!activationConflict?.conflicts?.length || conflict) return;
    const key = `activation:${liveWidget.id}:${activationConflict.dueAt || ""}`;
    if (seenConfirm.current === key) return;
    seenConfirm.current = key;
    setConflict({
      mode: "activation",
      location: liveWidget.location || widget.location,
      widgetId: liveWidget.id,
      widgetName: liveWidget.name || draft.name,
      placementLabel: null,
      conflicts: activationConflict.conflicts,
    });
  }, [activationConflict, conflict, liveWidget.id, liveWidget.name, liveWidget.location, widget.location, draft.name]);

  const goTab = (id) => {
    if (id === tab) return;
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

  const submitIntent = (intent, extras = {}) => {
    queueSave(intent, extras);
  };

  const submitSave = () => {
    if (saveAction === SAVE_ACTIONS.SCHEDULE) {
      const parsed = parseScheduleInput(scheduleAt);
      if (parsed.error) {
        shopify.toast.show(parsed.error, { isError: true });
        return;
      }
      submitIntent("save", {
        saveAction,
        scheduledPublishAt: parsed.when.toISOString(),
      });
      return;
    }
    submitIntent("save", { saveAction });
  };

  const resolveConflict = (keepWidgetId) => {
    if (!conflict || saving) return;
    resolvingConflict.current = true;
    conflictSubmitStarted.current = false;
    submitIntent("resolve-conflict", {
      keepWidgetId,
      conflictMode: conflict.mode === "activation" ? "activation" : "publish",
      saveAction: SAVE_ACTIONS.PUBLISH,
    });
  };

  useEffect(() => {
    if (!resolvingConflict.current) return;
    if (saveFetcher.state !== "idle") {
      conflictSubmitStarted.current = true;
      return;
    }
    if (!conflictSubmitStarted.current) return;
    resolvingConflict.current = false;
    conflictSubmitStarted.current = false;
    if (!saveFetcher.data?.errors) setConflict(null);
  }, [saveFetcher.state, saveFetcher.data]);

  const previewMessage = draft.messageConfig;
  const position = normalizePosition(widget.location, draft.placementConfig?.position);
  const editorUrl = widget.location === "CHECKOUT" ? "" : themeEditorUrl;

  return (
    <s-page heading={draft.name || widget.name} inlineSize="large">
      <AppLink
        slot="breadcrumb-actions"
        to="/app"
        onClick={() => rememberHomeFocusWidget(widget.id)}
      >
        Home
      </AppLink>
      <ActionButton
        slot="primary-action"
        variant="primary"
        {...(saving ? { loading: true } : {})}
        onClick={submitSave}
      >
        Save
      </ActionButton>

      <div className="edd-page edd-page--wide">
      <s-stack gap="base">
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-text color="subdued">
            {profile.editorHeading} · {locationLabel(widget.location)}
          </s-text>
          {published ? (
            <s-badge tone="success">Live</s-badge>
          ) : scheduled ? (
            <s-badge tone="info">
              {remainingMs != null && remainingMs <= 0
                ? "Going live"
                : `Scheduled${countdown && countdown !== "now" ? ` · ${countdown}` : ""}`}
            </s-badge>
          ) : (
            <s-badge>Draft</s-badge>
          )}
          <SaveStatus status={saveStatus} onRetry={retry} />
        </s-stack>
      {widget.location === "CHECKOUT" ? (
        <s-banner tone="warning" heading="Checkout placement is no longer available">
          Shopify only supports checkout UI extensions on Plus. Product and cart widgets still work on all plans. Unpublish or delete this widget.
        </s-banner>
      ) : (
        <EmbedActivateBanner />
      )}
      {published ? (
        <s-banner tone="success">
          Estimated delivery widget was successfully published in your store.
          {storefrontUrl || editorUrl ? (
            <s-stack direction="inline" gap="base">
              {storefrontUrl ? (
                <s-link href={storefrontUrl} target="_blank">
                  Preview in store
                </s-link>
              ) : null}
              {editorUrl ? (
                <s-link href={editorUrl} target="_blank">
                  Reposition in theme editor
                </s-link>
              ) : null}
            </s-stack>
          ) : null}
        </s-banner>
      ) : scheduled ? (
        <s-banner tone="info">
          {remainingMs != null && remainingMs <= 0
            ? "Scheduled time reached. Publishing to the storefront now."
            : `Scheduled to publish ${scheduledLabel ? `on ${scheduledLabel}` : "later"}${countdown && countdown !== "now" ? ` · goes live in ${countdown}` : ""}. It stays hidden on the ${pageLabel} until then.`}
        </s-banner>
      ) : null}
      {saveStatus === SAVE_STATUS.ERROR ? (
        <s-banner tone="critical" heading="Changes were not saved">
          Fix the highlighted fields below, then save again. The storefront will keep using the last saved
          values until this save succeeds.
          <s-stack direction="inline" gap="base" paddingBlockStart="small-200">
            <ActionButton type="button" variant="primary" onClick={retry}>
              Retry save
            </ActionButton>
          </s-stack>
        </s-banner>
      ) : null}
      <ErrorBanner errors={saveErrors || errors} />

      <div className="edd-tabs-row">
        <nav className="edd-tabs" aria-label="Widget settings">
          {EDITOR_TABS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="edd-tab"
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => goTab(item.id)}
            >
              <span className="edd-tab__index">{index + 1}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="edd-editor">
        <div className="edd-editor__form">
          {visitedTabs.has("conditions") ? (
            <div className="edd-editor__panel" hidden={tab !== "conditions"}>
              <ConditionsTab
                widget={widget}
                draft={draft}
                onChange={setDraft}
                errors={saveErrors || errors}
                deliveryRequests={deliveryRequests}
              />
            </div>
          ) : null}
          {visitedTabs.has("design") ? (
            <div className="edd-editor__panel" hidden={tab !== "design"}>
              <DesignTab widget={widget} draft={draft} onChange={setDraft} errors={saveErrors || errors} />
            </div>
          ) : null}
          {visitedTabs.has("placement") ? (
            <div className="edd-editor__panel" hidden={tab !== "placement"}>
              <PlacementTab
                widget={widget}
                draft={draft}
                onChange={setDraft}
                errors={saveErrors || errors}
                liveProductWidgets={liveProductWidgets}
              />
            </div>
          ) : null}
          <div className="edd-editor__footer">
            <WidgetStatusPicker
              location={widget.location}
              value={saveAction}
              onChange={setSaveAction}
              scheduleAt={scheduleAt}
              onScheduleAtChange={setScheduleAt}
            />
            <s-button-group gap="base">
              {next ? (
                <ActionButton type="button" variant="secondary" onClick={() => goTab(next.id)}>
                  {next.label}
                </ActionButton>
              ) : null}
              <ActionButton
                type="button"
                variant="primary"
                {...(saving ? { loading: true } : {})}
                onClick={submitSave}
              >
                Save
              </ActionButton>
              {published || scheduled ? (
                <ActionButton type="button" variant="tertiary" onClick={() => submitIntent("unpublish")}>
                  {scheduled ? "Cancel schedule" : "Unpublish"}
                </ActionButton>
              ) : null}
            </s-button-group>
          </div>
        </div>
        <aside className="edd-editor__preview" aria-label="Live preview">
          <s-box padding="base" border="base" borderRadius="base" background="subdued">
            <div className="edd-preview-toolbar">
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-badge tone="success">Live preview</s-badge>
              </s-stack>
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
                cartDisplayMode={draft.cartConfig?.displayMode}
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
                showHeading={previewMessage.headingEnabled !== false}
              />
            </div>
          </s-box>
        </aside>
      </div>
      </s-stack>
      </div>

      <WidgetConfirmDialog
        kind={confirm?.kind}
        name={confirm?.name || draft.name || widget.name}
        location={widget.location}
        scheduledLabel={confirm?.scheduledLabel}
        onClose={() => {
          const focusId = saveFetcher.data?.widget?.id || widget.id;
          if (confirm?.kind === "live") submitIntent("ack-live");
          if (focusId) rememberHomeFocusWidget(focusId);
          setConfirm(null);
          navigate(focusId ? `/app?widget=${encodeURIComponent(focusId)}` : "/app");
        }}
      />
      <PlacementConflictDialog
        open={Boolean(conflict)}
        title={
          conflictDialogCopy(
            conflict?.location || widget.location,
            conflict?.mode === "activation" ? "activation" : "publish",
          ).title
        }
        body={
          conflictDialogCopy(
            conflict?.location || widget.location,
            conflict?.mode === "activation" ? "activation" : "publish",
          ).body
        }
        candidate={{
          id: widget.id,
          name: conflict?.widgetName || draft.name || widget.name,
          placementLabel: conflict?.placementLabel || "This widget",
        }}
        conflicts={conflict?.conflicts || []}
        confirming={saving}
        onCancel={() => setConflict(null)}
        onChoose={(keepWidgetId) => resolveConflict(keepWidgetId)}
      />
    </s-page>
  );
}
