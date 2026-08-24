import { DeliveryWidgetPreview } from "./DeliveryWidgetPreview";
import { PLACEMENT_POSITIONS, WIDGET_LOCATIONS } from "../../lib/constants";
import { normalizePosition } from "../../lib/widget-profiles";

export function PlacementPreview({ location, position, children }) {
  const slot = normalizePosition(location, position);

  if (location === WIDGET_LOCATIONS.CART) {
    return <CartChrome slot={slot}>{children}</CartChrome>;
  }
  if (location === WIDGET_LOCATIONS.CHECKOUT) {
    return <CheckoutChrome slot={slot}>{children}</CheckoutChrome>;
  }
  return <ProductChrome slot={slot}>{children}</ProductChrome>;
}

export function LiveWidgetPreview({ location, position, ...previewProps }) {
  const isCheckout = location === WIDGET_LOCATIONS.CHECKOUT;
  return (
    <PlacementPreview location={location} position={position}>
      {isCheckout ? (
        <div className="edd-checkout-banner">
          <p className="edd-checkout-banner__heading">{previewProps.heading || "Estimated Delivery"}</p>
          <DeliveryWidgetPreview {...previewProps} heading="" layout="MINIMAL" design="COMPACT" showDescription />
        </div>
      ) : (
        <DeliveryWidgetPreview {...previewProps} />
      )}
    </PlacementPreview>
  );
}

function ProductChrome({ slot, children }) {
  const above = slot === PLACEMENT_POSITIONS.ABOVE_ATC;
  const info = slot === PLACEMENT_POSITIONS.PRODUCT_INFO;
  return (
    <div className="edd-chrome edd-chrome--product">
      <div className="edd-chrome__media" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="edd-chrome__shirt">
          <path
            d="M28 38 44 28h8l8 10 8-10h8l16 10-8 12h-6v42H42V50h-6l-8-12Z"
            fill="none"
            stroke="#c3c4c7"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="edd-chrome__copy">
        <span className="edd-chrome__line edd-chrome__line--title" />
        <span className="edd-chrome__line" />
        <span className="edd-chrome__line edd-chrome__line--short" />
        {info || above ? children : null}
        <button type="button" className="edd-chrome__atc" disabled>
          Add to cart
        </button>
        {info || above ? null : children}
      </div>
    </div>
  );
}

function CartChrome({ slot, children }) {
  const beforeCheckout = slot === PLACEMENT_POSITIONS.BEFORE_CHECKOUT;
  const afterItems = slot === PLACEMENT_POSITIONS.AFTER_ITEMS || slot === PLACEMENT_POSITIONS.CART_DRAWER;
  return (
    <div className={`edd-chrome edd-chrome--cart ${slot === PLACEMENT_POSITIONS.CART_DRAWER ? "edd-chrome--drawer" : ""}`}>
      <div className="edd-chrome__cart-main">
        <p className="edd-chrome__kicker">
          {slot === PLACEMENT_POSITIONS.CART_DRAWER ? "Cart drawer" : "Cart page"}
        </p>
        <div className="edd-chrome__item" />
        <div className="edd-chrome__item" />
        {afterItems ? children : null}
      </div>
      <div className="edd-chrome__cart-side">
        <span className="edd-chrome__line" />
        <span className="edd-chrome__line edd-chrome__line--short" />
        {beforeCheckout ? children : null}
        {afterItems || beforeCheckout ? null : children}
        <button type="button" className="edd-chrome__atc" disabled>
          Checkout
        </button>
      </div>
    </div>
  );
}

function CheckoutChrome({ slot, children }) {
  return (
    <div className="edd-chrome edd-chrome--checkout">
      <div className="edd-chrome__checkout-form">
        <p className="edd-chrome__kicker">
          {slot === PLACEMENT_POSITIONS.THANK_YOU
            ? "Thank you page"
            : slot === PLACEMENT_POSITIONS.AFTER_SHIPPING
              ? "Shipping"
              : "Checkout"}
        </p>
        <span className="edd-chrome__line" />
        <span className="edd-chrome__line" />
        {slot !== PLACEMENT_POSITIONS.THANK_YOU ? children : null}
      </div>
      <div className="edd-chrome__checkout-summary">
        <span className="edd-chrome__item" />
        <span className="edd-chrome__line edd-chrome__line--short" />
        {slot === PLACEMENT_POSITIONS.THANK_YOU ? children : null}
      </div>
    </div>
  );
}
