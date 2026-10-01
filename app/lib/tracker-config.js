import { DEFAULT_ICONS } from "./constants";
import { DEFAULT_CONNECTOR_STYLE, normalizeConnectorStyle } from "./connector-styles";

export const TRACKER_DATE_SOURCES = [
  { value: "ordered", label: "Order date" },
  { value: "processing", label: "Processing window" },
  { value: "delivered", label: "Delivery window" },
  { value: "custom", label: "Custom text" },
];

export const TRACKER_STATUSES = [
  { value: "complete", label: "Complete" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
];

export const TRACKER_CIRCLE_STYLES = [
  { value: "filled", label: "Filled circles" },
  { value: "outline", label: "Outline circles" },
];

export const TRACKER_PROGRESS_STYLES = [
  { value: "solid", label: "Solid line" },
  { value: "dashed", label: "Dashed line" },
];

export const DEFAULT_TRACKER_SETTINGS = {
  showHeaderIcon: true,
  showTitle: true,
  showDescription: true,
  showTrack: true,
  showCheckDelivery: true,
  checkDeliveryLabel: "Check delivery",
  checkDeliveryButtonLabel: "Check",
  trackShellBg: "#FFFFFF",
  trackShellBorder: "#DEDEDE",
  trackShellRadius: 12,
  circleStyle: "filled",
  progressStyle: "solid",
  animationEnabled: true,
  stackOnMobile: true,
  connector: { ...DEFAULT_CONNECTOR_STYLE },
};

export const DEFAULT_TRACKER_STEPS = [
  {
    id: "step-ordered",
    title: "Ordered",
    icon: "bag",
    color: "",
    status: "complete",
    dateSource: "ordered",
    customDate: "",
    enabled: true,
  },
  {
    id: "step-transit",
    title: "Out for delivery",
    icon: "truck",
    color: "",
    status: "active",
    dateSource: "processing",
    customDate: "",
    enabled: true,
  },
  {
    id: "step-delivered",
    title: "Delivered today",
    icon: "pin",
    color: "",
    status: "pending",
    dateSource: "delivered",
    customDate: "",
    enabled: true,
  },
];

export const DEFAULT_TRACKER_CONFIG = {
  steps: DEFAULT_TRACKER_STEPS,
  settings: DEFAULT_TRACKER_SETTINGS,
};

function uid(prefix = "step") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeStep(step = {}, index = 0) {
  const fallback = DEFAULT_TRACKER_STEPS[Math.min(index, DEFAULT_TRACKER_STEPS.length - 1)];
  const numberOrNull = (value) => {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  return {
    id: String(step.id || uid("step")),
    title: String(step.title || fallback.title || `Step ${index + 1}`).slice(0, 40),
    icon: String(step.icon || fallback.icon || "bag"),
    color: String(step.color || ""),
    status: TRACKER_STATUSES.some((item) => item.value === step.status)
      ? step.status
      : fallback.status || "pending",
    dateSource: TRACKER_DATE_SOURCES.some((item) => item.value === step.dateSource)
      ? step.dateSource
      : fallback.dateSource || "delivered",
    customDate: String(step.customDate || "").slice(0, 40),
    enabled: step.enabled !== false,
    labelFontSize: numberOrNull(step.labelFontSize),
    labelColor: String(step.labelColor || ""),
    dateFontSize: numberOrNull(step.dateFontSize),
    dateColor: String(step.dateColor || ""),
  };
}

export function normalizeTrackerSettings(settings = {}) {
  const merged = { ...DEFAULT_TRACKER_SETTINGS, ...asObject(settings) };
  return {
    showHeaderIcon: merged.showHeaderIcon !== false,
    showTitle: merged.showTitle !== false,
    showDescription: merged.showDescription !== false,
    showTrack: merged.showTrack !== false,
    showCheckDelivery: merged.showCheckDelivery !== false,
    checkDeliveryLabel: String(merged.checkDeliveryLabel || "Check delivery").slice(0, 40),
    checkDeliveryButtonLabel: String(merged.checkDeliveryButtonLabel || "Check").slice(0, 24),
    trackShellBg: String(merged.trackShellBg || "#FFFFFF"),
    trackShellBorder: String(merged.trackShellBorder || "#DEDEDE"),
    trackShellRadius: Math.max(0, Math.min(32, Number(merged.trackShellRadius) || 12)),
    circleStyle: TRACKER_CIRCLE_STYLES.some((item) => item.value === merged.circleStyle)
      ? merged.circleStyle
      : "filled",
    progressStyle: TRACKER_PROGRESS_STYLES.some((item) => item.value === merged.progressStyle)
      ? merged.progressStyle
      : "solid",
    animationEnabled: merged.animationEnabled !== false,
    stackOnMobile: merged.stackOnMobile !== false,
    connector: normalizeConnectorStyle(merged.connector),
  };
}

export function normalizeTrackerSteps(steps) {
  const list = Array.isArray(steps) ? steps : [];
  if (!list.length) return DEFAULT_TRACKER_STEPS.map((step, index) => normalizeStep(step, index));
  return list.slice(0, 6).map((step, index) => normalizeStep(step, index));
}

export function normalizeTrackerConfig(config) {
  const source = asObject(config);
  return {
    steps: normalizeTrackerSteps(source.steps),
    settings: normalizeTrackerSettings(source.settings),
  };
}

/** Build tracker config from legacy purchased/processing/delivered icon fields. */
export function trackerConfigFromLegacyIcons(icons = {}) {
  return normalizeTrackerConfig({
    steps: [
      {
        id: "step-ordered",
        title: icons.purchasedTitle || "Ordered",
        icon: icons.purchased || "bag",
        color: icons.purchasedColor || "",
        status: "complete",
        dateSource: "ordered",
        enabled: icons.purchasedEnabled !== false,
      },
      {
        id: "step-transit",
        title: icons.processingTitle || "Out for delivery",
        icon: icons.processing || "truck",
        color: icons.processingColor || "",
        status: "active",
        dateSource: "processing",
        enabled: icons.processingEnabled !== false,
      },
      {
        id: "step-delivered",
        title: icons.deliveredTitle || "Delivered today",
        icon: icons.delivered || "pin",
        color: icons.deliveredColor || "",
        status: "pending",
        dateSource: "delivered",
        enabled: icons.deliveredEnabled !== false,
      },
    ],
    settings: {
      ...DEFAULT_TRACKER_SETTINGS,
      showHeaderIcon: icons.headerIconEnabled !== false,
    },
  });
}

export function resolveTrackerConfig(icons = {}) {
  if (icons.trackerConfig) return normalizeTrackerConfig(icons.trackerConfig);
  return trackerConfigFromLegacyIcons(icons);
}

/** Keep first three steps mirrored onto legacy icon fields for older paths. */
export function syncLegacyIconsFromTracker(trackerConfig, icons = {}) {
  const config = normalizeTrackerConfig(trackerConfig);
  const [first, second, third] = config.steps;
  return {
    ...icons,
    trackerConfig: config,
    purchased: first?.icon || icons.purchased || DEFAULT_ICONS.purchased,
    processing: second?.icon || icons.processing || DEFAULT_ICONS.processing,
    delivered: third?.icon || icons.delivered || DEFAULT_ICONS.delivered,
    purchasedTitle: first?.title || icons.purchasedTitle || DEFAULT_ICONS.purchasedTitle,
    processingTitle: second?.title || icons.processingTitle || DEFAULT_ICONS.processingTitle,
    deliveredTitle: third?.title || icons.deliveredTitle || DEFAULT_ICONS.deliveredTitle,
    purchasedColor: first?.color ?? icons.purchasedColor ?? "",
    processingColor: second?.color ?? icons.processingColor ?? "",
    deliveredColor: third?.color ?? icons.deliveredColor ?? "",
    purchasedEnabled: first ? first.enabled !== false : icons.purchasedEnabled !== false,
    processingEnabled: second ? second.enabled !== false : icons.processingEnabled !== false,
    deliveredEnabled: third ? third.enabled !== false : icons.deliveredEnabled !== false,
    headerIconEnabled: config.settings.showHeaderIcon,
  };
}

export function createTrackerStep(partial = {}) {
  return normalizeStep(
    {
      id: uid("step"),
      title: "New step",
      icon: "check",
      color: "",
      status: "pending",
      dateSource: "custom",
      customDate: "",
      enabled: true,
      ...partial,
    },
    0,
  );
}

<<<<<<< HEAD
export function moveTrackerStep(steps, fromIndex, toIndex) {
  const next = [...normalizeTrackerSteps(steps)];
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= next.length || toIndex >= next.length) return next;
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

=======
>>>>>>> 64a9729 (Remove deprecated components and streamline configuration files)
export function resolveStepDate(step, dates = {}) {
  if (!step) return "";
  if (step.dateSource === "custom") return step.customDate || "";
  if (step.dateSource === "ordered") return dates.ordered || "";
  if (step.dateSource === "processing") return dates.processing || "";
  return dates.delivered || "";
}

export function buildRenderableSteps(trackerConfig, { dates = {}, theme = "#111111" } = {}) {
  const config = normalizeTrackerConfig(trackerConfig);
  return config.steps.map((step) => ({
    key: step.id,
    icon: step.icon,
    enabled: step.enabled !== false,
    title: step.title,
    color: step.color || theme,
    date: resolveStepDate(step, dates),
    status: step.status,
    labelFontSize: step.labelFontSize,
    labelColor: step.labelColor,
    dateFontSize: step.dateFontSize,
    dateColor: step.dateColor,
  }));
}
