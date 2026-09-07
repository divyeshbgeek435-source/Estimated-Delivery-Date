import { DeliveryIcon } from "../icons/DeliveryIcon";

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

function MessageParts({ segments, accentColor }) {
  if (!segments?.length) return null;
  return segments.map((part, index) => {
    if (part.type === "image") {
      if (!part.src) return null;
      return <img key={index} className="edd-inline-image" src={part.src} alt="" />;
    }
    if (part.highlight) {
      return (
        <strong key={index} style={accentColor ? { color: accentColor } : undefined}>
          {part.text}
        </strong>
      );
    }
    return <span key={index}>{part.text}</span>;
  });
}

function StepIcon({ step, className = "", truck = false }) {
  if (!step.enabled) {
    return <span className={`${className} is-off`} aria-hidden="true" />;
  }
  return (
    <span className={`${className}${truck ? " is-truck" : ""}`} style={{ color: step.color }}>
      <DeliveryIcon key={step.icon} name={step.icon} color={step.color} />
    </span>
  );
}

function DescriptionBlock({ show, segments, accentColor, className = "edd-anim__lead" }) {
  if (!show || !segments?.length) return null;
  return (
    <p className={className} style={accentColor ? { color: accentColor } : undefined}>
      <MessageParts segments={segments} accentColor={accentColor} />
    </p>
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
}) {
  const accent = style.dynamicColor || style.dateColor || progress || theme;
  const status = style.statusColor || textColor;
  const date = style.dateColor || accent;
  const titleStyle = { fontWeight: headingWeight };
  const titleOn = showHeading !== false;

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
              {titleOn ? headingText : null}
            </p>
          ) : null}
          <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} />
        </div>
        <div className="edd-anim__rail-wrap">
          <span className="edd-anim__rail edd-anim__rail--dashed" style={{ color: progress }} aria-hidden="true" />
          <span className="edd-anim__rail-fill" style={{ background: progress }} aria-hidden="true" />
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
            <div key={step.key} className="edd-anim__step" style={{ animationDelay: `${220 + index * 120}ms` }}>
              <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
              <span className="edd-anim__label" style={{ color: status }}>
                {step.title}
              </span>
              <strong className="edd-anim__date" style={{ color: date }}>
                {step.date}
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (design === "BUBBLE") {
    return (
      <div key="bubble" className="edd-anim edd-anim--bubble">
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" />
        <div className="edd-anim__banner">
          <span>
            {titleOn ? <span style={titleStyle}>{headingText || "Delivery Date"} </span> : null}
            <JourneyRange label={deliveredRange} color={textColor} />
          </span>
          {headerEnabled ? (
            <span className="edd-anim__banner-icon" style={{ color: theme }}>
              <DeliveryIcon name={headerIcon || "bag"} color={theme} />
            </span>
          ) : null}
        </div>
        <div className="edd-anim__bubble-shell">
          <span className="edd-anim__rail edd-anim__rail--solid" style={{ background: progress }} aria-hidden="true" />
          <div className="edd-anim__steps">
            {steps.map((step, index) => (
              <div key={step.key} className="edd-anim__step" style={{ animationDelay: `${180 + index * 110}ms` }}>
                <span className={`edd-anim__bubble${index === 1 ? " is-truck" : ""}`} style={{ color: step.color }}>
                  {step.enabled ? <DeliveryIcon key={step.icon} name={step.icon} color={step.color} /> : null}
                </span>
                <span className="edd-anim__label" style={{ color: status }}>
                  {step.title}
                </span>
                <strong className="edd-anim__date" style={{ color: date }}>
                  {step.date}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (design === "EXPRESS") {
    return (
      <div key="express" className="edd-anim edd-anim--express">
        <div className="edd-anim__express-head">
          {headerEnabled ? (
            <span className="edd-anim__express-clock" style={{ color: theme }}>
              <DeliveryIcon name={headerIcon || "clock"} color={theme} />
            </span>
          ) : null}
          <div>
            {titleOn && headingText ? (
              <p className="edd-anim__express-title" style={titleStyle}>
                {headingText}
              </p>
            ) : null}
            {showDescription && descriptionSegments?.length ? (
              <DescriptionBlock show segments={descriptionSegments} accentColor={accent} className="edd-anim__express-sub" />
            ) : (
              <p className="edd-anim__express-sub">
                Estimated Delivery Date <JourneyRange label={deliveredRange} color={textColor} />
              </p>
            )}
          </div>
        </div>
        <div className="edd-anim__express-shell">
          <span className="edd-anim__rail edd-anim__rail--solid" style={{ background: progress }} aria-hidden="true" />
          <div className="edd-anim__steps">
            {steps.map((step, index) => (
              <div key={step.key} className="edd-anim__step" style={{ animationDelay: `${180 + index * 110}ms` }}>
                <span className={`edd-anim__circle${index === 1 ? " is-truck" : ""}`} style={{ background: progress, color: "#fff" }}>
                  {step.enabled ? <DeliveryIcon key={step.icon} name={step.icon} color="#fff" /> : null}
                </span>
                <span className="edd-anim__label" style={{ color: status }}>
                  {step.title}
                </span>
                <strong className="edd-anim__date" style={{ color: date }}>
                  {step.date}
                </strong>
              </div>
            ))}
          </div>
        </div>
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
                {headingText}
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" />
        <div className="edd-anim edd-anim--segments">
          {steps.map((step, index) => (
            <div key={step.key} className="edd-anim__segment" style={{ animationDelay: `${120 + index * 100}ms` }}>
              <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
              <span className="edd-anim__label" style={{ color: status }}>
                {step.title}
              </span>
              <strong className="edd-anim__date" style={{ color: date }}>
                {step.date}
              </strong>
            </div>
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
                {headingText}
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" />
        <div className="edd-anim__meter-track">
          <span className="edd-anim__meter-fill" style={{ background: progress }} aria-hidden="true" />
          <div className="edd-anim__steps">
            {steps.map((step, index) => (
              <div key={step.key} className="edd-anim__step" style={{ animationDelay: `${160 + index * 120}ms` }}>
                <span
                  className={`edd-anim__meter-dot${index === 0 ? " is-active" : ""}${index === 1 ? " is-truck" : ""}`}
                  style={{ borderColor: progress, background: index === 0 ? progress : "#fff", color: index === 0 ? "#fff" : step.color }}
                >
                  {step.enabled ? <DeliveryIcon key={step.icon} name={step.icon} color={index === 0 ? "#fff" : step.color} /> : null}
                </span>
                <span className="edd-anim__label" style={{ color: status }}>
                  {step.title}
                </span>
                <strong className="edd-anim__date" style={{ color: date }}>
                  {step.date}
                </strong>
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
                {headingText}
              </p>
            ) : null}
          </div>
        ) : null}
        <DescriptionBlock show={showDescription} segments={descriptionSegments} accentColor={accent} className="edd-anim__lead edd-anim__lead--above" />
        <div className="edd-anim edd-anim--band" style={{ borderColor: progress }}>
          {steps.map((step, index) => (
            <div key={step.key} className="edd-anim__band-step" style={{ animationDelay: `${140 + index * 110}ms` }}>
              <StepIcon step={step} className="edd-anim__icon" truck={index === 1} />
              <span className="edd-anim__label" style={{ color: status }}>
                {step.title}
              </span>
              <strong className="edd-anim__date" style={{ color: date }}>
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
