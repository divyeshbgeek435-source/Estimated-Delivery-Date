import { DeliveryWidgetPreview } from "./DeliveryWidgetPreview";
import { PLACEMENT_POSITIONS, WIDGET_LOCATIONS } from "../../lib/constants";
import { normalizePosition } from "../../lib/widget-profiles";

const PREVIEW_PRODUCT = {
  name: "Vintage Folding Camera",
  vendor: "Northline",
  price: "$154.00",
  compare: "$189.00",
  image: "/preview/product-camera.png",
};  

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

function ProductPhoto({ compact = false, alt = PREVIEW_PRODUCT.name }) {
  return (
    <img
      className={`edd-chrome__photo${compact ? " edd-chrome__photo--compact" : ""}`}
      src={PREVIEW_PRODUCT.image}
      alt={compact ? "" : alt}
    />
  );
}

function ProductChrome({ slot, children }) {
  const above = slot === PLACEMENT_POSITIONS.ABOVE_ATC;
  const info = slot === PLACEMENT_POSITIONS.PRODUCT_INFO;

  return (
    <div className="edd-chrome edd-chrome--product edd-chrome--product-showcase">
      <div className="edd-chrome__media">
        <span className="edd-chrome__media-badge">In stock · ships in 24h</span>
        <ProductPhoto />
      </div>
      <div className="edd-chrome__copy">
        <p className="edd-chrome__vendor">{PREVIEW_PRODUCT.vendor}</p>
        <p className="edd-chrome__product-title">{PREVIEW_PRODUCT.name}</p>
        <p className="edd-chrome__rating">
          <span aria-hidden="true">★★★★★</span>
          <strong>4.9</strong>
          <span>86 reviews</span>
        </p>
        <p className="edd-chrome__product-price">
          <strong>{PREVIEW_PRODUCT.price}</strong>
          <s>{PREVIEW_PRODUCT.compare}</s>
        </p>
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
  const drawer = slot === PLACEMENT_POSITIONS.CART_DRAWER;
  const beforeCheckout =
    slot === PLACEMENT_POSITIONS.BEFORE_CHECKOUT || slot === PLACEMENT_POSITIONS.CART_PAGE;
  const afterItems = slot === PLACEMENT_POSITIONS.AFTER_ITEMS || drawer;
  const widget = <div className="edd-chrome__widget-slot">{children}</div>;

  if (drawer) {
    return (
      <div className="edd-chrome edd-chrome--cart edd-chrome--drawer">
        <div className="edd-chrome__cart-page-head">
          <h2 className="edd-chrome__cart-title">Cart</h2>
        </div>
        <CartLineItem />
        {widget}
        <div className="edd-chrome__cart-summary">
          <div className="edd-chrome__cart-estimate">
            <span>Estimated total</span>
            <strong>{PREVIEW_PRODUCT.price}</strong>
          </div>
          <button type="button" className="edd-chrome__atc edd-chrome__atc--cart" disabled>
            Check out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edd-chrome edd-chrome--cart edd-chrome--cart-page">
      <div className="edd-chrome__cart-page-head">
        <h2 className="edd-chrome__cart-title">Your cart</h2>
        <span className="edd-chrome__cart-continue">Continue shopping</span>
      </div>
      <div className="edd-chrome__cart-table">
        <div className="edd-chrome__cart-cols" aria-hidden="true">
          <span>Product</span>
          <span>Quantity</span>
          <span>Total</span>
        </div>
        <CartLineItem detailed />
        {afterItems ? widget : null}
      </div>
      <div className="edd-chrome__cart-summary">
        <div className="edd-chrome__cart-estimate">
          <span>Estimated total</span>
          <strong>{PREVIEW_PRODUCT.price}</strong>
        </div>
        <p className="edd-chrome__cart-tax">Taxes included. Discounts and shipping calculated at checkout.</p>
        {beforeCheckout ? widget : null}
        {!beforeCheckout && !afterItems ? widget : null}
        <button type="button" className="edd-chrome__atc edd-chrome__atc--cart" disabled>
          Check out
        </button>
      </div>
    </div>
  );
}

function CartLineItem({ detailed = false }) {
  return (
    <div className={`edd-chrome__cart-item${detailed ? " edd-chrome__cart-item--table" : ""}`}>
      <div className="edd-chrome__cart-product">
        <div className="edd-chrome__cart-thumb">
          <ProductPhoto compact />
        </div>
        <div className="edd-chrome__cart-copy">
          <strong>{PREVIEW_PRODUCT.name}</strong>
          <span>{PREVIEW_PRODUCT.price}</span>
        </div>
      </div>
      {detailed ? (
        <>
          <div className="edd-chrome__cart-qty-wrap">
            <div className="edd-chrome__qty edd-chrome__qty--cart" aria-hidden="true">
              <span>−</span>
              <strong>1</strong>
              <span>+</span>
            </div>
            <span className="edd-chrome__cart-remove" aria-hidden="true">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 5.5V4.2C7 3.5 7.6 3 8.3 3h3.4C12.4 3 13 3.5 13 4.2v1.3M4 5.5h12M8 9v5M12 9v5M6.2 5.5l.6 10c.1.7.6 1.2 1.3 1.2h3.8c.7 0 1.2-.5 1.3-1.2l.6-10" />
              </svg>
            </span>
          </div>
          <p className="edd-chrome__cart-line-total">{PREVIEW_PRODUCT.price}</p>
        </>
      ) : null}
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
        <div className="edd-chrome__cart-row">
          <div className="edd-chrome__cart-thumb">
            <ProductPhoto compact />
          </div>
          <div className="edd-chrome__cart-copy">
            <strong>{PREVIEW_PRODUCT.name}</strong>
            <span>{PREVIEW_PRODUCT.price}</span>
          </div>
        </div>
        <span className="edd-chrome__line edd-chrome__line--short" />
        {slot === PLACEMENT_POSITIONS.THANK_YOU ? children : null}
      </div>
    </div>
  );
}
