import { addDays, format, parseISO } from "date-fns";

const WEEKDAY_BY_INDEX = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

const TIMEZONE_CACHE = new Map();

export function resolveTimeZone(timeZone) {
  const value = String(timeZone || "").trim() || "UTC";
  const cached = TIMEZONE_CACHE.get(value);
  if (cached) return cached;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    TIMEZONE_CACHE.set(value, value);
    return value;
  } catch {
    TIMEZONE_CACHE.set(value, "UTC");
    return "UTC";
  }
}

function partsFromDate(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function getZonedParts(date, timeZone) {
  const when = date instanceof Date ? date : new Date(date);
  const safeDate = Number.isNaN(when.getTime()) ? new Date() : when;
  try {
    return partsFromDate(safeDate, resolveTimeZone(timeZone));
  } catch {
    return partsFromDate(safeDate, "UTC");
  }
}

export function parseCutoffMinutes(cutoffTime) {
  const value = String(cutoffTime || "12:00 PM").trim();
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return 12 * 60;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "AM") {
    hours = hours === 12 ? 0 : hours;
  } else if (meridiem === "PM") {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return hours * 60 + minutes;
}

export function splitCutoff(cutoffTime) {
  const minutesTotal = parseCutoffMinutes(cutoffTime);
  const hours24 = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hours, minutes, meridiem };
}

export function joinCutoff(hours, minutes, meridiem) {
  return `${Number(hours) || 12}:${String(Number(minutes) || 0).padStart(2, "0")} ${meridiem === "PM" ? "PM" : "AM"}`;
}

export function formatCutoffDisplay(cutoffTime) {
  const { hours, minutes, meridiem } = splitCutoff(cutoffTime);
  return `${hours}:${pad(minutes)} ${meridiem}`;
}

function isDateBlocked(dateStr, blockedDates = []) {
  return (blockedDates || []).some((item) => {
    const start = typeof item === "string" ? item : item?.date;
    if (!start) return false;
    const end = typeof item === "string" ? start : item?.endDate || start;
    const recurring = Boolean(item?.recurring);
    if (recurring) {
      const md = dateStr.slice(5);
      const startMd = start.slice(5);
      const endMd = end.slice(5);
      if (startMd <= endMd) return md >= startMd && md <= endMd;
      return md >= startMd || md <= endMd;
    }
    return dateStr >= start && dateStr <= end;
  });
}

export function isWorkingDate(dateStr, workingDays, blockedDates) {
  const date = parseISO(`${dateStr}T12:00:00`);
  const weekday = WEEKDAY_BY_INDEX[date.getUTCDay()];
  if (!(workingDays || []).includes(weekday)) return false;
  return !isDateBlocked(dateStr, blockedDates);
}

export function nextValidWorkingDay(dateStr, workingDays, blockedDates, includeToday = true) {
  let current = dateStr;
  for (let i = 0; i < 366; i += 1) {
    if ((includeToday || i > 0) && isWorkingDate(current, workingDays, blockedDates)) {
      return current;
    }
    current = format(addDays(parseISO(`${current}T12:00:00`), 1), "yyyy-MM-dd");
  }
  return current;
}

function addWorkingDays(dateStr, days, workingDays, blockedDates) {
  let current = dateStr;
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    current = format(addDays(parseISO(`${current}T12:00:00`), 1), "yyyy-MM-dd");
    if (isWorkingDate(current, workingDays, blockedDates)) {
      remaining -= 1;
    }
  }
  return current;
}

function combineOrderDate(orderDate, orderTime, timeZone) {
  if (orderDate instanceof Date && !orderTime) {
    return getZonedParts(orderDate, timeZone);
  }

  const dateValue =
    orderDate instanceof Date
      ? format(orderDate, "yyyy-MM-dd")
      : String(orderDate || format(new Date(), "yyyy-MM-dd"));
  const timeValue = String(orderTime || "00:00");
  const isoGuess = new Date(`${dateValue}T${timeValue.length === 5 ? `${timeValue}:00` : timeValue}`);
  if (!Number.isNaN(isoGuess.getTime())) {
    return getZonedParts(isoGuess, timeZone);
  }
  return getZonedParts(new Date(), timeZone);
}

export function getCountdownToCutoff({ now = new Date(), cutoffTime, workingDays, blockedDates, timezone }) {
  const zoned = getZonedParts(now, timezone || "UTC");
  const cutoffMinutes = parseCutoffMinutes(cutoffTime);
  const currentMinutes = zoned.hour * 60 + zoned.minute;
  let targetDate = zoned.dateStr;
  let remainingMinutes = cutoffMinutes - currentMinutes;

  if (
    remainingMinutes <= 0 ||
    !isWorkingDate(targetDate, workingDays, blockedDates)
  ) {
    targetDate = nextValidWorkingDay(zoned.dateStr, workingDays, blockedDates, false);
    const daysAhead = Math.max(
      0,
      Math.round(
        (parseISO(`${targetDate}T12:00:00`).getTime() -
          parseISO(`${zoned.dateStr}T12:00:00`).getTime()) /
          86400000,
      ),
    );
    remainingMinutes = daysAhead * 24 * 60 + cutoffMinutes - currentMinutes;
  }

  const totalSeconds = Math.max(0, remainingMinutes * 60 - zoned.second);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const friendly =
    hours > 0
      ? `${pad(hours)}\u00a0h\u00a0${pad(minutes)}\u00a0min`
      : `${pad(minutes)}\u00a0min`;

  return {
    totalSeconds,
    formatted: friendly,
    clock: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

export function shippingCalculatorInput(shipping = {}, timezone = "UTC") {
  return {
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
  };
}

export function calculateDeliveryDate({
  orderDate = new Date(),
  orderTime,
  processingMinDays = 1,
  processingMaxDays = 2,
  cutoffTime = "12:00 PM",
  workingDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  blockedDates = [],
  transitMinDays = 0,
  transitMaxDays = 0,
  transitWorkingDays,
  transitBlockedDates = [],
  timezone = "UTC",
}) {
  const zoned = combineOrderDate(orderDate, orderTime, timezone);
  const currentMinutes = zoned.hour * 60 + zoned.minute;
  const afterCutoff = currentMinutes >= parseCutoffMinutes(cutoffTime);
  const todayIsValid = isWorkingDate(zoned.dateStr, workingDays, blockedDates);

  const processingStart = nextValidWorkingDay(
    zoned.dateStr,
    workingDays,
    blockedDates,
    todayIsValid && !afterCutoff,
  );

  const processingDateMin = addWorkingDays(
    processingStart,
    Number(processingMinDays) || 0,
    workingDays,
    blockedDates,
  );
  const processingDateMax = addWorkingDays(
    processingStart,
    Number(processingMaxDays) || Number(processingMinDays) || 0,
    workingDays,
    blockedDates,
  );

  const transitDays = transitWorkingDays?.length ? transitWorkingDays : workingDays;
  const transitBlocked = transitBlockedDates || [];
  const deliveryDateMin = addWorkingDays(
    processingDateMax,
    Number(transitMinDays) || 0,
    transitDays,
    transitBlocked,
  );
  const deliveryDateMax = addWorkingDays(
    processingDateMax,
    Number(transitMaxDays) || Number(transitMinDays) || 0,
    transitDays,
    transitBlocked,
  );

  return {
    processingDate: processingDateMin,
    processingDateMin,
    processingDateMax,
    deliveryDate: deliveryDateMax,
    deliveryDateMin,
    deliveryDateMax,
  };
}

export function formatDisplayDate(dateStr, pattern = "EEEE, MMMM d") {
  if (!dateStr) return "";
  return format(parseISO(`${dateStr}T12:00:00`), pattern);
}

export function formatWidgetDate(dateStr, settings = {}) {
  if (!dateStr) return "";
  const includeYear = Boolean(settings.includeYear);
  const separator = settings.dateSeparator || "/";
  const dateFormat = settings.dateFormat || "LONG";

  if (dateFormat === "NUMERIC_MDY") {
    return format(parseISO(`${dateStr}T12:00:00`), includeYear ? `MM'${separator}'dd'${separator}'yyyy` : `MM'${separator}'dd`);
  }
  if (dateFormat === "NUMERIC_DMY") {
    return format(parseISO(`${dateStr}T12:00:00`), includeYear ? `dd'${separator}'MM'${separator}'yyyy` : `dd'${separator}'MM`);
  }
  return format(parseISO(`${dateStr}T12:00:00`), includeYear ? "MMM d, yyyy" : "MMM d");
}

export function formatTimelineLabel(from, to) {
  if (!from) return "";
  const start = parseISO(`${from}T12:00:00`);
  if (!to || from === to) return format(start, "MMM d");
  const end = parseISO(`${to}T12:00:00`);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")} - ${format(end, "d")}`;
  }
  return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
}

const HIGHLIGHT_MESSAGE_KEYS = new Set([
  "counter",
  "countdown",
  "delivery_from",
  "delivery_to",
  "delivery_date",
  "processing_from",
  "processing_to",
  "processing_date",
  "ordered_date",
  "order_date",
]);

export function messageSegments(template, values = {}) {
  const parts = [];
  const source = String(template || "");
  const token = /\{([a-z_]+)\}/gi;
  let lastIndex = 0;
  let match = token.exec(source);
  while (match) {
    if (match.index > lastIndex) {
      parts.push({ text: source.slice(lastIndex, match.index), highlight: false });
    }
    const key = match[1];
    const known = Object.prototype.hasOwnProperty.call(values, key);
    parts.push({
      text: known ? String(values[key] ?? "") : match[0],
      highlight: known && HIGHLIGHT_MESSAGE_KEYS.has(key),
    });
    lastIndex = token.lastIndex;
    match = token.exec(source);
  }
  if (lastIndex < source.length) {
    parts.push({ text: source.slice(lastIndex), highlight: false });
  }
  return parts;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function resolveMessageHtml(template, values = {}) {
  return messageSegments(template, values)
    .map((part) => {
      const text = escapeHtml(part.text);
      return part.highlight ? `<strong>${text}</strong>` : text;
    })
    .join("");
}

export function messageValues({
  delivery,
  countdown,
  now = new Date(),
  timezone = "UTC",
  dateSettings = {},
  productName = "",
  stockLeft = "",
}) {
  const orderDate = formatWidgetDate(getZonedParts(now, timezone).dateStr, dateSettings);
  const deliveryFrom = formatWidgetDate(delivery.deliveryDateMin, dateSettings);
  const deliveryTo = formatWidgetDate(delivery.deliveryDateMax, dateSettings);
  const sameDay = delivery.deliveryDateMin === delivery.deliveryDateMax;

  return {
    counter: countdown.formatted,
    countdown: countdown.formatted,
    delivery_from: deliveryFrom,
    delivery_to: deliveryTo,
    delivery_date: sameDay ? deliveryFrom : `${deliveryFrom} to ${deliveryTo}`,
    processing_from: formatWidgetDate(delivery.processingDateMin, dateSettings),
    processing_to: formatWidgetDate(delivery.processingDateMax, dateSettings),
    processing_date: formatWidgetDate(delivery.processingDateMin, dateSettings),
    ordered_date: orderDate,
    order_date: orderDate,
    product_name: productName,
    stock_left: stockLeft,
  };
}

export function buildStorefrontDelivery(shipping, timezone = "UTC", now = new Date(), extras = {}) {
  const input = shippingCalculatorInput(shipping, timezone);
  const delivery = calculateDeliveryDate({ orderDate: now, ...input });
  const countdown = getCountdownToCutoff({ now, ...input });
  return {
    ...delivery,
    ...messageValues({
      delivery,
      countdown,
      now,
      timezone,
      dateSettings: extras.dateSettings,
      productName: extras.productName,
      stockLeft: extras.stockLeft,
    }),
    countdownSeconds: countdown.totalSeconds,
    purchasedLabel: formatTimelineLabel(getZonedParts(now, timezone).dateStr),
    processingLabel: formatTimelineLabel(delivery.processingDateMin, delivery.processingDateMax),
    deliveredLabel: formatTimelineLabel(delivery.deliveryDateMin, delivery.deliveryDateMax),
  };
}

export function resolveMessage(template, values) {
  return String(template || "").replace(/\{([a-z_]+)\}/gi, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? "") : match,
  );
}

export function cssGradientDirection(direction) {
  switch (direction) {
    case "TO_RIGHT":
      return "to right";
    case "TO_LEFT":
      return "to left";
    case "TO_TOP":
      return "to top";
    case "TO_BOTTOM_RIGHT":
      return "to bottom right";
    default:
      return "to bottom";
  }
}

export function widgetBackground(style = {}) {
  if (style.backgroundType === "TRANSPARENT") return "transparent";
  if (style.backgroundType === "GRADIENT") {
    return `linear-gradient(${cssGradientDirection(style.gradientDirection)}, ${style.gradientStart}, ${style.gradientEnd})`;
  }
  return style.backgroundColor || "#E8E8E8";
}

export function summarizeWorkingDays(workingDays = []) {
  const labels = {
    MONDAY: "Mon",
    TUESDAY: "Tue",
    WEDNESDAY: "Wed",
    THURSDAY: "Thu",
    FRIDAY: "Fri",
    SATURDAY: "Sat",
    SUNDAY: "Sun",
  };
  return workingDays.map((day) => labels[day] || day).join("–");
}
