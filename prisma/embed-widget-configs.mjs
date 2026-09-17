/**
 * Legacy helper - prefer `npm run db:consolidate`.
 * Copies 1:1 widget config collections onto Widget documents.
 * Does not delete any collections.
 *
 * Run: node --env-file=.env prisma/embed-widget-configs.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIGS = [
  { collection: "ShippingRules", field: "shippingRules" },
  { collection: "MessageConfig", field: "messageConfig" },
  { collection: "IconConfig", field: "iconConfig" },
  { collection: "StyleConfig", field: "styleConfig" },
  { collection: "PlacementConfig", field: "placementConfig" },
  { collection: "CartConfig", field: "cartConfig" },
  { collection: "CheckoutConfig", field: "checkoutConfig" },
];

const SKIP = new Set(["_id", "id", "widgetId", "widget", "createdAt", "updatedAt"]);

function asId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.$oid) return value.$oid;
  return String(value);
}

function plain(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value !== "object") return value;
  if (value.$oid) return value.$oid;
  if (value.$date) {
    const inner = value.$date;
    if (typeof inner === "string") return inner;
    if (inner?.$numberLong) return new Date(Number(inner.$numberLong)).toISOString();
    return new Date(inner).toISOString();
  }
  if (value.$numberInt != null) return Number(value.$numberInt);
  if (value.$numberLong != null) return Number(value.$numberLong);
  if (value.$numberDouble != null) return Number(value.$numberDouble);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
}

function embedPayload(doc = {}) {
  return Object.fromEntries(
    Object.entries(plain(doc))
      .filter(([key, value]) => !SKIP.has(key) && value !== undefined)
      .map(([key, value]) => [key, value]),
  );
}

async function loadAll(collection) {
  let result = await prisma.$runCommandRaw({
    aggregate: collection,
    pipeline: [],
    cursor: { batchSize: 500 },
  });
  const docs = [...(result.cursor?.firstBatch || [])];
  let cursorId = result.cursor?.id;
  while (cursorId && cursorId !== "0" && cursorId !== 0) {
    result = await prisma.$runCommandRaw({
      getMore: typeof cursorId === "object" ? cursorId : cursorId,
      collection,
    });
    docs.push(...(result.cursor?.nextBatch || []));
    cursorId = result.cursor?.id;
  }
  return docs;
}

async function embedCollection(collection, field) {
  let docs = [];
  try {
    docs = await loadAll(collection);
  } catch (error) {
    console.warn(`Skipped ${collection}: ${error?.message || error}`);
    return { collection, field, source: 0, copied: 0, missing: 0 };
  }

  let copied = 0;
  let missing = 0;
  for (const doc of docs) {
    const widgetId = asId(doc.widgetId);
    const payload = embedPayload(doc);
    if (!widgetId || !Object.keys(payload).length) {
      missing += 1;
      continue;
    }
    const result = await prisma.$runCommandRaw({
      update: "Widget",
      updates: [
        {
          q: { _id: { $oid: widgetId } },
          u: { $set: { [field]: payload } },
        },
      ],
    });
    const matched = Number(result.n || result.nModified || 0);
    if (matched) copied += 1;
    else missing += 1;
  }

  return { collection, field, source: docs.length, copied, missing };
}

async function main() {
  console.warn("Prefer: npm run db:consolidate:apply (embeds + drops orphans).");
  const results = [];
  for (const item of CONFIGS) {
    results.push(await embedCollection(item.collection, item.field));
  }
  console.table(results);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
