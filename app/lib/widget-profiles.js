import { PLACEMENT_POSITIONS, WIDGET_LOCATIONS } from "./constants";

export function widgetProfile(location) {
  if (location === WIDGET_LOCATIONS.CART) return CART_PROFILE;
  if (location === WIDGET_LOCATIONS.CHECKOUT) return CHECKOUT_PROFILE;
  return PRODUCT_PROFILE;
}

const PRODUCT_PROFILE = {
  location: WIDGET_LOCATIONS.PRODUCT,
  label: "Product page",
  editorHeading: "Product page widget",
  showShipping: true,
  showMarkets: true,
  showCartMode: false,
  showLayout: true,
  showIcons: true,
  showFullDesign: true,
  placementTitle: "Apply to",
  positions: [
    {
      value: PLACEMENT_POSITIONS.ABOVE_ATC,
      label: "Above Add to Cart",
      help: "Show the widget just above the Add to Cart button.",
    },
    {
      value: PLACEMENT_POSITIONS.BELOW_ATC,
      label: "Below Add to Cart",
      help: "Show the widget just below the Add to Cart button.",
    },
    {
      value: PLACEMENT_POSITIONS.PRODUCT_INFO,
      label: "Product information section",
      help: "Show the widget with the product title and description.",
    },
    {
      value: PLACEMENT_POSITIONS.CUSTOM,
      label: "Theme editor / custom",
      help: "Place the app block yourself in the theme editor.",
    },
  ],
};

const CART_PROFILE = {
  location: WIDGET_LOCATIONS.CART,
  label: "Cart page",
  editorHeading: "Cart page widget",
  showShipping: true,
  showMarkets: true,
  showCartMode: true,
  showLayout: true,
  showIcons: true,
  showFullDesign: true,
  placementTitle: "Show on",
  positions: [
    {
      value: PLACEMENT_POSITIONS.CART_PAGE,
      label: "Cart page",
      help: "Show on the full cart page.",
    },
    {
      value: PLACEMENT_POSITIONS.CART_DRAWER,
      label: "Cart drawer",
      help: "Show in the cart drawer or mini-cart.",
    },
    {
      value: PLACEMENT_POSITIONS.BEFORE_CHECKOUT,
      label: "Before checkout button",
      help: "Show directly above the checkout button.",
    },
    {
      value: PLACEMENT_POSITIONS.AFTER_ITEMS,
      label: "After cart items",
      help: "Show under the list of cart items.",
    },
  ],
};

const CHECKOUT_PROFILE = {
  location: WIDGET_LOCATIONS.CHECKOUT,
  label: "Checkout page",
  editorHeading: "Checkout page widget",
  showShipping: true,
  showMarkets: true,
  showCartMode: false,
  showLayout: false,
  showIcons: false,
  showFullDesign: false,
  placementTitle: "Checkout location",
  positions: [
    {
      value: PLACEMENT_POSITIONS.CHECKOUT_BLOCK,
      label: "Checkout page",
      help: "Show as a checkout app block in information, shipping, or payment.",
    },
    {
      value: PLACEMENT_POSITIONS.AFTER_SHIPPING,
      label: "After shipping methods",
      help: "Show after the shipping option list.",
    },
    {
      value: PLACEMENT_POSITIONS.THANK_YOU,
      label: "Thank you page",
      help: "Show on the order status / thank you page.",
    },
  ],
};

export function normalizePosition(location, position) {
  const profile = widgetProfile(location);
  const allowed = new Set(profile.positions.map((item) => item.value));
  if (position && allowed.has(position)) return position;
  if (location === WIDGET_LOCATIONS.CART) return PLACEMENT_POSITIONS.CART_PAGE;
  if (location === WIDGET_LOCATIONS.CHECKOUT) return PLACEMENT_POSITIONS.CHECKOUT_BLOCK;
  return PLACEMENT_POSITIONS.BELOW_ATC;
}

export function checkoutSlotForPosition(position) {
  if (position === PLACEMENT_POSITIONS.AFTER_SHIPPING) return "shipping";
  if (position === PLACEMENT_POSITIONS.THANK_YOU) return "thankyou";
  return "checkout";
}
