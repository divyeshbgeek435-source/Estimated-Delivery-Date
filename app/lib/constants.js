import {
  DEFAULT_PINCODE_RULES,
  DEFAULT_WEIGHT_RULES,
  LOCATION_SELECTION,
  WEIGHT_DISPLAY_MODES,
} from "./pincode";

export { DEFAULT_PINCODE_RULES, DEFAULT_WEIGHT_RULES, LOCATION_SELECTION, WEIGHT_DISPLAY_MODES };

export const WIDGET_LOCATIONS = {
  PRODUCT: "PRODUCT",
  CART: "CART",
  CHECKOUT: "CHECKOUT",
};

export const WIDGET_STATUSES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SCHEDULED: "SCHEDULED",
};

export const EVENT_TYPES = {
  IMPRESSION: "IMPRESSION",
  CLICK: "CLICK",
  ADD_TO_CART: "ADD_TO_CART",
  CONVERSION: "CONVERSION",
};

export const ACTIVITY_KINDS = {
  EVENT: "EVENT",
  REQUEST: "REQUEST",
};

export const PLACEMENT_MODES = {
  ALL_PRODUCTS: "ALL_PRODUCTS",
  COLLECTIONS: "COLLECTIONS",
  PRODUCTS: "PRODUCTS",
};

export const CART_DISPLAY_MODES = {
  PER_PRODUCT: "PER_PRODUCT",
  GENERAL: "GENERAL",
};

export const MARKET_MODES = {
  ALL: "ALL",
  SPECIFIC: "SPECIFIC",
};

export const PLACEMENT_POSITIONS = {
  DEFAULT: "DEFAULT",
  CUSTOM: "CUSTOM",
  BELOW_ATC: "BELOW_ATC",
  ABOVE_ATC: "ABOVE_ATC",
  PRODUCT_INFO: "PRODUCT_INFO",
  CART_PAGE: "CART_PAGE",
  CART_DRAWER: "CART_DRAWER",
  BEFORE_CHECKOUT: "BEFORE_CHECKOUT",
  AFTER_ITEMS: "AFTER_ITEMS",
  CHECKOUT_BLOCK: "CHECKOUT_BLOCK",
  AFTER_SHIPPING: "AFTER_SHIPPING",
  THANK_YOU: "THANK_YOU",
};

export const ALL_PLACEMENT_POSITIONS = Object.values(PLACEMENT_POSITIONS);

export const DATE_FORMATS = {
  LONG: "LONG",
  NUMERIC_MDY: "NUMERIC_MDY",
  NUMERIC_DMY: "NUMERIC_DMY",
};

export const WORKING_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const DEFAULT_WORKING_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

export const MESSAGE_TAGS = [
  { tag: "{counter}", label: "Countdown" },
  { tag: "{delivery_from}", label: "Delivery from" },
  { tag: "{delivery_to}", label: "Delivery to" },
  { tag: "{delivery_date}", label: "Delivery date range" },
  { tag: "{processing_from}", label: "Processing from" },
  { tag: "{processing_to}", label: "Processing to" },
  { tag: "{ordered_date}", label: "Order date" },
  { tag: "{stock_left}", label: "Stock left" },
  { tag: "{product_name}", label: "Product name" },
  { tag: "{image}", label: "Header image" },
];

export const TRANSLATION_LOCALES = [
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "da", label: "Danish" },
  { value: "sv", label: "Swedish" },
  { value: "nb", label: "Norwegian" },
  { value: "fi", label: "Finnish" },
  { value: "ja", label: "Japanese" },
];

export const FONT_OPTIONS = [
  { value: "inherit", label: "Theme default" },
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, serif", label: "Times New Roman" },
];

export const HEADING_WEIGHT_OPTIONS = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra bold" },
];

export const DEFAULT_SHIPPING = {
  processingMinDays: 0,
  processingMaxDays: 1,
  cutoffTime: "12:00 AM",
  workingDays: DEFAULT_WORKING_DAYS,
  blockedDates: [],
  transitMinDays: 1,
  transitMaxDays: 2,
  transitWorkingDays: DEFAULT_WORKING_DAYS,
  transitBlockedDates: [],
  pincodeRules: DEFAULT_PINCODE_RULES,
  weightRules: DEFAULT_WEIGHT_RULES,
  countryRules: {
    country: "IN",
    countries: [],
    locations: [],
    stateMode: "SPECIFIC",
    states: [],
    cityMode: "SPECIFIC",
    cities: [],
  },
};

export const DEFAULT_MESSAGE = {
  heading: "",
  template:
    "Order today within {counter}, you'll receive your package between {delivery_from} to {delivery_to}",
  dateFormat: DATE_FORMATS.LONG,
  dateSeparator: "/",
  includeYear: true,
  widgetLayout: "FULL",
  designTemplate: "TIMELINE",
  descriptionEnabled: true,
  headingEnabled: true,
  translations: {},
};

export const DEFAULT_ICONS = {
  purchased: "bag",
  processing: "truck",
  delivered: "pin",
  headerIcon: "flag",
  headerIconEnabled: true,
  purchasedEnabled: true,
  processingEnabled: true,
  deliveredEnabled: true,
  purchasedTitle: "Purchased",
  processingTitle: "Processing",
  deliveredTitle: "Delivered",
  purchasedColor: "",
  processingColor: "",
  deliveredColor: "",
  savedIcons: [],
};

export const WIDGET_DESIGNS = [
  { value: "MOMENT", label: "Moment Meter", help: "Pink card, dashed red path, animated progress" },
  { value: "BUBBLE", label: "Bubble Path", help: "Pink frame with yellow icon bubbles" },
  { value: "EXPRESS", label: "Free & Fast", help: "Gray card with stopwatch banner" },
  { value: "SEGMENTS", label: "Segments", help: "Blue three-panel delivery strip" },
  { value: "METER", label: "Progress Meter", help: "Peach track with orange fill animation" },
  { value: "BAND", label: "Status Band", help: "Lavender band with purple edges" },
  { value: "JOURNEY", label: "Journey", help: "Gray card, solid path, Order Confirmed → Doorstep" },
  { value: "TRACKER", label: "Tracker", help: "Header flag plus dotted milestones" },
  { value: "TIMELINE", label: "Timeline", help: "Classic three-step dates" },
  { value: "STACKED", label: "Stacked", help: "Vertical steps for mobile" },
  { value: "PILL", label: "Pills", help: "Rounded date chips" },
  { value: "BANNER", label: "Banner", help: "Compact delivery date bar" },
  { value: "CARD", label: "Highlight", help: "Accent card with delivery range" },
];

export const ANIMATED_DESIGNS = new Set(["MOMENT", "BUBBLE", "EXPRESS", "SEGMENTS", "METER", "BAND", "JOURNEY"]);

export const TEMPLATE_COLORS = ["#000000", "#E53935", "#43A047", "#1E88E5", "#3949AB", "#FDD835", "#757575", "#F57C00"];

export const TEMPLATE_STYLE_PRESETS = {
  TIMELINE: {
    backgroundType: "SOLID",
    backgroundColor: "#E8E8E8",
    borderWidth: 0,
    borderColor: "#E1E3E5",
  },
  MOMENT: {
    backgroundType: "GRADIENT",
    backgroundColor: "#FFF5F7",
    gradientStart: "#FFE4EC",
    gradientEnd: "#FFFFFF",
    gradientDirection: "TO_BOTTOM",
    borderWidth: 0,
    borderRadius: 16,
    iconSize: 40,
    progressWidth: 4,
    themeColor: "#E53935",
    progressColor: "#E53935",
    textColor: "#222222",
    statusColor: "#222222",
    dateColor: "#E53935",
    dynamicColor: "#E53935",
    paddingTop: 16,
    paddingMiddle: 14,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 16,
  },
  BUBBLE: {
    backgroundType: "SOLID",
    backgroundColor: "#FCE4EC",
    borderWidth: 2,
    borderColor: "#F8BBD0",
    borderRadius: 16,
    iconSize: 42,
    progressWidth: 4,
    themeColor: "#111111",
    progressColor: "#111111",
    textColor: "#111111",
    statusColor: "#111111",
    dateColor: "#111111",
    dynamicColor: "#111111",
    paddingTop: 12,
    paddingMiddle: 10,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  EXPRESS: {
    backgroundType: "SOLID",
    backgroundColor: "#EBEBEB",
    borderWidth: 0,
    borderRadius: 14,
    iconSize: 38,
    progressWidth: 4,
    themeColor: "#111111",
    progressColor: "#111111",
    textColor: "#111111",
    statusColor: "#111111",
    dateColor: "#111111",
    dynamicColor: "#111111",
    paddingTop: 14,
    paddingMiddle: 12,
    paddingBottom: 14,
    paddingLeft: 14,
    paddingRight: 14,
  },
  SEGMENTS: {
    backgroundType: "SOLID",
    backgroundColor: "#E3F2FD",
    borderWidth: 0,
    borderRadius: 14,
    iconSize: 36,
    themeColor: "#1565C0",
    progressColor: "#1565C0",
    textColor: "#0D47A1",
    statusColor: "#0D47A1",
    dateColor: "#0D47A1",
    dynamicColor: "#0D47A1",
    paddingTop: 0,
    paddingMiddle: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  METER: {
    backgroundType: "SOLID",
    backgroundColor: "#FFF3E6",
    borderWidth: 0,
    borderRadius: 18,
    iconSize: 44,
    progressWidth: 8,
    themeColor: "#F68B33",
    progressColor: "#F68B33",
    textColor: "#222222",
    statusColor: "#222222",
    dateColor: "#222222",
    dynamicColor: "#F68B33",
    paddingTop: 18,
    paddingMiddle: 14,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 16,
  },
  BAND: {
    backgroundType: "SOLID",
    backgroundColor: "#F3E8FF",
    borderWidth: 0,
    borderRadius: 12,
    iconSize: 40,
    themeColor: "#7E57C2",
    progressColor: "#7E57C2",
    textColor: "#4A148C",
    statusColor: "#6A1B9A",
    dateColor: "#111111",
    dynamicColor: "#6A1B9A",
    paddingTop: 14,
    paddingMiddle: 10,
    paddingBottom: 14,
    paddingLeft: 10,
    paddingRight: 10,
  },
  JOURNEY: {
    backgroundType: "SOLID",
    backgroundColor: "#F3F3F3",
    borderWidth: 0,
    borderColor: "#E1E3E5",
    borderRadius: 16,
    iconSize: 44,
    progressWidth: 5,
    paddingTop: 18,
    paddingMiddle: 14,
    paddingBottom: 18,
    paddingLeft: 16,
    paddingRight: 16,
    themeColor: "#111111",
    progressColor: "#111111",
    textColor: "#111111",
    statusColor: "#111111",
    dateColor: "#111111",
    dynamicColor: "#111111",
  },
  STACKED: {
    backgroundType: "SOLID",
    backgroundColor: "#E8E8E8",
    borderWidth: 0,
    borderColor: "#E1E3E5",
  },
  PILL: {
    backgroundType: "SOLID",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E3E5",
  },
  TRACKER: {
    backgroundType: "SOLID",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    iconSize: 36,
    progressWidth: 3,
  },
  BANNER: {
    backgroundType: "SOLID",
    backgroundColor: "#FFF9E5",
    borderWidth: 1,
    borderColor: "#EBD8AD",
  },
  CARD: {
    backgroundType: "SOLID",
    backgroundColor: "#E8FBFC",
    borderWidth: 1,
    borderColor: "#3DCCC7",
  },
};

export const TEMPLATE_TITLE_PRESETS = {
  TRACKER: {
    purchasedTitle: "Order Confirmed",
    processingTitle: "Shipped",
    deliveredTitle: "At Your Doorstep",
  },
  JOURNEY: {
    purchased: "package",
    processing: "truck",
    delivered: "home",
    headerIcon: "flag",
    headerIconEnabled: false,
    purchasedTitle: "Order Confirmed",
    processingTitle: "Shipped",
    deliveredTitle: "At Your Doorstep",
  },
  MOMENT: {
    purchased: "bag",
    processing: "truck",
    delivered: "pin",
    headerIconEnabled: false,
    purchasedTitle: "Order On",
    processingTitle: "Production",
    deliveredTitle: "Delivered",
  },
  BUBBLE: {
    purchased: "package",
    processing: "truck",
    delivered: "bag",
    headerIcon: "bag",
    headerIconEnabled: true,
    purchasedTitle: "Ordered",
    processingTitle: "Shipped",
    deliveredTitle: "Delivery",
  },
  EXPRESS: {
    purchased: "bag",
    processing: "truck",
    delivered: "pin",
    headerIcon: "clock",
    headerIconEnabled: true,
    purchasedTitle: "Order Confirmed",
    processingTitle: "Shipped",
    deliveredTitle: "At your Doorstep",
  },
  SEGMENTS: {
    purchased: "bag",
    processing: "truck",
    delivered: "home",
    headerIconEnabled: false,
    purchasedTitle: "Order Now",
    processingTitle: "Ready to Ship",
    deliveredTitle: "At your Doorstep",
  },
  METER: {
    purchased: "package",
    processing: "truck",
    delivered: "home",
    headerIconEnabled: false,
    purchasedTitle: "Order Now",
    processingTitle: "Shipped",
    deliveredTitle: "At Your Doorstep",
  },
  BAND: {
    purchased: "calendar",
    processing: "truck",
    delivered: "bag",
    headerIconEnabled: false,
    purchasedTitle: "Order Now",
    processingTitle: "Ready to Ship",
    deliveredTitle: "At your Doorstep",
  },
};

export const EDITOR_TABS = [
  { id: "conditions", label: "Conditions" },
  { id: "design", label: "Design" },
  { id: "placement", label: "Placement" },
];

export const ICON_OPTIONS = [
  { value: "package", label: "Package", polaris: "package" },
  { value: "box", label: "Box", polaris: "product" },
  { value: "truck", label: "Truck", polaris: "delivery" },
  { value: "clock", label: "Clock", polaris: "clock" },
  { value: "calendar", label: "Calendar", polaris: "calendar" },
  { value: "check", label: "Check", polaris: "check-circle" },
  { value: "home", label: "Home", polaris: "home" },
  { value: "pin", label: "Pin", polaris: "location" },
  { value: "bag", label: "Shopping bag", polaris: "cart" },
  { value: "flag", label: "Flag", polaris: "flag" },
];

export const ANIMATED_ICON_OPTIONS = [
  { value: "animTruck", label: "Truck drive", base: "truck", motion: "drive" },
  { value: "animPackage", label: "Package bounce", base: "package", motion: "bounce" },
  { value: "animBox", label: "Box shake", base: "box", motion: "shake" },
  { value: "animClock", label: "Clock tick", base: "clock", motion: "tick" },
  { value: "animBag", label: "Bag float", base: "bag", motion: "float" },
  { value: "animPin", label: "Pin drop", base: "pin", motion: "drop" },
  { value: "animCheck", label: "Check pop", base: "check", motion: "pop" },
  { value: "animHome", label: "Home bob", base: "home", motion: "bob" },
  { value: "animFlag", label: "Flag wave", base: "flag", motion: "wave" },
  { value: "animCalendar", label: "Calendar flip", base: "calendar", motion: "flip" },
];

export const ANIMATED_ICON_MAP = Object.fromEntries(
  ANIMATED_ICON_OPTIONS.map((item) => [item.value, item]),
);

export const GRADIENT_DIRECTIONS = [
  { value: "TO_RIGHT", label: "Left to right" },
  { value: "TO_LEFT", label: "Right to left" },
  { value: "TO_BOTTOM", label: "Top to bottom" },
  { value: "TO_TOP", label: "Bottom to top" },
  { value: "TO_BOTTOM_RIGHT", label: "Diagonal down" },
];

export const DEFAULT_STYLE = {
  backgroundType: "SOLID",
  backgroundColor: "#E8E8E8",
  gradientStart: "#FFFFFF",
  gradientEnd: "#F1F1F1",
  gradientDirection: "TO_BOTTOM",
  borderRadius: 8,
  themeColor: "#000000",
  borderWidth: 0,
  borderColor: "#E1E3E5",
  paddingTop: 16,
  paddingMiddle: 12,
  paddingBottom: 12,
  paddingLeft: 16,
  paddingRight: 16,
  iconSize: 22,
  progressWidth: 2,
  progressColor: "#000000",
  fontFamily: "inherit",
  fontSize: 15,
  textColor: "#202223",
  statusFontSize: 13,
  statusColor: "#202223",
  dateFontSize: 13,
  dateColor: "#202223",
  dynamicColor: "#202223",
  headingFontWeight: 600,
  customCss: "",
};

export const DEFAULT_PLACEMENT = {
  mode: PLACEMENT_MODES.ALL_PRODUCTS,
  productIds: [],
  collectionIds: [],
  products: [],
  collections: [],
  position: PLACEMENT_POSITIONS.DEFAULT,
};

export const DEFAULT_CART = {
  displayMode: CART_DISPLAY_MODES.GENERAL,
};

export const DEFAULT_CHECKOUT = {
  heading: "Estimated Delivery",
  template:
    "You'll receive your package between {delivery_from} to {delivery_to}",
  purchasedIcon: "check",
  processingIcon: "clock",
  deliveredIcon: "truck",
  backgroundType: "SOLID",
  backgroundColor: "#FFFFFF",
  gradientStart: "#FFFFFF",
  gradientEnd: "#F1F1F1",
  gradientDirection: "TO_BOTTOM",
  borderRadius: 8,
  themeColor: "#008060",
};

export function locationLabel(location) {
  if (location === WIDGET_LOCATIONS.CART) return "Cart page";
  if (location === WIDGET_LOCATIONS.CHECKOUT) return "Checkout page";
  return "Product page";
}

export function defaultWidgetName(location) {
  if (location === WIDGET_LOCATIONS.CART) return "New cart delivery widget";
  if (location === WIDGET_LOCATIONS.CHECKOUT) return "New checkout delivery widget";
  return "New estimated delivery widget";
}

export function defaultPosition(location) {
  if (location === WIDGET_LOCATIONS.CART) return PLACEMENT_POSITIONS.CART_PAGE;
  if (location === WIDGET_LOCATIONS.CHECKOUT) return PLACEMENT_POSITIONS.CHECKOUT_BLOCK;
  return PLACEMENT_POSITIONS.BELOW_ATC;
}

export function widgetSnippet(location, displayMode) {
  if (location === WIDGET_LOCATIONS.CART && displayMode === CART_DISPLAY_MODES.PER_PRODUCT) {
    return '<div class="essential-estimated-cart-per-product"></div>';
  }
  if (location === WIDGET_LOCATIONS.CART) {
    return '<div class="essential-estimated-cart-general"></div>';
  }
  return '<div class="essential-estimated-delivery-block-liquid"></div>';
}
