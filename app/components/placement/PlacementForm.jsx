import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { PLACEMENT_MODES } from "../../lib/constants";
import { describePlacement, findLivePlacementConflicts } from "../../lib/widget-conflicts";
import { HostChoiceList } from "../common/ActionButton";

function selectedChoice(event) {
  const values = event.currentTarget.values;
  if (typeof values === "string" && values) return values;
  if (Array.isArray(values) && values[0]) return String(values[0]);
  if (values && typeof values.length === "number" && values.length) return String(values[0]);
  return String(event.currentTarget.value || "");
}

export function PlacementForm({ placement, onChange, errors = {}, liveProductWidgets = [] }) {
  const conflicts = useMemo(
    () =>
      findLivePlacementConflicts(
        { id: "draft", location: "PRODUCT", placementConfig: placement },
        liveProductWidgets,
      ),
    [placement, liveProductWidgets],
  );
  const conflictNames = conflicts.map((item) => item.name).filter(Boolean);
  const described = describePlacement(placement);

  return (
    <s-stack gap="large">
      <s-section heading="Apply to">
        <s-paragraph color="subdued">Choose which products this widget is shown on.</s-paragraph>
        <input type="hidden" name="mode" value={placement.mode} />
        <HostChoiceList
          label="Apply to"
          name="modeField"
          labelAccessibilityVisibility="exclusive"
          values={[placement.mode || PLACEMENT_MODES.ALL_PRODUCTS]}
          onChange={(event) =>
            onChange({
              ...placement,
              mode: selectedChoice(event) || placement.mode,
            })
          }
        >
          <s-choice value={PLACEMENT_MODES.COLLECTIONS} selected={placement.mode === PLACEMENT_MODES.COLLECTIONS}>
            Collections
          </s-choice>
          <s-choice value={PLACEMENT_MODES.ALL_PRODUCTS} selected={placement.mode === PLACEMENT_MODES.ALL_PRODUCTS}>
            All products
          </s-choice>
          <s-choice value={PLACEMENT_MODES.PRODUCTS} selected={placement.mode === PLACEMENT_MODES.PRODUCTS}>
            Specific Products
          </s-choice>
        </HostChoiceList>
        {conflicts.length ? (
          <s-banner tone="warning" heading="Placement already in use">
            {described.mode === PLACEMENT_MODES.ALL_PRODUCTS
              ? `All products can only have one live widget. Another live widget already covers all products (${conflictNames.join(", ") || "live widget"}).`
              : described.mode === PLACEMENT_MODES.COLLECTIONS
                ? `The same collection cannot be live on two widgets. This selection overlaps (${conflictNames.join(", ") || "live widget"}). Other collections can still be used on a different widget.`
                : `The same product cannot be live on two widgets. This selection overlaps (${conflictNames.join(", ") || "live widget"}). Other products can still be used on a different widget.`}
          </s-banner>
        ) : null}
        {placement.mode === PLACEMENT_MODES.COLLECTIONS && !(placement.collections || []).length ? (
          <s-banner tone="warning">
            Select at least one collection. Until then, this widget stays hidden on the storefront - it will not fall back to all products.
          </s-banner>
        ) : null}
        {placement.mode === PLACEMENT_MODES.PRODUCTS && !(placement.products || []).length ? (
          <s-banner tone="warning">
            Select at least one product. Until then, this widget stays hidden on the storefront - it will not fall back to all products.
          </s-banner>
        ) : null}
      </s-section>

      {placement.mode === PLACEMENT_MODES.PRODUCTS ? (
        <ResourceSearch
          kind="products"
          selected={placement.products || []}
          onSelected={(products) =>
            onChange({
              ...placement,
              products,
              productIds: products.map((item) => item.id),
            })
          }
        />
      ) : null}

      {placement.mode === PLACEMENT_MODES.COLLECTIONS ? (
        <s-stack gap="small-200">
          <s-paragraph color="subdued">
            The widget appears on products in the collections you select, and on those collection pages.
          </s-paragraph>
          <ResourceSearch
            kind="collections"
            selected={placement.collections || []}
            onSelected={(collections) =>
              onChange({
                ...placement,
                collections,
                collectionIds: collections.map((item) => item.id).filter(Boolean),
              })
            }
          />
        </s-stack>
      ) : null}

      <input type="hidden" name="productIds" value={JSON.stringify(placement.productIds || [])} />
      <input type="hidden" name="collectionIds" value={JSON.stringify(placement.collectionIds || [])} />
      <input type="hidden" name="products" value={JSON.stringify(placement.products || [])} />
      <input type="hidden" name="collections" value={JSON.stringify(placement.collections || [])} />
      {errors.mode ? <s-banner tone="critical">{errors.mode}</s-banner> : null}
    </s-stack>
  );
}

function ResourceSearch({ kind, selected, onSelected }) {
  const fetcher = useFetcher();
  const [query, setQuery] = useState("");
  const isProducts = kind === "products";
  const endpoint = isProducts ? "/api/products/search" : "/api/collections/search";
  const heading = isProducts ? "Search products" : "Search collections";
  const noun = isProducts ? "products" : "collections";

  useEffect(() => {
    const handle = setTimeout(() => {
      fetcher.load(`${endpoint}?q=${encodeURIComponent(query)}`);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, endpoint]);

  const results = fetcher.data?.nodes || [];
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);
  const searching = query.trim().length > 0;
  const rows = useMemo(() => {
    if (searching) return results;
    const byId = new Map(results.map((item) => [item.id, item]));
    const extras = selected.filter((item) => !byId.has(item.id));
    return [...extras, ...results];
  }, [results, selected, searching]);

  const toggle = (item) => {
    if (selectedIds.has(item.id)) {
      onSelected(selected.filter((current) => current.id !== item.id));
      return;
    }
    onSelected([...selected, item]);
  };

  const allVisibleSelected = rows.length > 0 && rows.every((item) => selectedIds.has(item.id));
  const someVisibleSelected = rows.some((item) => selectedIds.has(item.id));
  const allRef = useRef(null);

  useEffect(() => {
    if (!allRef.current) return;
    allRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected, rows.length]);

  const toggleAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(rows.map((item) => item.id));
      onSelected(selected.filter((item) => !visibleIds.has(item.id)));
      return;
    }
    const next = new Map(selected.map((item) => [item.id, item]));
    rows.forEach((item) => next.set(item.id, item));
    onSelected([...next.values()]);
  };

  const loading = fetcher.state !== "idle" && !rows.length;
  const refreshing = fetcher.state !== "idle" && rows.length > 0;

  return (
    <s-section heading={heading}>
      <div className="edd-resource-picker">
        <s-search-field
          label={heading}
          name={`${kind}Query`}
          value={query}
          placeholder="Search by name"
          labelAccessibilityVisibility="exclusive"
          onInput={(event) => setQuery(event.currentTarget.value)}
        ></s-search-field>
        {fetcher.data?.error ? <s-banner tone="critical">{fetcher.data.error}</s-banner> : null}
        <div className="edd-resource-list" role="group" aria-label={heading} aria-busy={loading || refreshing}>
          {rows.length > 0 && !loading ? (
            <label
              className={`edd-resource-row edd-resource-row--all${allVisibleSelected ? " is-selected" : ""}`}
            >
              <input
                ref={allRef}
                type="checkbox"
                checked={allVisibleSelected}
                aria-label={searching ? `Select all matching ${noun}` : `Select all ${noun}`}
                onChange={toggleAll}
              />
              <span className="edd-resource-row__name">All selected</span>
              <span className="edd-resource-row__count">
                {refreshing ? "Updating…" : selected.length ? `${selected.length} selected` : "None selected"}
              </span>
            </label>
          ) : (
            <div className="edd-resource-list__toolbar">
              <span>{searching ? "Search results" : `Available ${noun}`}</span>
              <span>{refreshing ? "Updating…" : "None selected"}</span>
            </div>
          )}
          {loading ? (
            <div className="edd-resource-empty">
              <s-spinner accessibilityLabel={`Searching ${noun}`}></s-spinner>
            </div>
          ) : rows.length ? (
            rows.map((item) => {
              const checked = selectedIds.has(item.id);
              const meta =
                typeof item.productsCount === "number"
                  ? `${item.productsCount} product${item.productsCount === 1 ? "" : "s"}`
                  : item.status
                    ? item.status === "ACTIVE"
                      ? "Active"
                      : item.status
                    : "";
              return (
                <label
                  key={item.id}
                  className={`edd-resource-row${checked ? " is-selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={`Select ${item.title}`}
                    onChange={() => toggle(item)}
                  />
                  {item.image ? (
                    <img className="edd-resource-row__thumb" src={item.image} alt="" />
                  ) : (
                    <span className="edd-resource-row__icon" aria-hidden="true">
                      <s-icon type={isProducts ? "product" : "catalog"}></s-icon>
                    </span>
                  )}
                  <span className="edd-resource-row__copy">
                    <span className="edd-resource-row__name">{item.title}</span>
                    {meta ? <span className="edd-resource-row__meta">{meta}</span> : null}
                  </span>
                </label>
              );
            })
          ) : (
            <div className="edd-resource-empty">
              {searching ? `No ${noun} match “${query.trim()}”.` : `No ${noun} available.`}
            </div>
          )}
        </div>
        {selected.length ? (
          <div className="edd-resource-selected">
            <div className="edd-resource-selected__head">
              <s-text type="strong">Selected {noun}</s-text>
              <s-text color="subdued">{selected.length}</s-text>
            </div>
            <div className="edd-chip-row">
              {selected.map((item) => (
                <div key={item.id} className="edd-chip">
                  <span>{item.title}</span>
                  <button type="button" aria-label={`Remove ${item.title}`} onClick={() => toggle(item)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </s-section>
  );
}
