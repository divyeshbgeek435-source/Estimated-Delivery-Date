import { DEFAULT_PINCODE_RULES, DEFAULT_WEIGHT_RULES } from "./pincode";

export { DEFAULT_PINCODE_RULES, DEFAULT_WEIGHT_RULES };

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
  { tag: "{processing_from}", label: "Processing from" },
  { tag: "{processing_to}", label: "Processing to" },
  { tag: "{ordered_date}", label: "Order date" },
  { tag: "{stock_left}", label: "Stock left" },
  { tag: "{product_name}", label: "Product name" },
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
  translations: {},
};

export const DEFAULT_ICONS = {
  purchased: "bag",
  processing: "truck",
  delivered: "pin",
  purchasedTitle: "Purchased",
  processingTitle: "Processing",
  deliveredTitle: "Delivered",
  purchasedColor: "",
  processingColor: "",
  deliveredColor: "",
};

export const WIDGET_DESIGNS = [
  { value: "TIMELINE", label: "Timeline", help: "Classic three-step dates" },
  { value: "COMPACT", label: "Compact", help: "One delivery line" },
  { value: "STACKED", label: "Stacked", help: "Vertical steps for mobile" },
  { value: "PILL", label: "Pills", help: "Rounded date chips" },
  { value: "CARD", label: "Details", help: "Labeled rows with icons" },
];

export const EDITOR_TABS = [
  { id: "conditions", label: "Conditions" },
  { id: "content", label: "Content" },
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
];

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
  fontSize: 14,
  textColor: "#202223",
  statusFontSize: 12,
  statusColor: "#202223",
  dateFontSize: 11,
  dateColor: "#202223",
  dynamicColor: "#202223",
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
