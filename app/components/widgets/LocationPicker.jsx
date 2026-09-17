import { Form, useNavigation } from "react-router";
import { WIDGET_LOCATIONS } from "../../lib/constants";

const OPTIONS = [
  {
    value: WIDGET_LOCATIONS.PRODUCT,
    title: "Product page",
    description: 'Block on the product page below or above the “Add to Cart” button.',
    sketch: "product",
  },
  {
    value: WIDGET_LOCATIONS.CART,
    title: "Cart page",
    // badge: "Beta",
    description: "Add an app block to cart page or cart drawer.",
    sketch: "cart",
  },
];

export function LocationPicker() {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <div className="edd-placement-grid">
      {OPTIONS.map((option) => (
        <Form method="post" key={option.value} className="edd-placement-card">
          <input type="hidden" name="location" value={option.value} />
          <PlacementSketch type={option.sketch} />
          <div className="edd-placement-card__body">
            <h3>
              {option.title}
              {option.badge ? <span className="edd-beta">{option.badge}</span> : null}
            </h3>
            <p>{option.description}</p>
            <button type="submit" className="edd-btn edd-btn--secondary" disabled={busy}>
              {busy ? "Creating…" : "Select this placement type"}
            </button>
          </div>
        </Form>
      ))}
    </div>
  );
}

function PlacementSketch({ type }) {
  return (
    <div className={`edd-sketch edd-sketch--${type}`} aria-hidden="true">
      {type === "product" ? (
        <>
          <div className="edd-sketch__hero" />
          <div className="edd-sketch__col">
            <span />
            <span />
            <span className="edd-sketch__widget" />
          </div>
          <div className="edd-sketch__thumbs">
            <i />
            <i />
            <i />
            <i />
          </div>
        </>
      ) : null}
      {type === "cart" ? (
        <>
          <div className="edd-sketch__wide" />
          <div className="edd-sketch__side">
            <span />
            <span />
            <span className="edd-sketch__widget" />
          </div>
        </>
      ) : null}
    </div>
  );
}
