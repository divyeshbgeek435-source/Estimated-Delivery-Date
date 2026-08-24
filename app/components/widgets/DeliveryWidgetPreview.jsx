import { Fragment, useEffect, useMemo, useState } from "react";
import {
  calculateDeliveryDate,
  formatTimelineLabel,
  getCountdownToCutoff,
  getZonedParts,
  messageSegments,
  messageValues,
  widgetBackground,
} from "../../lib/delivery-calculator";
import { DeliveryIcon } from "../icons/DeliveryIcon";

export function DeliveryWidgetPreview({
  heading = "",
  template,
  icons,
  style,
  shipping,
  timezone = "UTC",
  dateSettings = {},
  layout = "FULL",
  design = "TIMELINE",
  showDescription = true,
}) {
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(() => new Date());

  useEffect(() => {
    const countdown = setInterval(() => setTick(new Date()), 1000);
    const dates = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(countdown);
      clearInterval(dates);
    };
  }, []);

  const delivery = useMemo(
    () =>
      calculateDeliveryDate({
        orderDate: now,
        processingMinDays: shipping.processingMinDays,
        processingMaxDays: shipping.processingMaxDays,
        cutoffTime: shipping.cutoffTime,
        workingDays: shipping.workingDays,
        blockedDates: shipping.blockedDates,
        transitMinDays: shipping.transitMinDays,
        transitMaxDays: shipping.transitMaxDays,
        transitWorkingDays: shipping.transitWorkingDays,
        transitBlockedDates: shipping.transitBlockedDates,
        timezone,
      }),
    [now, shipping, timezone],
  );

  const countdown = useMemo(
    () =>
      getCountdownToCutoff({
        now: tick,
        cutoffTime: shipping.cutoffTime,
        workingDays: shipping.workingDays,
        blockedDates: shipping.blockedDates,
        timezone,
      }),
    [tick, shipping, timezone],
  );

  const values = messageValues({ delivery, countdown, now: tick, timezone, dateSettings });
  const theme = style.themeColor || "#202223";
  const progress = style.progressColor || "#202223";
  const textColor = style.textColor || "#202223";
  const iconSize = style.iconSize || 22;
  const cardBackground =
    style.backgroundType === "TRANSPARENT" ? "#ffffff" : style.backgroundColor || "#E8E8E8";
  const purchasedDate = formatTimelineLabel(getZonedParts(now, timezone).dateStr);
  const processingDate = formatTimelineLabel(delivery.processingDateMin, delivery.processingDateMax);
  const deliveredDate = formatTimelineLabel(delivery.deliveryDateMin, delivery.deliveryDateMax);
  const steps = [
    {
      key: "purchased",
      icon: icons.purchased || "bag",
      title: icons.purchasedTitle || "Purchased",
      color: icons.purchasedColor || theme,
      date: purchasedDate,
    },
    {
      key: "processing",
      icon: icons.processing || "truck",
      title: icons.processingTitle || "Processing",
      color: icons.processingColor || theme,
      date: processingDate,
    },
    {
      key: "delivered",
      icon: icons.delivered || "pin",
      title: icons.deliveredTitle || "Delivered",
      color: icons.deliveredColor || theme,
      date: deliveredDate,
    },
  ];
  const paddingTop = style.paddingTop ?? 16;
  const paddingRight = style.paddingRight ?? 16;
  const paddingBottom = style.paddingBottom ?? 12;
  const paddingLeft = style.paddingLeft ?? 16;
  const gap = style.paddingMiddle ?? 12;
  const designName = design || (layout === "MINIMAL" ? "COMPACT" : "TIMELINE");
  const pincode = shipping.pincodeRules || {};

  return (
    <div
      className={`edd-preview essential-estimated-delivery-widget essential-estimated-delivery-card edd-preview--${designName.toLowerCase()}`}
      style={{
        background: widgetBackground(style),
        borderRadius: `${style.borderRadius ?? 8}px`,
        border: `${style.borderWidth ?? 0}px solid ${style.borderColor || "#E1E3E5"}`,
        padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
        color: textColor,
        fontFamily: style.fontFamily || "inherit",
        fontSize: `${style.fontSize || 14}px`,
        ["--edd-theme"]: theme,
        ["--edd-progress"]: progress,
        ["--edd-gap"]: `${gap}px`,
        ["--edd-card-bg"]: cardBackground,
        ["--edd-icon-box"]: `${iconSize}px`,
      }}
    >
      {heading ? <p className="edd-preview__heading">{heading}</p> : null}
      {showDescription ? (
        <div
          className="edd-preview__message-row essential-estimated-delivery-description"
          style={{ color: style.dynamicColor || textColor, marginBottom: gap }}
        >
          <span className="edd-preview__clock" aria-hidden="true">
            <DeliveryIcon name="clockSolid" color={style.dynamicColor || textColor} />
          </span>
          <p className="edd-preview__message">
            {messageSegments(template, values).map((part, index) =>
              part.highlight ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>,
            )}
          </p>
        </div>
      ) : null}
      {designName === "COMPACT" ? (
        <p className="edd-preview__minimal" style={{ color: style.dateColor || textColor, fontSize: `${style.dateFontSize || 11}px` }}>
          Delivery {deliveredDate}
        </p>
      ) : designName === "PILL" ? (
        <div className="edd-preview__pills">
          {steps.map((step) => (
            <span key={step.key} className="edd-preview__pill" style={{ color: step.color, borderColor: step.color }}>
              {step.title}: {step.date}
            </span>
          ))}
        </div>
      ) : designName === "CARD" ? (
        <div className="edd-preview__rows">
          {steps.map((step) => (
            <div key={step.key} className="edd-preview__row">
              <span className="edd-preview__timeline-icon" style={{ color: step.color }}>
                <DeliveryIcon name={step.icon} color={step.color} />
              </span>
              <span>
                <strong style={{ color: style.statusColor || textColor, fontSize: `${style.statusFontSize || 12}px` }}>{step.title}</strong>
                <em style={{ color: style.dateColor || textColor, fontSize: `${style.dateFontSize || 11}px` }}>{step.date}</em>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={`edd-preview__timeline ${designName === "STACKED" ? "edd-preview__timeline--stacked" : ""}`} role="list">
          {steps.map((step, index) => (
            <Fragment key={step.key}>
              {index > 0 && designName !== "STACKED" ? (
                <span className="edd-preview__connector" aria-hidden="true">
                  <span
                    className="edd-preview__connector-line"
                    style={{ background: progress, height: `${style.progressWidth || 2}px` }}
                  />
                  <span className="edd-preview__connector-arrow" style={{ borderLeftColor: progress }} />
                </span>
              ) : null}
              <div className="edd-preview__timeline-item" role="listitem">
                <span
                  className="edd-preview__timeline-icon"
                  style={{
                    color: step.color,
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                  }}
                >
                  <DeliveryIcon name={step.icon} color={step.color} />
                </span>
                <span className="edd-preview__timeline-meta">
                  <span
                    className="edd-preview__timeline-date"
                    style={{ color: style.dateColor || textColor, fontSize: `${style.dateFontSize || 11}px` }}
                  >
                    {step.date}
                  </span>
                  <span
                    className="edd-preview__timeline-label"
                    style={{ color: style.statusColor || textColor, fontSize: `${style.statusFontSize || 12}px` }}
                  >
                    {step.title}
                  </span>
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      )}
      {pincode.enabled ? (
        <form className="edd-check" onSubmit={(event) => event.preventDefault()}>
          <p className="edd-check__title">Check delivery</p>
          <div className="edd-check__row">
            <input className="edd-check__input" type="text" placeholder="Enter pincode" readOnly />
            <button className="edd-check__button" type="button" tabIndex={-1}>
              Check
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
