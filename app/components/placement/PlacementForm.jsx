import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { PLACEMENT_MODES } from "../../lib/constants";

export function PlacementForm({ placement, onChange, errors = {} }) {
  return (
    <s-stack gap="large">
      <s-section heading="Apply to">
        <input type="hidden" name="mode" value={placement.mode} />
        <s-choice-list
          label="Apply to"
          name="modeField"
          onChange={(event) =>
            onChange({
              ...placement,
              mode: event.currentTarget.values?.[0] || event.currentTarget.value,
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
        </s-choice-list>
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
        <ResourceSearch
          kind="collections"
          selected={placement.collections || []}
          onSelected={(collections) =>
            onChange({
              ...placement,
              collections,
              collectionIds: collections.map((item) => item.id),
            })
          }
        />
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
  const endpoint = kind === "products" ? "/api/products/search" : "/api/collections/search";

  useEffect(() => {
    const handle = setTimeout(() => {
      fetcher.load(`${endpoint}?q=${encodeURIComponent(query)}`);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, endpoint]);

  const results = fetcher.data?.nodes || [];
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  const toggle = (item) => {
    if (selectedIds.has(item.id)) {
      onSelected(selected.filter((current) => current.id !== item.id));
      return;
    }
    onSelected([...selected, item]);
  };

  return (
    <s-section heading={kind === "products" ? "Search products" : "Search collections"}>
      <s-search-field
        label={kind === "products" ? "Search products" : "Search collections"}
        name={`${kind}Query`}
        value={query}
        placeholder="Search by name"
        labelAccessibilityVisibility="exclusive"
        onInput={(event) => setQuery(event.currentTarget.value)}
      ></s-search-field>
      {fetcher.state === "loading" ? (
        <s-spinner accessibilityLabel="Searching"></s-spinner>
      ) : null}
      {fetcher.data?.error ? (
        <s-banner tone="critical">{fetcher.data.error}</s-banner>
      ) : null}
      <s-stack gap="small-200">
        {results.map((item) => (
          <div key={item.id} className="edd-selected-row">
            <s-stack direction="inline" gap="small" alignItems="center">
              {item.image ? (
                <s-thumbnail src={item.image} alt={item.title} size="small"></s-thumbnail>
              ) : (
                <s-icon type={kind === "products" ? "product" : "collection"}></s-icon>
              )}
              <s-stack gap="none">
                <s-text>{item.title}</s-text>
                {item.status ? (
                  <s-badge tone={item.status === "ACTIVE" ? "success" : "neutral"}>
                    {item.status}
                  </s-badge>
                ) : null}
                {typeof item.productsCount === "number" ? (
                  <s-text color="subdued">{item.productsCount} products</s-text>
                ) : null}
              </s-stack>
            </s-stack>
            <s-button
              type="button"
              variant={selectedIds.has(item.id) ? "secondary" : "primary"}
              onClick={() => toggle(item)}
            >
              {selectedIds.has(item.id) ? "Remove" : "Select"}
            </s-button>
          </div>
        ))}
      </s-stack>
      {selected.length ? (
        <s-section heading="Selected">
          {selected.map((item) => (
            <div key={item.id} className="edd-selected-row">
              <s-text>{item.title}</s-text>
              <s-button type="button" tone="critical" variant="tertiary" onClick={() => toggle(item)}>
                Remove
              </s-button>
            </div>
          ))}
        </s-section>
      ) : null}
    </s-section>
  );
}
