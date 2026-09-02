const PRODUCT_SEARCH_QUERY = `#graphql
  query DeliveryDateProductSearch($query: String!, $first: Int!, $after: String) {
    products(first: $first, query: $query, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        status
        featuredImage {
          url
          altText
        }
      }
    }
  }
`;

const COLLECTION_SEARCH_QUERY = `#graphql
  query DeliveryDateCollectionSearch($query: String!, $first: Int!, $after: String) {
    collections(first: $first, query: $query, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        image {
          url
          altText
        }
        productsCount {
          count
        }
      }
    }
  }
`;

const PRODUCT_COLLECTIONS_QUERY = `#graphql
  query DeliveryDateProductCollections($id: ID!, $first: Int!) {
    product(id: $id) {
      collections(first: $first) {
        nodes {
          id
        }
      }
    }
  }
`;

const COLLECTION_PRODUCT_QUERY = `#graphql
  query DeliveryDateCollectionProduct($id: ID!) {
    collection(id: $id) {
      products(first: 1) {
        nodes {
          handle
        }
      }
    }
  }
`;

function toGid(type, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("gid://")) return raw;
  const numeric = (raw.match(/(\d+)\s*$/) || [])[1];
  return numeric ? `gid://shopify/${type}/${numeric}` : raw;
}

async function graphqlJson(admin, query, variables) {
  const response = await admin.graphql(query, { variables });
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  return payload.data;
}

export async function searchProducts(admin, { q = "", cursor, first = 20 } = {}) {
  const query = q?.trim() ? `title:*${q.trim()}*` : "";
  const data = await graphqlJson(admin, PRODUCT_SEARCH_QUERY, {
    query,
    first,
    after: cursor || null,
  });

  return {
    nodes: (data.products?.nodes || []).map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      image: product.featuredImage?.url || null,
    })),
    pageInfo: data.products?.pageInfo || { hasNextPage: false, endCursor: null },
  };
}

export async function searchCollections(admin, { q = "", cursor, first = 20 } = {}) {
  const query = q?.trim() ? `title:*${q.trim()}*` : "";
  const data = await graphqlJson(admin, COLLECTION_SEARCH_QUERY, {
    query,
    first,
    after: cursor || null,
  });

  return {
    nodes: (data.collections?.nodes || []).map((collection) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      image: collection.image?.url || null,
      productsCount: collection.productsCount?.count ?? 0,
    })),
    pageInfo: data.collections?.pageInfo || { hasNextPage: false, endCursor: null },
  };
}

const MARKETS_QUERY = `#graphql
  query DeliveryDateMarkets($first: Int!) {
    markets(first: $first) {
      nodes {
        id
        name
        handle
        status
      }
    }
  }
`;

function isMarketsAccessDenied(error) {
  const message = String(error?.message || error || "");
  return /access denied/i.test(message) && /markets/i.test(message);
}

export async function getProductCollectionIds(admin, productId) {
  const id = toGid("Product", productId);
  if (!id) return [];
  try {
    const data = await graphqlJson(admin, PRODUCT_COLLECTIONS_QUERY, { id, first: 250 });
    return (data.product?.collections?.nodes || []).map((node) => node.id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getCollectionProductHandle(admin, collectionId) {
  const id = toGid("Collection", collectionId);
  if (!id) return "";
  try {
    const data = await graphqlJson(admin, COLLECTION_PRODUCT_QUERY, { id });
    return data.collection?.products?.nodes?.[0]?.handle || "";
  } catch {
    return "";
  }
}

export async function searchMarkets(admin, { q = "", first = 50 } = {}) {
  try {
    const data = await graphqlJson(admin, MARKETS_QUERY, { first });
    const nodes = (data.markets?.nodes || [])
      .filter((market) => market.status !== "DRAFT")
      .map((market) => ({
        id: market.id,
        title: market.name,
        handle: market.handle,
      }));
    const query = q.trim().toLowerCase();
    return {
      nodes: query
        ? nodes.filter(
            (market) =>
              market.title.toLowerCase().includes(query) ||
              String(market.handle || "").toLowerCase().includes(query),
          )
        : nodes,
    };
  } catch (error) {
    if (isMarketsAccessDenied(error)) return { nodes: [], needsScopes: true };
    return { nodes: [], error: "Markets could not be loaded. Try again." };
  }
}
