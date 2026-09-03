import { z } from "zod";
import {
  matchedUpdateCount,
  normalizePlacementForSave,
  placementWasPersisted,
} from "./placement.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(name, fn) {
  fn();
  console.log(`ok ${name}`);
}

const placementSchema = z.object({
  mode: z.enum(["ALL_PRODUCTS", "COLLECTIONS", "PRODUCTS"], {
    errorMap: () => ({ message: "Choose where this widget should appear" }),
  }),
  productIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  products: z.array(z.object({ id: z.string() })).default([]),
  collections: z.array(z.object({ id: z.string() })).default([]),
  position: z.string().optional(),
});

run("does not silently coerce missing mode to All products", () => {
  const parsed = placementSchema.safeParse({ productIds: [], collectionIds: [] });
  assert(!parsed.success, "missing mode should fail validation");
  assert(
    !placementSchema.safeParse({ mode: "" }).success,
    "empty mode should fail validation",
  );
});

run("preserves Collections and Products modes", () => {
  assert(placementSchema.safeParse({ mode: "COLLECTIONS", collections: [] }).success);
  assert(placementSchema.safeParse({ mode: "PRODUCTS", products: [] }).success);
  assert(placementSchema.safeParse({ mode: "ALL_PRODUCTS" }).success);
});

run("normalize keeps selected mode instead of defaulting", () => {
  const collections = normalizePlacementForSave(
    { mode: "COLLECTIONS", collections: [{ id: "gid://shopify/Collection/1" }] },
    { mode: "ALL_PRODUCTS" },
  );
  assert(collections.mode === "COLLECTIONS", "collections mode should be kept");
  assert(collections.collectionIds.includes("gid://shopify/Collection/1"));

  const products = normalizePlacementForSave(
    { mode: "PRODUCTS", products: [{ id: "gid://shopify/Product/2" }] },
    { mode: "COLLECTIONS" },
  );
  assert(products.mode === "PRODUCTS", "products mode should replace collections");
});

run("persistence check requires the saved mode to match", () => {
  const expected = normalizePlacementForSave({
    mode: "COLLECTIONS",
    collections: [{ id: "gid://shopify/Collection/1" }],
  });
  assert(
    !placementWasPersisted({ mode: "ALL_PRODUCTS" }, expected),
    "All products must not count as a collections save",
  );
  assert(
    placementWasPersisted(
      { mode: "COLLECTIONS", collectionIds: ["gid://shopify/Collection/1"], collections: [{ id: "gid://shopify/Collection/1" }] },
      expected,
    ),
    "matching collections placement should count as persisted",
  );
  assert(
    placementWasPersisted(
      { mode: "PRODUCTS", productIds: ["2"], products: [{ id: "gid://shopify/Product/2" }] },
      normalizePlacementForSave({ mode: "PRODUCTS", products: [{ id: "gid://shopify/Product/2" }] }),
    ),
    "numeric and GID product ids should match",
  );
});

run("mongo update counts treat zero matches as a failed write", () => {
  assert(matchedUpdateCount({ ok: 1, n: 0 }) === 0);
  assert(matchedUpdateCount({ ok: 1, n: 1 }) === 1);
  assert(matchedUpdateCount({ n: { low: 1 } }) === 1);
});

console.log("All placement tests passed.");
