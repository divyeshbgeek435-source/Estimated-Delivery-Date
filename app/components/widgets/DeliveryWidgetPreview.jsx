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
import { resolveTimeZone } from "../../lib/timezone";
import { isIconEnabled } from "../../lib/icon-media";
import {
  WEIGHT_DISPLAY_MODES,
  asksForPincode,
  digitsOnly,
  formatWeightDisplay,
  resolveDeliveryAvailability,
  resolveWeightDisplayMode,
  shippingWithPincodeRule,
} from "../../lib/pincode";
import { DeliveryIcon } from "../icons/DeliveryIcon";

async function checkDelivery(code, shipping, productWeight = "") {
  const options = {
    code,
    rules: shipping.pincodeRules,
    weightRules: shipping.weightRules,
    productWeight,
    shipping,
  };
  const first = resolveDeliveryAvailability(options);
  if (!first.needsLookup) return first;
  const countries = [...new Set([...(shipping.pincodeRules?.countries || []), shipping.pincodeRules?.country, first.country].filter(Boolean))];
  let place = { ok: false };
  for (const country of countries) {
    const params = new URLSearchParams({ country, code });
    const response = await fetch(`/app/pincode-lookup?${params.toString()}`);
    const payload = await response.json();
    if (payload?.ok) {
      place = payload;
      break;
    }
  }
  return resolveDeliveryAvailability({ ...options, place });
}

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
  productWeight = "",
}) {
  const zone = resolveTimeZone(timezone);
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(() => new Date());
  const [pincodeValue, setPincodeValue] = useState("");
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const countdown = setInterval(() => setTick(new Date()), 1000);
    const dates = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(countdown);
      clearInterval(dates);
    };
  }, []);

  useEffect(() => {
    if (asksForPincode(shipping.weightRules, shipping.pincodeRules)) return;
    setCheck(null);
    setPincodeValue("");
  }, [shipping.weightRules, shipping.pincodeRules]);

  const pincode = shipping.pincodeRules || {};
  const displayMode = resolveWeightDisplayMode(shipping.weightRules, pincode);
  const askPincode = asksForPincode(shipping.weightRules, pincode);
  const directWeight = formatWeightDisplay(shipping.weightRules, productWeight);
  const matchedShipping = check?.available ? shippingWithPincodeRule(shipping, check) : shipping;
  const showDates =
    !askPincode ||
    (displayMode === WEIGHT_DISPLAY_MODES.PINCODE ? check?.available === true : check?.available !== false);

  const delivery = useMemo(
    () =>
      calculateDeliveryDate({
        orderDate: now,
        processingMinDays: matchedShipping.processingMinDays,
        processingMaxDays: matchedShipping.processingMaxDays,
        cutoffTime: matchedShipping.cutoffTime,
        workingDays: matchedShipping.workingDays,
        blockedDates: matchedShipping.blockedDates,
        transitMinDays: matchedShipping.transitMinDays,
        transitMaxDays: matchedShipping.transitMaxDays,
        transitWorkingDays: matchedShipping.transitWorkingDays,
        transitBlockedDates: matchedShipping.transitBlockedDates,
        timezone: zone,
      }),
    [now, matchedShipping, zone],
  );

  const countdown = useMemo(
    () =>
      getCountdownToCutoff({
        now: tick,
        cutoffTime: shipping.cutoffTime,
        workingDays: shipping.workingDays,
        blockedDates: shipping.blockedDates,
        timezone: zone,
      }),
    [tick, shipping, zone],
  );

  const values = messageValues({ delivery, countdown, now: tick, timezone: zone, dateSettings });
  const theme = style.themeColor || "#202223";
  const progress = style.progressColor || "#202223";
  const textColor = style.textColor || "#202223";
  const iconSize = Math.max(22, Number(style.iconSize) || 24);
  const fontSize = Math.max(14, Number(style.fontSize) || 15);
  const dateSize = Math.max(12, Number(style.dateFontSize) || 13);
  const statusSize = Math.max(12, Number(style.statusFontSize) || 13);
  const cardBackground =
    style.backgroundType === "TRANSPARENT" ? "#ffffff" : style.backgroundColor || "#E8E8E8";
  const purchasedDate = formatTimelineLabel(getZonedParts(now, zone).dateStr);
  const processingDate = formatTimelineLabel(delivery.processingDateMin, delivery.processingDateMax);
  const deliveredDate = formatTimelineLabel(delivery.deliveryDateMin, delivery.deliveryDateMax);
  const steps = [
    {
      key: "purchased",
      icon: icons.purchased || "bag",
      enabled: isIconEnabled(icons, "purchased"),
      title: icons.purchasedTitle || "Purchased",
      color: icons.purchasedColor || theme,
      date: purchasedDate,
    },
    {
      key: "processing",
      icon: icons.processing || "truck",
      enabled: isIconEnabled(icons, "processing"),
      title: icons.processingTitle || "Processing",
      color: icons.processingColor || theme,
      date: processingDate,
    },
    {
      key: "delivered",
      icon: icons.delivered || "pin",
      enabled: isIconEnabled(icons, "delivered"),
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
  const shownWeight = check?.available ? check.weight : displayMode === WEIGHT_DISPLAY_MODES.DIRECT ? directWeight : "";

  const deliveredRange = deliveredDate;
  const headerIcon = icons.headerIcon || "flag";
  const headerEnabled = isIconEnabled(icons, "headerIcon");
  const headingText = heading || "Estimated Delivery Date";

  const onCheck = async (event) => {
    event.preventDefault();
    const code = digitsOnly(pincodeValue);
    if (!code) return;
    setChecking(true);
    try {
      const result = await checkDelivery(code, shipping, productWeight);
      setCheck(result);
    } catch {
      setCheck({
        enabled: true,
        available: false,
        message: "Could not check this pincode. Try again.",
        canRequest: false,
      });
    } finally {
      setChecking(false);
    }
  };

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
        fontSize: `${fontSize}px`,
        ["--edd-theme"]: theme,
        ["--edd-progress"]: progress,
        ["--edd-gap"]: `${gap}px`,
        ["--edd-card-bg"]: cardBackground,
        ["--edd-icon-box"]: `${iconSize}px`,
        ["--edd-font"]: `${fontSize}px`,
        ["--edd-date-size"]: `${dateSize}px`,
        ["--edd-status-size"]: `${statusSize}px`,
      }}
    >
      {heading && designName !== "TRACKER" && designName !== "BANNER" && designName !== "CARD" ? (
        <p className="edd-preview__heading">{heading}</p>
      ) : null}
      {displayMode === WEIGHT_DISPLAY_MODES.DIRECT ? (
        <p className="edd-preview__weight">
          Weight: {shownWeight || (shipping.weightRules?.useProductWeight ? "product weight" : "—")}
        </p>
      ) : null}
      {showDates && designName === "BANNER" ? (
        <div className="edd-preview__banner">
          {headerEnabled ? (
            <span className="edd-preview__banner-icon">
              <DeliveryIcon key={`banner-${headerIcon}`} name={headerIcon} color={theme} />
            </span>
          ) : null}
          <p className="edd-preview__banner-text">
            {headingText} <strong style={{ color: style.dynamicColor || textColor }}>{deliveredRange}</strong>
          </p>
        </div>
      ) : showDates && designName === "CARD" ? (
        <div className="edd-preview__highlight">
          {headerEnabled ? (
            <span className="edd-preview__highlight-icon">
              <DeliveryIcon key={`card-${headerIcon}`} name={headerIcon || icons.delivered || "pin"} color={theme} />
            </span>
          ) : null}
          <p>
            {headingText}{" "}
            <strong style={{ color: style.dynamicColor || textColor }}>{deliveredRange}</strong>
          </p>
        </div>
      ) : showDates && designName === "TRACKER" ? (
        <div className="edd-preview__tracker">
          <div className="edd-preview__tracker-head">
            {headerEnabled ? (
              <span className="edd-preview__tracker-flag">
                <DeliveryIcon key={`tracker-${headerIcon}`} name={headerIcon} color={theme} />
              </span>
            ) : null}
            <p>
              {headingText}{" "}
              <strong style={{ color: style.dynamicColor || textColor }}>{deliveredRange}</strong>
            </p>
          </div>
          <div className="edd-preview__tracker-steps">
            {steps.map((step, index) => (
              <Fragment key={step.key}>
                {index > 0 ? <span className="edd-preview__tracker-dots" aria-hidden="true" style={{ backgroundImage: `radial-gradient(${progress} 1.4px, transparent 1.6px)` }} /> : null}
                <div className="edd-preview__tracker-step">
                  {step.enabled ? (
                    <span className="edd-preview__tracker-icon" style={{ color: step.color }}>
                      <DeliveryIcon key={step.icon} name={step.icon} color={step.color} />
                    </span>
                  ) : (
                    <span className="edd-preview__tracker-icon edd-preview__tracker-icon--off" aria-hidden="true" />
                  )}
                  <strong style={{ color: style.statusColor || textColor }}>{step.title}</strong>
                  <em style={{ color: style.dateColor || textColor }}>{step.date}</em>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      ) : showDates && showDescription ? (
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
      {showDates && ["BANNER", "CARD", "TRACKER"].includes(designName) ? null : showDates && designName === "COMPACT" ? (
        <p className="edd-preview__minimal" style={{ color: style.dateColor || textColor }}>
          Delivery {deliveredDate}
        </p>
      ) : showDates && designName === "PILL" ? (
        <div className="edd-preview__pills">
          {steps.map((step) => (
            <span key={step.key} className="edd-preview__pill" style={{ color: step.color, borderColor: step.color }}>
              {step.title}: {step.date}
            </span>
          ))}
        </div>
      ) : showDates ? (
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
                {step.enabled ? (
                  <span
                    className="edd-preview__timeline-icon"
                    style={{
                      color: step.color,
                      width: `${iconSize}px`,
                      height: `${iconSize}px`,
                    }}
                  >
                    <DeliveryIcon name={step.icon} color={step.color} key={step.icon} />
                  </span>
                ) : null}
                <span className="edd-preview__timeline-meta">
                  <span
                    className="edd-preview__timeline-date"
                    style={{ color: style.dateColor || textColor }}
                  >
                    {step.date}
                  </span>
                  <span
                    className="edd-preview__timeline-label"
                    style={{ color: style.statusColor || textColor }}
                  >
                    {step.title}
                  </span>
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      ) : null}
      {askPincode ? (
        <div className="edd-check">
          <p className="edd-check__title">Check delivery</p>
          <div className="edd-check__row">
            <input
              className="edd-check__input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter pincode"
              value={pincodeValue}
              onChange={(event) => setPincodeValue(digitsOnly(event.currentTarget.value))}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onCheck(event);
              }}
            />
            <button className="edd-check__button" type="button" disabled={checking} onClick={onCheck}>
              {checking ? "Checking" : "Check"}
            </button>
          </div>
          {check?.message ? (
            <p className="edd-check__status" data-tone={check.available ? "ok" : "error"}>
              {check.available
                ? `${check.message}${check.label ? ` — ${check.label}` : ""}${check.weight ? ` · ${check.weight}` : ""}`
                : check.message}
            </p>
          ) : null}
          {check?.available === false ? (
            <button type="button" className="edd-request-btn" disabled>
              Request delivery
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
