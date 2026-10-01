import { useState } from "react";
import {
  normalizeTrackerConfig,
  resolveTrackerConfig,
  syncLegacyIconsFromTracker,
  TRACKER_CIRCLE_STYLES,
  TRACKER_PROGRESS_STYLES,
} from "../../lib/tracker-config";
import { IconMediaPicker } from "../common/IconMediaPicker";

export function TrackerSettingsPanel({
  icons,
  onIconsChange,
  library = [],
  onLibraryChange,
  errors = {},
  embedded = false,
  forcedMode = null,
  emitFormFields = true,
  showIntro = true,
  hideIconPickers = false,
}) {
  const [internalMode, setInternalMode] = useState("basic");
  const mode = forcedMode || internalMode;
  const tracker = resolveTrackerConfig(icons);
  const { steps, settings } = tracker;

  const commit = (nextTracker) => {
    onIconsChange(syncLegacyIconsFromTracker(normalizeTrackerConfig(nextTracker), icons));
  };

  const updateSettings = (patch) => {
    commit({ ...tracker, settings: { ...settings, ...patch } });
  };

  const updateStep = (index, patch) => {
    const nextSteps = steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
    commit({ ...tracker, steps: nextSteps });
  };

  const formFields = emitFormFields ? (
    <>
      <input type="hidden" name="trackerConfig" value={JSON.stringify(tracker)} />
      <input type="hidden" name="purchased" value={icons.purchased || "bag"} />
      <input type="hidden" name="processing" value={icons.processing || "truck"} />
      <input type="hidden" name="delivered" value={icons.delivered || "pin"} />
      <input type="hidden" name="purchasedTitle" value={icons.purchasedTitle || "Purchased"} />
      <input type="hidden" name="processingTitle" value={icons.processingTitle || "Processing"} />
      <input type="hidden" name="deliveredTitle" value={icons.deliveredTitle || "Delivered"} />
      <input type="hidden" name="purchasedEnabled" value={icons.purchasedEnabled !== false ? "true" : "false"} />
      <input type="hidden" name="processingEnabled" value={icons.processingEnabled !== false ? "true" : "false"} />
      <input type="hidden" name="deliveredEnabled" value={icons.deliveredEnabled !== false ? "true" : "false"} />
      <input type="hidden" name="purchasedColor" value={icons.purchasedColor || ""} />
      <input type="hidden" name="processingColor" value={icons.processingColor || ""} />
      <input type="hidden" name="deliveredColor" value={icons.deliveredColor || ""} />
    </>
  ) : null;

  const body = (
    <>
      {showIntro && !forcedMode ? (
        <s-paragraph color="subdued">
          Customize the tracking card. Basic covers everyday edits; Advanced unlocks steps, status, animation, and
          track chrome.
        </s-paragraph>
      ) : null}

      {!forcedMode ? (
        <div className="edd-tracker-settings__tabs" role="tablist" aria-label="Tracker settings mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "basic"}
            className={`edd-tracker-settings__tab${mode === "basic" ? " is-active" : ""}`}
            onClick={() => setInternalMode("basic")}
          >
            Basic
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "advanced"}
            className={`edd-tracker-settings__tab${mode === "advanced" ? " is-active" : ""}`}
            onClick={() => setInternalMode("advanced")}
          >
            Advanced
          </button>
        </div>
      ) : null}

      {mode === "basic" ? (
        <s-stack gap="base">
          <s-checkbox
            label="Show title"
            checked={settings.showTitle}
            onChange={(event) => updateSettings({ showTitle: Boolean(event.currentTarget.checked) })}
          ></s-checkbox>
          <s-checkbox
            label="Show countdown / description"
            checked={settings.showDescription}
            onChange={(event) => updateSettings({ showDescription: Boolean(event.currentTarget.checked) })}
          ></s-checkbox>
          <s-checkbox
            label="Show progress track"
            checked={settings.showTrack}
            onChange={(event) => updateSettings({ showTrack: Boolean(event.currentTarget.checked) })}
          ></s-checkbox>

          {!hideIconPickers ? (
            <div className="edd-tracker-settings__steps">
              {steps.map((step, index) => (
                <div key={step.id} className="edd-tracker-settings__step">
                  <div className="edd-tracker-settings__step-head">
                    <s-text type="strong">Step {index + 1}</s-text>
                    <s-checkbox
                      label="Show icon"
                      checked={step.enabled !== false}
                      onChange={(event) => updateStep(index, { enabled: Boolean(event.currentTarget.checked) })}
                    ></s-checkbox>
                  </div>
                  <s-text-field
                    label="Label"
                    value={step.title}
                    error={errors[`trackerStep${index}Title`]}
                    onInput={(event) => updateStep(index, { title: event.currentTarget.value })}
                  ></s-text-field>
                  <IconMediaPicker
                    title="Icon"
                    value={step.icon}
                    fallback="bag"
                    color={step.color || "#202223"}
                    enabled={step.enabled !== false}
                    library={library}
                    onLibraryChange={onLibraryChange}
                    onEnabledChange={(enabled) => updateStep(index, { enabled })}
                    onChange={(icon) => updateStep(index, { icon })}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </s-stack>
      ) : (
        <s-stack gap="base">
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-color-field
              label="Track card background"
              value={settings.trackShellBg}
              onInput={(event) => updateSettings({ trackShellBg: event.currentTarget.value })}
            ></s-color-field>
            <s-color-field
              label="Track card border"
              value={settings.trackShellBorder}
              onInput={(event) => updateSettings({ trackShellBorder: event.currentTarget.value })}
            ></s-color-field>
          </s-grid>
          <s-number-field
            label="Track card radius"
            min={0}
            max={32}
            step={1}
            suffix="px"
            value={String(settings.trackShellRadius ?? 12)}
            onInput={(event) => updateSettings({ trackShellRadius: Number(event.currentTarget.value) || 0 })}
          ></s-number-field>
          <s-select
            label="Circle style"
            value={settings.circleStyle}
            onChange={(event) => {
              const next = event.currentTarget.values?.[0] || event.currentTarget.value;
              if (next) updateSettings({ circleStyle: next });
            }}
          >
            {TRACKER_CIRCLE_STYLES.map((item) => (
              <s-option key={item.value} value={item.value}>
                {item.label}
              </s-option>
            ))}
          </s-select>
          <s-select
            label="Progress line style"
            value={settings.progressStyle}
            onChange={(event) => {
              const next = event.currentTarget.values?.[0] || event.currentTarget.value;
              if (next) updateSettings({ progressStyle: next });
            }}
          >
            {TRACKER_PROGRESS_STYLES.map((item) => (
              <s-option key={item.value} value={item.value}>
                {item.label}
              </s-option>
            ))}
          </s-select>
          <s-checkbox
            label="Enable step animations"
            checked={settings.animationEnabled}
            onChange={(event) => updateSettings({ animationEnabled: Boolean(event.currentTarget.checked) })}
          ></s-checkbox>
          <s-checkbox
            label="Stack steps on narrow screens"
            checked={settings.stackOnMobile}
            onChange={(event) => updateSettings({ stackOnMobile: Boolean(event.currentTarget.checked) })}
          ></s-checkbox>
        </s-stack>
      )}
      {formFields}
    </>
  );

  if (embedded) {
    return <div className="edd-tracker-settings edd-tracker-settings--embedded">{body}</div>;
  }

  return <s-section heading="Delivery tracker">{body}</s-section>;
}
