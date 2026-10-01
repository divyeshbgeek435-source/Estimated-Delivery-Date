import { DeliveryIcon } from "../icons/DeliveryIcon";
import { FormattedText } from "./FormattedText";
import { EditableHotspot } from "../editor/EditableHotspot";
import { TimelineConnector } from "./TimelineConnector";
import {
  connectorCssVars,
  isDefaultConnector,
  normalizeConnectorStyle,
  resolveConnectorColor,
} from "../../lib/connector-styles";
import { Fragment } from "react";

function useTemplateConnector(trackerSettings, progress) {
  const connector = normalizeConnectorStyle(trackerSettings?.connector);
  const custom = !isDefaultConnector(connector);
  const color = resolveConnectorColor(connector, {
    fallback: progress || "#202223",
    prevStatus: "complete",
    nextStatus: "active",
    state: "active",
  });
  return {
    connector,
    custom,
    vars: custom ? connectorCssVars(connector, { color }) : null,
    color,
  };
}

function RailConnectorOverlay({ connector, progress, steps }) {
  if (!steps?.length || steps.length < 2) {
    return (
      <TimelineConnector
        className="edd-anim__rail-connector"
        connector={connector}
        fallbackColor={progress}
        prevStatus="complete"
        nextStatus="active"
      />
    );
  }
  return (
    <div className="edd-anim__connectors">
      {steps.slice(0, -1).map((step, index) => (
        <TimelineConnector
          key={`rail-c-${step.key}`}
          className="edd-anim__rail-connector"
          connector={connector}
          fallbackColor={progress}
          prevStatus={step.status || "complete"}
          nextStatus={steps[index + 1]?.status || "pending"}
        />
      ))}
    </div>
  );
}

function BetweenStepConnector({ connector, progress, prev, next, custom }) {
  if (!custom) return null;
  return (
    <TimelineConnector
      className="edd-anim__between"
      connector={connector}
      fallbackColor={progress}
      prevStatus={prev?.status || "complete"}
      nextStatus={next?.status || "pending"}
    />
  );
}

function stepTextStyles(step, { statusColor, dateColor, statusSize, dateSize, labelBase = {}, dateBase = {} } = {}) {
  return {
    label: {
      ...labelBase,
      color: step.labelColor || statusColor,
      ...(step.labelFontSize != null ? { fontSize: `${step.labelFontSize}px` } : statusSize ? { fontSize: `${statusSize}px` } : null),
    },
    date: {
      ...dateBase,
      color: step.dateColor || dateColor,
      ...(step.dateFontSize != null ? { fontSize: `${step.dateFontSize}px` } : dateSize ? { fontSize: `${dateSize}px` } : null),
    },
  };
}

function decoratePart(part, node) {
  let next = node;
  if (part.underline) next = <u>{next}</u>;
  if (part.italic) next = <em>{next}</em>;
  if (part.bold && !part.highlight) next = <strong>{next}</strong>;
  return next;
}

function JourneyRange({ label, color }) {
  const text = String(label || "").trim();
  if (!text) return null;
  const parts = text.split(/\s+-\s+|\s+to\s+/i);
  if (parts.length === 2) {
    let [start, end] = parts;
    if (/^\d/.test(end) && /^[A-Za-z]/.test(start)) {
      end = `${start.split(/\s+/)[0]} ${end}`;
    }
    return (
      <>
        <strong style={{ color }}>{start}</strong>
        {" to "}
        <strong style={{ color }}>{end}</strong>
      </>
    );
  }
  return <strong style={{ color }}>{text}</strong>;
}

function needsSpace(previous, next) {
  if (!previous || !next || previous.type === "image" || next.type === "image") return false;
  const left = String(previous.text || "");
  const right = String(next.text || "");
  if (!left || !right) return false;
  return !/\s$/.test(left) && !/^[\s,.;:!?)]/.test(right);
}

function MessageParts({ segments, accentColor }) {
  if (!segments?.length) return null;
  return segments.map((part, index) => {
    const space = needsSpace(segments[index - 1], part) ? " " : "";
    if (part.type === "image") {
      if (!part.src) return null;
      return <img key={index} className="edd-inline-image" src={part.src} alt="" />;
    }
    if (part.highlight) {
      return (
        <strong key={index} style={accentColor ? { color: accentColor } : undefined}>
          {space}
          {decoratePart(part, part.text)}
        </strong>
      );
    }
    return (
      <span key={index}>
        {space}
        {decoratePart(part, part.text)}
      </span>
    );
  });
}

function StepIcon({ step, className = "", truck = false }) {
  return (
    <span
      className={`${className}${truck ? " is-truck" : ""}${step.enabled === false ? " is-icon-hidden" : ""}`}
      style={{ color: step.color }}
      aria-hidden={step.enabled === false ? true : undefined}
    >
      <DeliveryIcon key={step.icon} name={step.icon} color={step.color} />
    </span>
  );
}

function stepShellClass(base, step, extra = "") {
  return `${base}${extra}${step.enabled === false ? " is-icon-off" : ""}`;
}

function StepCaption({ children }) {
  return <div className="edd-anim__caption">{children}</div>;
}

function DescriptionBlock({
  show,
  segments,
  accentColor,
  className = "edd-anim__lead",
  style: extraStyle,
  interactive = false,
  selectedElement,
  onSelectElement,
  onElementContentChange,
  descriptionTemplate = "",
}) {
  if (!show) return null;
  const editing = interactive && selectedElement === "description";
  if (!segments?.length && !editing) return null;
  return (
    <EditableHotspot
      as="p"
      className={className}
      elementId="description"
      interactive={interactive}
      selectedElement={selectedElement}
      onSelect={onSelectElement}
      style={{ ...(accentColor ? { color: accentColor } : null), ...extraStyle }}
      contentEditable
      value={descriptionTemplate}
      onChange={(value) => onElementContentChange?.("description", value)}
    >
      {editing ? (
        descriptionTemplate
      ) : (
        <MessageParts segments={segments} accentColor={accentColor} />
      )}
    </EditableHotspot>
  );
}

export function AnimatedEtaTemplate({
  design,
  steps,
  headingText,
  showHeading = true,
  headingWeight = 600,
  deliveredRange,
  style,
  textColor,
  theme,
  progress,
  headerEnabled,
  headerIcon,
  showDescription = false,
  descriptionSegments = [],
  trackerSettings = {},
  interactive = false,
  selectedElement = null,
  onSelectElement,
  onElementContentChange,
  descriptionTemplate = "",
  titleStyleOverride,
  descriptionStyleOverride,
  stepLabelStyleOverride,
  stepDateStyleOverride,
}) {
  const accent = style.dynamicColor || style.dateColor || progress || theme;
  const status = style.statusColor || textColor;
  const date = style.dateColor || accent;
  const statusSize = style.statusFontSize;
  const dateSize = style.dateFontSize;
  const titleStyle = { fontWeight: headingWeight, ...(titleStyleOverride || {}) };
  const titleOn = showHeading !== false;
  const descStyle = descriptionStyleOverride || {};
  const labelStyleBase = stepLabelStyleOverride || {};
  const dateStyleBase = stepDateStyleOverride || {};
  const textForStep = (step) =>
    stepTextStyles(step, {
      statusColor: status,
      dateColor: date,
      statusSize,
      dateSize,
      labelBase: labelStyleBase,
      dateBase: dateStyleBase,
    });
  const trackSettings = {
    showTrack: trackerSettings.showTrack !== false,
    trackShellBg: trackerSettings.trackShellBg || "#FFFFFF",
    trackShellBorder: trackerSettings.trackShellBorder || "#DEDEDE",
    trackShellRadius: Number(trackerSettings.trackShellRadius) || 12,
    circleStyle: trackerSettings.circleStyle || "filled",
    progressStyle: trackerSettings.progressStyle || "solid",
    animationEnabled: trackerSettings.animationEnabled !== false,
    stackOnMobile: trackerSettings.stackOnMobile !== false,
  };
  const { connector, custom: customConnectors } = useTemplateConnector(trackerSettings, progress);
  const descProps = {
    interactive,
    selectedElement,
    onSelectElement,
    onElementContentChange,
    descriptionTemplate,
    style: descStyle,
  };

  if (design === "MOMENT") {
    return (
      <div key="moment" className="edd-anim edd-anim--moment">
        <div className="edd-anim__copy">
          {titleOn || headerEnabled ? (
            <p className="edd-anim__eyebrow" style={titleOn ? titleStyle : undefined}>
              {headerEnabled ? (
                <span className="edd-anim__header-icon" style={{ color: theme }}>
                  <DeliveryIcon name={headerIcon || "flag"} color={theme} />
                </span>
              ) : null}
              {titleOn ? <FormattedText value={headingText} /> : null}
            </p>
          ) : null}
          <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} {...descProps} />
        </div>
        <div className={`edd-anim__rail-wrap${customConnectors ? " edd-anim__rail-wrap--custom" : ""}`}>
          {customConnectors ? (
            <RailConnectorOverlay connector={connector} progress={progress} steps={steps} />
          ) : (
            <>
              <span className="edd-anim__rail edd-anim__rail--dashed" style={{ color: progress }} aria-hidden="true" />
              <span className="edd-anim__rail-fill" style={{ background: progress }} aria-hidden="true" />
            </>
          )}
          <div className="edd-anim__nodes">
            {steps.map((step, index) => (
              <span
                key={step.key}
                className={`edd-anim__node${index === 0 ? " is-hollow" : ""}`}
                style={{ borderColor: progress, background: index === 0 ? "#fff" : progress, animationDelay: `${180 + index * 120}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="edd-anim__steps">
          {steps.map((step, index) => (
            <div key={step.key} className={stepShellClass("edd-anim__step", step)} style={{ animationDelay: `${220 + index * 120}ms` }}>
                <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
              <StepCaption>
                <span className="edd-anim__label" style={textForStep(step).label}>
                  {step.title}
                </span>
                <strong className="edd-anim__date" style={textForStep(step).date}>
                  {step.date}
                </strong>
              </StepCaption>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (design === "BUBBLE") {
    return (
      <div key="bubble" className="edd-anim edd-anim--bubble">
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
        <div className="edd-anim__banner">
          <span>
            {titleOn ? <span style={titleStyle}><FormattedText value={headingText || "Delivery Date"} /> </span> : null}
            <JourneyRange label={deliveredRange} color={textColor} />
          </span>
          {headerEnabled ? (
            <span className="edd-anim__banner-icon" style={{ color: theme }}>
              <DeliveryIcon name={headerIcon || "bag"} color={theme} />
            </span>
          ) : null}
        </div>
        <div className={`edd-anim__bubble-shell${customConnectors ? " edd-anim__bubble-shell--custom" : ""}`}>
          {customConnectors ? (
            <RailConnectorOverlay connector={connector} progress={progress} steps={steps} />
          ) : (
            <span className="edd-anim__rail edd-anim__rail--solid" style={{ background: progress }} aria-hidden="true" />
          )}
          <div className="edd-anim__steps">
            {steps.map((step, index) => (
              <div key={step.key} className={stepShellClass("edd-anim__step", step)} style={{ animationDelay: `${180 + index * 110}ms` }}>
                <span
                  className={`edd-anim__bubble${index === 1 ? " is-truck" : ""}${step.enabled === false ? " is-icon-hidden" : ""}`}
                  style={{ color: step.color }}
                  aria-hidden={step.enabled === false ? true : undefined}
                >
                  <DeliveryIcon key={step.icon} name={step.icon} color={step.color} />
                </span>
                <StepCaption>
                  <span className="edd-anim__label" style={textForStep(step).label}>
                    {step.title}
                  </span>
                  <strong className="edd-anim__date" style={textForStep(step).date}>
                    {step.date}
                  </strong>
                </StepCaption>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (design === "EXPRESS") {
    return (
      <div
        key="express"
        className={`edd-anim edd-anim--express${trackSettings.animationEnabled ? "" : " is-static"}${
          trackSettings.stackOnMobile ? " edd-anim--express-responsive" : ""
        }`}
      >
        <div className="edd-anim__express-head">
          {headerEnabled ? (
            <EditableHotspot
              as="span"
              className="edd-anim__express-clock"
              elementId="headerIcon"
              interactive={interactive}
              selectedElement={selectedElement}
              onSelect={onSelectElement}
              style={{ color: theme }}
            >
              <DeliveryIcon name={headerIcon || "clock"} color={theme} />
            </EditableHotspot>
          ) : null}
          <div>
            {titleOn && headingText ? (
              <EditableHotspot
                as="p"
                className="edd-anim__express-title"
                elementId="title"
                interactive={interactive}
                selectedElement={selectedElement}
                onSelect={onSelectElement}
                style={titleStyle}
                contentEditable
                value={headingText}
                onChange={(value) => onElementContentChange?.("title", value)}
              >
                <FormattedText value={headingText} />
              </EditableHotspot>
            ) : null}
            {showDescription && descriptionSegments?.length ? (
              <DescriptionBlock
                show
                segments={descriptionSegments}
                accentColor={accent}
                className="edd-anim__express-sub"
                {...descProps}
              />
            ) : showDescription ? (
              <EditableHotspot
                as="p"
                className="edd-anim__express-sub"
                elementId="description"
                interactive={interactive}
                selectedElement={selectedElement}
                onSelect={onSelectElement}
                style={descStyle}
                contentEditable
                value={descriptionTemplate}
                onChange={(value) => onElementContentChange?.("description", value)}
              >
                Estimated Delivery Date <JourneyRange label={deliveredRange} color={textColor} />
              </EditableHotspot>
            ) : null}
          </div>
        </div>
        {trackSettings.showTrack ? (
          <div
            className="edd-anim__express-shell"
            style={{
              background: trackSettings.trackShellBg,
              borderColor: trackSettings.trackShellBorder,
              borderRadius: `${trackSettings.trackShellRadius}px`,
              ["--edd-step-count"]: Math.max(1, steps.length),
            }}
          >
            {customConnectors ? (
              <RailConnectorOverlay connector={connector} progress={progress} steps={steps} />
            ) : (
              <EditableHotspot
                as="span"
                className={`edd-anim__rail edd-anim__rail--${trackSettings.progressStyle === "dashed" ? "dashed" : "solid"}`}
                elementId="progress"
                interactive={interactive}
                selectedElement={selectedElement}
                onSelect={onSelectElement}
                style={
                  trackSettings.progressStyle === "dashed"
                    ? { color: progress }
                    : { background: progress }
                }
                aria-hidden={!interactive}
              />
            )}
            <div className="edd-anim__steps" style={{ ["--edd-step-count"]: Math.max(1, steps.length) }}>
              {steps.map((step, index) => {
                const filled = trackSettings.circleStyle === "filled";
                const stepStatus = step.status || (index === 0 ? "complete" : index === 1 ? "active" : "pending");
                return (
                  <div
                    key={step.key}
                    className={stepShellClass(`edd-anim__step is-${stepStatus}`, step)}
                    style={{ animationDelay: trackSettings.animationEnabled ? `${180 + index * 110}ms` : "0ms" }}
                  >
                    <EditableHotspot
                      as="span"
                      className={`edd-anim__circle${index === 1 ? " is-truck" : ""}${step.enabled === false ? " is-icon-hidden" : ""}`}
                      elementId="stepIcon"
                      stepIndex={index}
                      interactive={interactive}
                      selectedElement={selectedElement}
                      onSelect={onSelectElement}
                      style={
                        filled
                          ? { background: step.color || progress, color: "#fff", borderColor: step.color || progress }
                          : {
                              background: "#fff",
                              color: step.color || progress,
                              border: `2px solid ${step.color || progress}`,
                            }
                      }
                      aria-hidden={step.enabled === false ? true : undefined}
                    >
                      <DeliveryIcon
                        key={step.icon}
                        name={step.icon}
                        color={filled ? "#fff" : step.color || progress}
                      />
                    </EditableHotspot>
                    <StepCaption>
                      <EditableHotspot
                        as="span"
                        className="edd-anim__label"
                        elementId="stepLabel"
                        stepIndex={index}
                        interactive={interactive}
                        selectedElement={selectedElement}
                        onSelect={onSelectElement}
                        style={textForStep(step).label}
                        contentEditable
                        value={step.title}
                        onChange={(value) => onElementContentChange?.(`stepLabel:${index}`, value)}
                      >
                        {step.title}
                      </EditableHotspot>
                      <EditableHotspot
                        as="strong"
                        className="edd-anim__date"
                        elementId="stepDate"
                        stepIndex={index}
                        interactive={interactive}
                        selectedElement={selectedElement}
                        onSelect={onSelectElement}
                        style={textForStep(step).date}
                      >
                        {step.date}
                      </EditableHotspot>
                    </StepCaption>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (design === "SEGMENTS") {
    return (
      <div key="segments" className="edd-anim edd-anim--segments-wrap">
        {(titleOn || headerEnabled) ? (
          <div className="edd-anim__title-row">
            {headerEnabled ? (
              <span className="edd-anim__header-icon" style={{ color: theme }}>
                <DeliveryIcon name={headerIcon || "flag"} color={theme} />
              </span>
            ) : null}
            {titleOn ? (
              <p className="edd-anim__title" style={titleStyle}>
                <FormattedText value={headingText} />
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
        <div className={`edd-anim edd-anim--segments${customConnectors ? " edd-anim--segments-connected" : ""}`}>
          {steps.map((step, index) => (
            <Fragment key={step.key}>
              {index > 0 ? (
                <BetweenStepConnector
                  connector={connector}
                  progress={progress}
                  prev={steps[index - 1]}
                  next={step}
                  custom={customConnectors}
                />
              ) : null}
              <div className={stepShellClass("edd-anim__segment", step)} style={{ animationDelay: `${120 + index * 100}ms` }}>
                <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
                <StepCaption>
                  <span className="edd-anim__label" style={textForStep(step).label}>
                    {step.title}
                  </span>
                  <strong className="edd-anim__date" style={textForStep(step).date}>
                    {step.date}
                  </strong>
                </StepCaption>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (design === "METER") {
    return (
      <div key="meter" className="edd-anim edd-anim--meter">
        {(titleOn || headerEnabled) ? (
          <div className="edd-anim__title-row">
            {headerEnabled ? (
              <span className="edd-anim__header-icon" style={{ color: theme }}>
                <DeliveryIcon name={headerIcon || "flag"} color={theme} />
              </span>
            ) : null}
            {titleOn ? (
              <p className="edd-anim__title" style={titleStyle}>
                <FormattedText value={headingText} />
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
        <div className={`edd-anim__meter-track${customConnectors ? " edd-anim__meter-track--custom" : ""}`}>
          {customConnectors ? (
            <RailConnectorOverlay connector={connector} progress={progress} steps={steps} />
          ) : (
            <span className="edd-anim__meter-fill" style={{ background: progress }} aria-hidden="true" />
          )}
          <div className="edd-anim__steps">
            {steps.map((step, index) => (
              <div key={step.key} className={stepShellClass("edd-anim__step", step)} style={{ animationDelay: `${160 + index * 120}ms` }}>
                <span
                  className={`edd-anim__meter-dot${index === 0 ? " is-active" : ""}${index === 1 ? " is-truck" : ""}${step.enabled === false ? " is-icon-hidden" : ""}`}
                  style={{ borderColor: progress, background: index === 0 ? progress : "#fff", color: index === 0 ? "#fff" : step.color }}
                  aria-hidden={step.enabled === false ? true : undefined}
                >
                  <DeliveryIcon key={step.icon} name={step.icon} color={index === 0 ? "#fff" : step.color} />
                </span>
                <StepCaption>
                  <span className="edd-anim__label" style={textForStep(step).label}>
                    {step.title}
                  </span>
                  <strong className="edd-anim__date" style={textForStep(step).date}>
                    {step.date}
                  </strong>
                </StepCaption>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (design === "BAND") {
    return (
      <div key="band" className="edd-anim edd-anim--band-wrap">
        {(titleOn || headerEnabled) ? (
          <div className="edd-anim__title-row">
            {headerEnabled ? (
              <span className="edd-anim__header-icon" style={{ color: theme }}>
                <DeliveryIcon name={headerIcon || "flag"} color={theme} />
              </span>
            ) : null}
            {titleOn ? (
              <p className="edd-anim__title" style={titleStyle}>
                <FormattedText value={headingText} />
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
        <div className={`edd-anim edd-anim--band${customConnectors ? " edd-anim--band-connected" : ""}`} style={{ borderColor: progress }}>
          {steps.map((step, index) => (
            <Fragment key={step.key}>
              {index > 0 ? (
                <BetweenStepConnector
                  connector={connector}
                  progress={progress}
                  prev={steps[index - 1]}
                  next={step}
                  custom={customConnectors}
                />
              ) : null}
              <div className={stepShellClass("edd-anim__band-step", step)} style={{ animationDelay: `${140 + index * 110}ms` }}>
                <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
                <StepCaption>
                  <span className="edd-anim__label" style={textForStep(step).label}>
                    {step.title}
                  </span>
                  <strong className="edd-anim__date" style={textForStep(step).date}>
                    {step.date}
                  </strong>
                </StepCaption>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (design === "HERO") {
    return (
      <div key="hero" className="edd-anim edd-anim--hero">
        {titleOn ? (
          <p className="edd-anim__hero-label" style={titleStyle}>
            <FormattedText value={headingText} />
          </p>
        ) : null}
        <p className="edd-anim__hero-date" style={{ color: date }}>
          <JourneyRange label={deliveredRange} color={date} />
        </p>
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead" {...descProps} />
        <div className={`edd-anim__hero-steps${customConnectors ? " edd-anim__hero-steps--connected" : ""}`}>
          {steps.map((step, index) => (
            <Fragment key={step.key}>
              {index > 0 ? (
                <BetweenStepConnector
                  connector={connector}
                  progress={progress}
                  prev={steps[index - 1]}
                  next={step}
                  custom={customConnectors}
                />
              ) : null}
              <div className={stepShellClass("edd-anim__hero-step", step)} style={{ animationDelay: `${120 + index * 90}ms` }}>
                <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
                <StepCaption>
                  <span className="edd-anim__label" style={textForStep(step).label}>
                    {step.title}
                  </span>
                </StepCaption>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (design === "DROP") {
    return (
      <div key="drop" className="edd-anim edd-anim--drop">
        <div className="edd-anim__drop-top">
          {headerEnabled ? (
            <span className="edd-anim__header-icon" style={{ color: theme }}>
              <DeliveryIcon name={headerIcon || "flag"} color={theme} />
            </span>
          ) : null}
          {titleOn ? (
            <p className="edd-anim__drop-label" style={titleStyle}>
              <FormattedText value={headingText} />
            </p>
          ) : null}
        </div>
        <div className="edd-anim__drop-badge" style={{ borderColor: progress, color: date }}>
          <JourneyRange label={deliveredRange} color={date} />
        </div>
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead" {...descProps} />
      </div>
    );
  }

  if (design === "CLEAN") {
    return (
      <div key="minimal" className="edd-anim edd-anim--minimal">
        {titleOn ? (
          <p className="edd-anim__minimal-label" style={{ ...titleStyle, color: status }}>
            <FormattedText value={headingText} />
          </p>
        ) : null}
        <p className="edd-anim__minimal-date" style={{ color: date }}>
          <JourneyRange label={deliveredRange} color={date} />
        </p>
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead" {...descProps} />
      </div>
    );
  }

  if (design === "CHECKLIST") {
    return (
      <div key="checklist" className="edd-anim edd-anim--checklist">
        {(titleOn || headerEnabled) ? (
          <div className="edd-anim__title-row">
            {headerEnabled ? (
              <span className="edd-anim__header-icon" style={{ color: theme }}>
                <DeliveryIcon name={headerIcon || "check"} color={theme} />
              </span>
            ) : null}
            {titleOn ? (
              <p className="edd-anim__title" style={titleStyle}>
                <FormattedText value={headingText} />
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
        <div className="edd-anim__checklist">
          {steps.map((step, index) => (
            <div key={step.key} className={`edd-anim__check-row${step.enabled === false ? " is-icon-off" : ""}`} style={{ animationDelay: `${100 + index * 80}ms` }}>
              <span
                className={`edd-anim__check-mark${step.enabled === false ? " is-icon-hidden" : ""}`}
                style={{ borderColor: progress, color: progress }}
                aria-hidden={step.enabled === false ? true : undefined}
              >
                <DeliveryIcon name="check" color={progress} />
              </span>
              <span className="edd-anim__label" style={textForStep(step).label}>
                {step.title}
              </span>
              <strong className="edd-anim__date" style={textForStep(step).date}>
                {step.date}
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (design === "PICKUP") {
    return (
      <div key="pickup" className="edd-anim edd-anim--pickup">
        <div className="edd-anim__pickup-stub" style={{ background: progress }}>
          {headerEnabled ? (
            <span className="edd-anim__pickup-icon">
              <DeliveryIcon name={headerIcon || "pin"} color="#fff" />
            </span>
          ) : null}
          <span>PICKUP</span>
        </div>
        <div className="edd-anim__pickup-body">
          {titleOn ? (
            <p className="edd-anim__title" style={titleStyle}>
              <FormattedText value={headingText} />
            </p>
          ) : null}
          <p className="edd-anim__pickup-date" style={{ color: date }}>
            <JourneyRange label={deliveredRange} color={date} />
          </p>
          <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead" {...descProps} />
          <div className="edd-anim__pickup-steps">
            {steps.map((step) => (
              <span key={step.key} className="edd-anim__pickup-chip" style={{ color: status, borderColor: progress }}>
                {step.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (design === "PREORDER") {
    return (
      <div key="preorder" className="edd-anim edd-anim--preorder">
        {(titleOn || headerEnabled) ? (
          <div className="edd-anim__title-row">
            {headerEnabled ? (
              <span className="edd-anim__header-icon" style={{ color: theme }}>
                <DeliveryIcon name={headerIcon || "calendar"} color={theme} />
              </span>
            ) : null}
            {titleOn ? (
              <p className="edd-anim__title" style={titleStyle}>
                <FormattedText value={headingText} />
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
        <div className={`edd-anim__preorder-rail${customConnectors ? " edd-anim__preorder-rail--custom" : ""}`}>
          {customConnectors ? (
            <RailConnectorOverlay connector={connector} progress={progress} steps={steps} />
          ) : (
            <span className="edd-anim__preorder-line" style={{ background: progress }} aria-hidden="true" />
          )}
          {steps.map((step, index) => (
            <div key={step.key} className="edd-anim__preorder-step" style={{ animationDelay: `${120 + index * 100}ms` }}>
              <span className="edd-anim__preorder-dot" style={{ borderColor: progress, background: index === 0 ? progress : "#fff" }} />
              <div>
                <span className="edd-anim__label" style={textForStep(step).label}>
                  {step.title}
                </span>
                <strong className="edd-anim__date" style={textForStep(step).date}>
                  {step.date}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (design === "WHOLESALE") {
    return (
      <div key="wholesale" className="edd-anim edd-anim--wholesale">
        <div className="edd-anim__wholesale-aside" style={{ borderColor: progress }}>
          {headerEnabled ? (
            <span className="edd-anim__header-icon" style={{ color: theme }}>
              <DeliveryIcon name={headerIcon || "box"} color={theme} />
            </span>
          ) : null}
          {titleOn ? (
            <p className="edd-anim__title" style={titleStyle}>
              <FormattedText value={headingText} />
            </p>
          ) : null}
          <p className="edd-anim__wholesale-date" style={{ color: date }}>
            <JourneyRange label={deliveredRange} color={date} />
          </p>
        </div>
        <div className="edd-anim__wholesale-main">
          <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
          <div className={`edd-anim__wholesale-steps${customConnectors ? " edd-anim__wholesale-steps--connected" : ""}`}>
            {steps.map((step, index) => (
              <Fragment key={step.key}>
                {index > 0 ? (
                  <BetweenStepConnector
                    connector={connector}
                    progress={progress}
                    prev={steps[index - 1]}
                    next={step}
                    custom={customConnectors}
                  />
                ) : null}
                <div className={stepShellClass("edd-anim__wholesale-step", step)} style={{ animationDelay: `${100 + index * 80}ms` }}>
                  <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
                  <StepCaption>
                    <span className="edd-anim__label" style={textForStep(step).label}>
                      {step.title}
                    </span>
                    <strong className="edd-anim__date" style={textForStep(step).date}>
                      {step.date}
                    </strong>
                  </StepCaption>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (design === "CALENDAR") {
    return (
      <div key="calendar" className="edd-anim edd-anim--calendar">
        {(titleOn || headerEnabled) ? (
          <div className="edd-anim__title-row">
            {headerEnabled ? (
              <span className="edd-anim__header-icon" style={{ color: theme }}>
                <DeliveryIcon name={headerIcon || "calendar"} color={theme} />
              </span>
            ) : null}
            {titleOn ? (
              <p className="edd-anim__title" style={titleStyle}>
                <FormattedText value={headingText} />
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" {...descProps} />
        <div className="edd-anim__calendar-grid">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`edd-anim__calendar-card${index === 2 ? " is-focus" : ""}`}
              style={{ borderColor: progress, animationDelay: `${100 + index * 90}ms` }}
            >
              <span className="edd-anim__label" style={textForStep(step).label}>
                {step.title}
              </span>
              <strong className="edd-anim__date" style={textForStep(step).date}>
                {step.date}
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export { MessageParts, JourneyRange };
