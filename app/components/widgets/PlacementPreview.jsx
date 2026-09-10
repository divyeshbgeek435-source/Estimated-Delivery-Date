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

export function LiveWidgetPreview({ location, position, cartDisplayMode, ...previewProps }) {
  const isCheckout = location === WIDGET_LOCATIONS.CHECKOUT;
  return (
    <PlacementPreview location={location} position={position}>
      {isCheckout ? (
        <div className="edd-checkout-banner">
          <p className="edd-checkout-banner__heading">{previewProps.heading || "Estimated Delivery"}</p>
          <DeliveryWidgetPreview
            {...previewProps}
            location={location}
            cartDisplayMode={cartDisplayMode}
            heading=""
            layout="MINIMAL"
            design="COMPACT"
            showDescription
          />
        </div>
      ) : (
        <DeliveryWidgetPreview {...previewProps} location={location} cartDisplayMode={cartDisplayMode} />
      )}
    </PlacementPreview>
  );
}

function ProductChrome({ slot, children }) {
  const above = slot === PLACEMENT_POSITIONS.ABOVE_ATC;
  const info = slot === PLACEMENT_POSITIONS.PRODUCT_INFO;
  return (
    <div className="edd-chrome edd-chrome--product edd-chrome--product-showcase">
      <div className="edd-chrome__media" aria-hidden="true">
        <div className="edd-chrome__hero">
          <div className="edd-chrome__hero-scene">
            <span className="edd-chrome__hero-sofa" />
            <span className="edd-chrome__hero-table" />
            <span className="edd-chrome__hero-frame">
              <em>Estimated Delivery Date</em>
              <strong>ETA</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="edd-chrome__copy">
        <p className="edd-chrome__product-title">Animated ETA Template</p>
        <p className="edd-chrome__product-price">$0.00</p>
        {info || above ? <div className="edd-chrome__widget-slot">{children}</div> : null}
        <div className="edd-chrome__buy-row">
          <div className="edd-chrome__qty" aria-hidden="true">
            <span>−</span>
            <strong>1</strong>
            <span>+</span>
          </div>
          <button type="button" className="edd-chrome__atc edd-chrome__atc--showcase" disabled>
            Add to cart
          </button>
          <button type="button" className="edd-chrome__wish" disabled aria-label="Wishlist" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M10 16.2s-5.2-3.1-7-6.1C1.8 8.2 2.5 5.5 5 4.7c1.6-.5 3.2.2 4 1.5.8-1.3 2.4-2 4-1.5 2.5.8 3.2 3.5 2 5.4-1.8 3-7 6.1-7 6.1Z" />
            </svg>
          </button>
        </div>
        {info || above ? null : <div className="edd-chrome__widget-slot">{children}</div>}
      </div>
    </div>
  );
}

function CartChrome({ slot, children }) {
  const beforeCheckout =
    slot === PLACEMENT_POSITIONS.BEFORE_CHECKOUT || slot === PLACEMENT_POSITIONS.CART_PAGE;
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
