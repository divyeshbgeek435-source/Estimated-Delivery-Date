import { Fragment, useEffect, useMemo, useState } from "react";
import {
  calculateDeliveryDate,
  formatTimelineLabel,
  formatWidgetDate,
  getCountdownToCutoff,
  getZonedParts,
  messageSegments,
  messageValues,
  widgetBackground,
} from "../../lib/delivery-calculator";
import { resolveTimeZone } from "../../lib/timezone";
import { isCustomImage, isIconEnabled, safeImageSrc } from "../../lib/icon-media";
import {
  WEIGHT_DISPLAY_MODES,
  asksForPincode,
  digitsOnly,
  formatPincodeStatusLine,
  resolveDeliveryAvailability,
  resolveWeightDisplayMode,
  shippingWithPincodeRule,
} from "../../lib/pincode";
import { CART_DISPLAY_MODES, ANIMATED_DESIGNS, WIDGET_LOCATIONS } from "../../lib/constants";
import { buildRenderableSteps, resolveTrackerConfig } from "../../lib/tracker-config";
import { clampToBounds, STYLE_NUMBER_LIMITS } from "../../lib/number-input";
import { AnimatedEtaTemplate, JourneyRange, MessageParts } from "./AnimatedEtaTemplates";
import { TimelineConnector } from "./TimelineConnector";
import { FormattedText } from "./FormattedText";
import { DeliveryIcon } from "../icons/DeliveryIcon";
import { EditableHotspot } from "../editor/EditableHotspot";
import {
  elementStyleToCss,
  resolveElementStyle,
} from "../../lib/element-styles";
import { normalizeConnectorStyle, timelineGridTemplate, isDefaultConnector } from "../../lib/connector-styles";

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

const EMBEDDED_DESCRIPTION_DESIGNS = new Set([
  "MOMENT",
  "EXPRESS",
  "BUBBLE",
  "SEGMENTS",
  "METER",
  "BAND",
  "HERO",
  "DROP",
  "CLEAN",
  "CHECKLIST",
  "PICKUP",
  "PREORDER",
  "WHOLESALE",
  "CALENDAR",
]);

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
  showHeading = true,
  productWeight = "",
  location = WIDGET_LOCATIONS.PRODUCT,
  cartDisplayMode = CART_DISPLAY_MODES.GENERAL,
  staticPreview = false,
  interactive = false,
  selectedElement = null,
  onSelectElement,
  onElementContentChange,
  preferMobileStyles = false,
}) {
  const zone = resolveTimeZone(timezone);
  const isCart = location === WIDGET_LOCATIONS.CART || location === WIDGET_LOCATIONS.CHECKOUT;
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(() => new Date());
  const [pincodeValue, setPincodeValue] = useState("");
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const previewProductWeight =
    String(productWeight || "").trim() ||
    (shipping.weightRules?.useProductWeight ? "product weight" : "");

  useEffect(() => {
    if (staticPreview) return undefined;
    const countdown = setInterval(() => setTick(new Date()), 1000);
    const dates = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(countdown);
      clearInterval(dates);
    };
  }, [staticPreview]);

  useEffect(() => {
    if (isCart || asksForPincode(shipping.weightRules, shipping.pincodeRules)) return;
    setCheck(null);
    setPincodeValue("");
  }, [isCart, shipping.weightRules, shipping.pincodeRules]);

  useEffect(() => {
    if (isCart) {
      setCheck(null);
      setPincodeValue("");
      return;
    }
    setCheck((current) => {
      if (!current?.available || !current.code) return current;
      const next = resolveDeliveryAvailability({
        code: current.code,
        rules: shipping.pincodeRules,
        weightRules: shipping.weightRules,
        place: {
          ok: true,
          city: current.city,
          state: current.state,
          country: current.country,
          label: current.label,
        },
        productWeight: previewProductWeight,
        shipping,
      });
      if (next.weight === current.weight && next.label === current.label && next.message === current.message) {
        return current;
      }
      return {
        ...current,
        weight: next.weight,
        label: next.label || current.label,
        message: next.message || current.message,
      };
    });
  }, [isCart, shipping, previewProductWeight]);

  const pincode = shipping.pincodeRules || {};
  const displayMode = resolveWeightDisplayMode(shipping.weightRules, pincode);
  // Live cart/checkout never shows the pincode/weight checker - keep preview identical.
  const askPincode = !isCart && asksForPincode(shipping.weightRules, pincode);
  const matchedShipping = check?.available ? shippingWithPincodeRule(shipping, check) : shipping;
  const showDates =
    isCart ||
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

  const values = {
    ...messageValues({ delivery, countdown, now: tick, timezone: zone, dateSettings }),
    image: safeImageSrc(icons.headerIcon),
  };
  const theme = style.themeColor || "#202223";
  const progress = style.progressColor || "#202223";
  const textColor = style.textColor || "#202223";
  const iconSize = Math.min(
    STYLE_NUMBER_LIMITS.iconSize.max,
    Math.max(22, clampToBounds(style.iconSize, STYLE_NUMBER_LIMITS.iconSize, 24)),
  );
  const fontSize = Math.min(
    STYLE_NUMBER_LIMITS.fontSize.max,
    Math.max(14, clampToBounds(style.fontSize, STYLE_NUMBER_LIMITS.fontSize, 15)),
  );
  const dateSize = Math.min(
    STYLE_NUMBER_LIMITS.dateFontSize.max,
    Math.max(12, clampToBounds(style.dateFontSize, STYLE_NUMBER_LIMITS.dateFontSize, 13)),
  );
  const statusSize = Math.min(
    STYLE_NUMBER_LIMITS.statusFontSize.max,
    Math.max(12, clampToBounds(style.statusFontSize, STYLE_NUMBER_LIMITS.statusFontSize, 13)),
  );
  const cardBackground =
    style.backgroundType === "TRANSPARENT"
      ? "#ffffff"
      : style.backgroundType === "GRADIENT"
        ? style.gradientStart || "#FFFFFF"
        : style.backgroundColor || "#E8E8E8";
  const purchasedDate = formatTimelineLabel(getZonedParts(now, zone).dateStr);
  const processingDate = formatTimelineLabel(delivery.processingDateMin, delivery.processingDateMax);
  const deliveredDate = formatTimelineLabel(delivery.deliveryDateMin, delivery.deliveryDateMax);
  const tracker = resolveTrackerConfig(icons);
  const steps = buildRenderableSteps(tracker, {
    theme,
    dates: {
      ordered: purchasedDate,
      processing: processingDate,
      delivered: deliveredDate,
    },
  });
  const gap = clampToBounds(style.paddingMiddle, STYLE_NUMBER_LIMITS.padding, 12);
  let designName = design || (layout === "MINIMAL" ? "COMPACT" : "TIMELINE");
  if (isCart && (designName === "COMPACT" || designName === "MINIMAL")) designName = "TIMELINE";
  const showPerProduct =
    location === WIDGET_LOCATIONS.CART && cartDisplayMode === CART_DISPLAY_MODES.PER_PRODUCT;
  const deliveryFrom = values.delivery_from || formatWidgetDate(delivery.deliveryDateMin, dateSettings);
  const deliveryTo = values.delivery_to || formatWidgetDate(delivery.deliveryDateMax, dateSettings);
  const cartItems = showPerProduct
    ? [
        {
          title: "Configured product",
          dates:
            deliveryFrom && deliveryTo
              ? deliveryFrom === deliveryTo
                ? deliveryFrom
                : `${deliveryFrom} – ${deliveryTo}`
              : deliveryTo || deliveryFrom || "",
        },
        {
          title: "Another configured product",
          dates: deliveryTo
            ? deliveryFrom && deliveryFrom !== deliveryTo
              ? `${deliveryFrom} – ${deliveryTo}`
              : deliveryTo
            : "",
        },
      ].filter((item) => item.dates)
    : [];

  const deliveredRange = deliveredDate;
  const headerIcon = icons.headerIcon || "flag";
  const headerEnabled = tracker.settings.showHeaderIcon && isIconEnabled(icons, "headerIcon");
  const titleEnabled = showHeading !== false && tracker.settings.showTitle !== false;
  const descriptionVisible = showDescription !== false && tracker.settings.showDescription !== false;
  const headingText = heading || "Estimated Delivery Date";
  const headingWeight = clampToBounds(style.headingFontWeight, STYLE_NUMBER_LIMITS.headingFontWeight, 600);
  const titleStyle = { fontWeight: headingWeight };

  const onCheck = async (event) => {
    event.preventDefault();
    const code = digitsOnly(pincodeValue);
    if (!code) return;
    setChecking(true);
    try {
      const result = await checkDelivery(code, shipping, previewProductWeight);
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

  const titleElStyle = {
    ...titleStyle,
    ...elementStyleToCss(resolveElementStyle("title", style), { mobile: preferMobileStyles }),
  };
  const descriptionElStyle = elementStyleToCss(resolveElementStyle("description", style), {
    mobile: preferMobileStyles,
  });
  const checkSectionStyle = resolveElementStyle("checkSection", style);
  const checkSectionElStyle = elementStyleToCss(checkSectionStyle, {
    mobile: preferMobileStyles,
  });
  const checkLabelElStyle = elementStyleToCss(resolveElementStyle("checkLabel", style), {
    mobile: preferMobileStyles,
  });
  const checkInputElStyle = elementStyleToCss(resolveElementStyle("checkInput", style), {
    mobile: preferMobileStyles,
  });
  const checkButtonElStyle = elementStyleToCss(resolveElementStyle("checkButton", style), {
    mobile: preferMobileStyles,
  });
  const stepLabelElStyle = elementStyleToCss(resolveElementStyle("stepLabel", style), {
    mobile: preferMobileStyles,
  });
  const stepDateElStyle = elementStyleToCss(resolveElementStyle("stepDate", style), {
    mobile: preferMobileStyles,
  });
  const editingDescription = interactive && selectedElement === "description";

  return (
    <div
      className={`edd-preview essential-estimated-delivery-widget essential-estimated-delivery-card edd-preview--${designName.toLowerCase()}${
        interactive ? " is-interactive" : ""
      }${selectedElement === "card" ? " is-card-selected" : ""}`}
      style={{
        background: widgetBackground(style),
        borderRadius: `${clampToBounds(style.borderRadius, STYLE_NUMBER_LIMITS.borderRadius, 8)}px`,
        border: `${clampToBounds(style.borderWidth, STYLE_NUMBER_LIMITS.borderWidth, 0)}px solid ${style.borderColor || "#E1E3E5"}`,
        padding: "10px",
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
        ["--edd-journey-rail"]: `${clampToBounds(style.progressWidth, STYLE_NUMBER_LIMITS.progressWidth, 5)}px`,
        ["--edd-heading-weight"]: headingWeight,
      }}
      onClick={
        interactive
          ? (event) => {
              if (event.target === event.currentTarget) onSelectElement?.("card");
            }
          : undefined
      }
    >
      {(titleEnabled || headerEnabled) &&
      designName !== "TRACKER" &&
      designName !== "JOURNEY" &&
      designName !== "BANNER" &&
      designName !== "CARD" &&
      !ANIMATED_DESIGNS.has(designName) ? (
        <div className="edd-preview__title-row">
          {headerEnabled ? (
            <EditableHotspot
              as="span"
              className="edd-preview__title-icon"
              elementId="headerIcon"
              interactive={interactive}
              selectedElement={selectedElement}
              onSelect={onSelectElement}
              style={{ color: theme }}
            >
              <DeliveryIcon key={`title-${headerIcon}`} name={headerIcon} color={theme} />
            </EditableHotspot>
          ) : null}
          {titleEnabled ? (
            <EditableHotspot
              as="p"
              className="edd-preview__heading"
              elementId="title"
              interactive={interactive}
              selectedElement={selectedElement}
              onSelect={onSelectElement}
              style={titleElStyle}
              contentEditable
              value={headingText}
              onChange={(value) => onElementContentChange?.("title", value)}
            >
              <FormattedText value={headingText} />
            </EditableHotspot>
          ) : null}
        </div>
      ) : null}
      {showDates &&
      descriptionVisible &&
      ["BANNER", "CARD", "TRACKER"].includes(designName) ? (
        <EditableHotspot
          className="edd-preview__message-row essential-estimated-delivery-description"
          elementId="description"
          interactive={interactive}
          selectedElement={selectedElement}
          onSelect={onSelectElement}
          style={{ ...descriptionElStyle, color: descriptionElStyle.color || style.dynamicColor || textColor, marginBottom: gap }}
          contentEditable
          value={template}
          onChange={(value) => onElementContentChange?.("description", value)}
        >
          {headerEnabled && isCustomImage(headerIcon) ? (
            <img className="edd-inline-image edd-inline-image--lead" src={safeImageSrc(headerIcon)} alt="" />
          ) : null}
          <p className="edd-preview__message">
            {editingDescription ? (
              template
            ) : (
              <MessageParts segments={messageSegments(template, values)} accentColor={style.dynamicColor || textColor} />
            )}
          </p>
        </EditableHotspot>
      ) : null}
      {showDates && designName === "BANNER" ? (
        <div className="edd-preview__banner">
          {headerEnabled ? (
            <span className="edd-preview__banner-icon">
              <DeliveryIcon key={`banner-${headerIcon}`} name={headerIcon} color={theme} />
            </span>
          ) : null}
          <p className="edd-preview__banner-text">
            {titleEnabled ? <span style={titleStyle}><FormattedText value={headingText} /> </span> : null}
            <strong style={{ color: style.dynamicColor || textColor }}>{deliveredRange}</strong>
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
            {titleEnabled ? <span style={titleStyle}><FormattedText value={headingText} /> </span> : null}
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
              {titleEnabled ? <span style={titleStyle}><FormattedText value={headingText} /> </span> : null}
              <strong style={{ color: style.dynamicColor || textColor }}>{deliveredRange}</strong>
            </p>
          </div>
          <div className="edd-preview__tracker-steps">
            {steps.map((step, index) => (
              <Fragment key={step.key}>
                {index > 0 ? (
                  isDefaultConnector(tracker.settings?.connector) ? (
                    <span
                      className="edd-preview__tracker-dots"
                      aria-hidden="true"
                      style={{ backgroundImage: `radial-gradient(${progress} 1.4px, transparent 1.6px)` }}
                    />
                  ) : (
                    <TimelineConnector
                      className="edd-preview__tracker-connector"
                      connector={tracker.settings?.connector}
                      fallbackColor={progress}
                      prevStatus={steps[index - 1]?.status || "complete"}
                      nextStatus={step.status || "pending"}
                    />
                  )
                ) : null}
                <div className={`edd-preview__tracker-step${step.enabled === false ? " is-icon-off" : ""}`}>
                  <span
                    className={`edd-preview__tracker-icon${step.enabled === false ? " is-icon-hidden" : ""}`}
                    style={{ color: step.color }}
                    aria-hidden={step.enabled === false ? true : undefined}
                  >
                    <DeliveryIcon key={step.icon} name={step.icon} color={step.color} />
                  </span>
                  <strong style={{ color: step.labelColor || style.statusColor || textColor, ...(step.labelFontSize != null ? { fontSize: `${step.labelFontSize}px` } : null) }}>{step.title}</strong>
                  <em style={{ color: step.dateColor || style.dateColor || textColor, ...(step.dateFontSize != null ? { fontSize: `${step.dateFontSize}px` } : null) }}>{step.date}</em>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      ) : showDates && ANIMATED_DESIGNS.has(designName) && designName !== "JOURNEY" ? (
        <AnimatedEtaTemplate
          design={designName}
          steps={steps}
          headingText={headingText}
          showHeading={titleEnabled}
          headingWeight={headingWeight}
          deliveredRange={deliveredRange}
          style={style}
          textColor={textColor}
          theme={theme}
          progress={progress}
          headerEnabled={headerEnabled}
          headerIcon={headerIcon}
          showDescription={descriptionVisible}
          descriptionSegments={messageSegments(template, values)}
          trackerSettings={tracker.settings}
          interactive={interactive}
          selectedElement={selectedElement}
          onSelectElement={onSelectElement}
          onElementContentChange={onElementContentChange}
          descriptionTemplate={template}
          titleStyleOverride={titleElStyle}
          descriptionStyleOverride={descriptionElStyle}
          stepLabelStyleOverride={stepLabelElStyle}
          stepDateStyleOverride={stepDateElStyle}
        />
      ) : showDates && designName === "JOURNEY" ? (
        <div key={`journey-${designName}`} className="edd-preview__journey">
          {descriptionVisible ? (
            <div
              className="edd-preview__message-row essential-estimated-delivery-description"
              style={{ color: style.dynamicColor || textColor, marginBottom: gap }}
            >
              {headerEnabled && isCustomImage(headerIcon) ? (
                <img className="edd-inline-image edd-inline-image--lead" src={safeImageSrc(headerIcon)} alt="" />
              ) : null}
              <p className="edd-preview__message">
                <MessageParts segments={messageSegments(template, values)} accentColor={style.dynamicColor || textColor} />
              </p>
            </div>
          ) : null}
          {(titleEnabled || headerEnabled) ? (
            <div className="edd-preview__journey-head">
              {headerEnabled ? (
                <span className="edd-preview__journey-flag">
                  <DeliveryIcon key={`journey-${headerIcon}`} name={headerIcon} color={theme} />
                </span>
              ) : null}
              <p>
                {titleEnabled ? <span style={titleStyle}><FormattedText value={headingText} /> </span> : null}
                <JourneyRange label={deliveredRange} color={style.dynamicColor || textColor} />
              </p>
            </div>
          ) : (
            <div className="edd-preview__journey-head">
              <p>
                <JourneyRange label={deliveredRange} color={style.dynamicColor || textColor} />
              </p>
            </div>
          )}
          <div className="edd-preview__journey-shell">
            <div className="edd-preview__journey-steps">
              {steps.map((step, index) => (
                <div key={step.key} className={`edd-preview__journey-step${step.enabled === false ? " is-icon-off" : ""}`} style={{ animationDelay: `${180 + index * 100}ms` }}>
                  <span
                    className={`edd-preview__journey-icon${index === 1 ? " edd-preview__journey-icon--truck" : ""}${step.enabled === false ? " is-icon-hidden" : ""}`}
                    style={{ color: step.color }}
                    aria-hidden={step.enabled === false ? true : undefined}
                  >
                    <DeliveryIcon key={step.icon} name={step.icon} color={step.color} />
                  </span>
                  <span className="edd-preview__journey-meta">
                    <span className="edd-preview__journey-label" style={{ color: step.labelColor || style.statusColor || textColor, ...(step.labelFontSize != null ? { fontSize: `${step.labelFontSize}px` } : null) }}>
                      {step.title}
                    </span>
                    <strong className="edd-preview__journey-date" style={{ color: step.dateColor || style.dateColor || textColor, ...(step.dateFontSize != null ? { fontSize: `${step.dateFontSize}px` } : null) }}>
                      {step.date}
                    </strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {showDates &&
      descriptionVisible &&
      !EMBEDDED_DESCRIPTION_DESIGNS.has(designName) &&
      designName !== "JOURNEY" &&
      !["BANNER", "CARD", "TRACKER"].includes(designName) ? (
        <div
          className="edd-preview__message-row essential-estimated-delivery-description"
          style={{ color: style.dynamicColor || textColor, marginBottom: gap }}
        >
          {headerEnabled && isCustomImage(headerIcon) ? (
            <img className="edd-inline-image edd-inline-image--lead" src={safeImageSrc(headerIcon)} alt="" />
          ) : null}
          <p className="edd-preview__message">
            <MessageParts segments={messageSegments(template, values)} accentColor={style.dynamicColor || textColor} />
          </p>
        </div>
      ) : null}
      {showDates &&
      (ANIMATED_DESIGNS.has(designName) || ["BANNER", "CARD", "TRACKER"].includes(designName))
        ? null
        : showDates && designName === "COMPACT" ? (
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
        <div
          className={`edd-preview__timeline ${designName === "STACKED" ? "edd-preview__timeline--stacked" : ""}`}
          role="list"
          style={
            designName === "STACKED"
              ? undefined
              : {
                  gridTemplateColumns: timelineGridTemplate(steps.length),
                  columnGap: `${normalizeConnectorStyle(tracker.settings?.connector).spacing}px`,
                }
          }
        >
          {steps.map((step, index) => (
            <Fragment key={step.key}>
              {index > 0 && designName !== "STACKED" ? (
                isDefaultConnector(tracker.settings?.connector) ? (
                  <span className="edd-preview__connector edd-connector edd-connector--legacy" aria-hidden="true">
                    <span
                      className="edd-connector__line"
                      style={{ background: progress, height: `${style.progressWidth || 2}px` }}
                    />
                    <span className="edd-connector__tip edd-connector__tip--head" style={{ borderLeftColor: progress }} />
                  </span>
                ) : (
                  <TimelineConnector
                    className="edd-preview__connector"
                    connector={tracker.settings?.connector}
                    fallbackColor={progress}
                    prevStatus={steps[index - 1]?.status || "complete"}
                    nextStatus={step.status || "pending"}
                  />
                )
              ) : null}
              <div className={`edd-preview__timeline-item${step.enabled === false ? " is-icon-off" : ""}`} role="listitem">
                <span
                  className={`edd-preview__timeline-icon${step.enabled === false ? " is-icon-hidden" : ""}`}
                  style={{
                    color: step.color,
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                  }}
                  aria-hidden={step.enabled === false ? true : undefined}
                >
                  <DeliveryIcon name={step.icon} color={step.color} key={step.icon} />
                </span>
                <span className="edd-preview__timeline-meta">
                  <span
                    className="edd-preview__timeline-date"
                    style={{
                      color: step.dateColor || style.dateColor || textColor,
                      ...(step.dateFontSize != null ? { fontSize: `${step.dateFontSize}px` } : null),
                    }}
                  >
                    {step.date}
                  </span>
                  <span
                    className="edd-preview__timeline-label"
                    style={{
                      color: step.labelColor || style.statusColor || textColor,
                      ...(step.labelFontSize != null ? { fontSize: `${step.labelFontSize}px` } : null),
                    }}
                  >
                    {step.title}
                  </span>
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      ) : null}
      {showPerProduct && showDates ? (
        <div className="edd-preview__items">
          {cartItems.map((item) => (
            <div key={item.title} className="edd-preview__item">
              <span className="edd-preview__item-title">{item.title}</span>
              <span className="edd-preview__item-dates">{item.dates}</span>
            </div>
          ))}
        </div>
      ) : null}
      {tracker.settings.showCheckDelivery !== false && (askPincode || designName === "EXPRESS" || interactive) ? (
        <div
          className={`edd-check${askPincode ? "" : " edd-check--footer-only"}`}
          style={{
            ...checkSectionElStyle,
            textAlign: checkSectionStyle.textAlign || "center",
          }}
        >
          <EditableHotspot
            as="p"
            className="edd-check__title"
            elementId="checkLabel"
            interactive={interactive}
            selectedElement={selectedElement}
            onSelect={onSelectElement}
            style={checkLabelElStyle}
            contentEditable
            value={tracker.settings.checkDeliveryLabel || "Check delivery"}
            onChange={(value) => onElementContentChange?.("checkLabel", value)}
          >
            {tracker.settings.checkDeliveryLabel || "Check delivery"}
          </EditableHotspot>
          {askPincode ? (
            <>
              <div
                className="edd-check__row"
                style={{
                  justifyContent: checkSectionStyle.justifyContent || "center",
                  gap: checkSectionStyle.gap != null ? `${checkSectionStyle.gap}px` : undefined,
                }}
              >
                <input
                  className="edd-check__input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter pincode"
                  value={pincodeValue}
                  style={{
                    ...checkInputElStyle,
                    ...(checkInputElStyle.width ? { flex: "0 0 auto" } : null),
                  }}
                  onChange={(event) => setPincodeValue(digitsOnly(event.currentTarget.value))}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    onCheck(event);
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
                <EditableHotspot
                  as="button"
                  className="edd-check__button"
                  elementId="checkButton"
                  interactive={interactive}
                  selectedElement={selectedElement}
                  onSelect={onSelectElement}
                  style={checkButtonElStyle}
                  type="button"
                  disabled={checking || interactive}
                  onClick={interactive ? undefined : onCheck}
                >
                  {checking ? "Checking" : tracker.settings.checkDeliveryButtonLabel || "Check"}
                </EditableHotspot>
              </div>
              {check?.available === false && check?.message ? (
                <p className="edd-check__status" data-tone="error">
                  {formatPincodeStatusLine(check)}
                </p>
              ) : null}
              {check?.available === false ? (
                <button type="button" className="edd-request-btn" disabled>
                  Request delivery
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
