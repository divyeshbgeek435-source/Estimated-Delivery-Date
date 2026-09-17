/**
 * Consolidates legacy Mongo collections into Widget / WidgetEvent, then drops orphans.
 *
 * Safe to re-run. Default is dry-run (no drops).
 *
 *   node --env-file=.env prisma/consolidate-collections.mjs
 *   node --env-file=.env prisma/consolidate-collections.mjs --apply
 *   node --env-file=.env prisma/consolidate-collections.mjs --apply --drop
 *
 * Keeps: Session, Merchant, Widget, WidgetEvent, ProcessedWebhook
 * Drops after embed/migrate: ShippingRules, MessageConfig, IconConfig, StyleConfig,
 *   PlacementConfig, CartConfig, CheckoutConfig, DeliveryRequest
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const DROP = process.argv.includes("--drop");

const CONFIGS = [
  { collection: "ShippingRules", field: "shippingRules" },
  { collection: "MessageConfig", field: "messageConfig" },
  { collection: "IconConfig", field: "iconConfig" },
  { collection: "StyleConfig", field: "styleConfig" },
  { collection: "PlacementConfig", field: "placementConfig" },
  { collection: "CartConfig", field: "cartConfig" },
  { collection: "CheckoutConfig", field: "checkoutConfig" },
];

const ORPHAN_COLLECTIONS = [...CONFIGS.map((item) => item.collection), "DeliveryRequest"];
const KEEP = new Set(["Session", "Merchant", "Widget", "WidgetEvent", "ProcessedWebhook"]);
const SKIP_FIELDS = new Set(["_id", "id", "widgetId", "widget", "createdAt", "updatedAt"]);

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
      .filter(([key, value]) => !SKIP_FIELDS.has(key) && value !== undefined)
      .map(([key, value]) => [key, value]),
  );
}

async function listCollections() {
  const result = await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true });
  return (result.cursor?.firstBatch || []).map((item) => item.name).filter(Boolean).sort();
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

async function collectionExists(name, names) {
  return names.includes(name);
}

async function embedCollection(collection, field, names) {
  if (!(await collectionExists(collection, names))) {
    return { collection, field, source: 0, copied: 0, missing: 0, skipped: true };
  }
  const docs = await loadAll(collection);
  let copied = 0;
  let missing = 0;
  for (const doc of docs) {
    const widgetId = asId(doc.widgetId);
    const payload = embedPayload(doc);
    if (!widgetId || !Object.keys(payload).length) {
      missing += 1;
      continue;
    }
    if (!APPLY) {
      copied += 1;
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
  return { collection, field, source: docs.length, copied, missing, skipped: false };
}

async function migrateDeliveryRequests(names) {
  if (!(await collectionExists("DeliveryRequest", names))) {
    return { source: 0, migrated: 0, skipped: true };
  }
  const rows = await loadAll("DeliveryRequest");
  const widgetIds = [...new Set(rows.map((doc) => asId(doc.widgetId)).filter(Boolean))];
  const existingWidgets = widgetIds.length
    ? await prisma.widget.findMany({ where: { id: { in: widgetIds } }, select: { id: true } })
    : [];
  const existingIds = new Set(existingWidgets.map((widget) => widget.id));
  let migrated = 0;
  for (const doc of rows) {
    const widgetId = asId(doc.widgetId);
    const merchantId = asId(doc.merchantId);
    const sourceId = asId(doc._id);
    if (!widgetId || !merchantId || !sourceId || !existingIds.has(widgetId)) continue;
    if (!APPLY) {
      migrated += 1;
      continue;
    }
    const createdAt = doc.createdAt ? new Date(plain(doc.createdAt)) : new Date();
    try {
      await prisma.widgetEvent.create({
        data: {
          widgetId,
          merchantId,
          kind: "REQUEST",
          type: "DELIVERY_REQUEST",
          status: doc.status || "PENDING",
          pincode: doc.pincode || "",
          country: doc.country || "IN",
          city: doc.city || "",
          state: doc.state || "",
          productId: doc.productId ? asId(doc.productId) : null,
          productTitle: doc.productTitle || null,
          eventKey: `request:${sourceId}`,
          timestamp: createdAt,
          createdAt,
        },
      });
      migrated += 1;
    } catch {
      // Duplicate eventKey or already migrated.
      migrated += 1;
    }
  }
  return { source: rows.length, migrated, skipped: false };
}

async function verifyWidgetsHaveConfigs() {
  const widgets = await prisma.widget.findMany({
    select: {
      id: true,
      shippingRules: true,
      messageConfig: true,
      iconConfig: true,
      styleConfig: true,
      placementConfig: true,
    },
  });
  const missing = widgets.filter(
    (widget) =>
      !widget.shippingRules ||
      !widget.messageConfig ||
      !widget.iconConfig ||
      !widget.styleConfig ||
      !widget.placementConfig,
  );
  return { total: widgets.length, incomplete: missing.length, sample: missing.slice(0, 5).map((w) => w.id) };
}

async function dropOrphans(names) {
  const dropped = [];
  const kept = [];
  for (const name of names) {
    if (KEEP.has(name)) {
      kept.push(name);
      continue;
    }
    if (!ORPHAN_COLLECTIONS.includes(name)) {
      kept.push(`${name} (unknown - not dropped)`);
      continue;
    }
    if (!APPLY || !DROP) {
      dropped.push(`${name} (pending)`);
      continue;
    }
    await prisma.$runCommandRaw({ drop: name });
    dropped.push(name);
  }
  return { dropped, kept };
}

async function main() {
  console.log(`Mode: ${APPLY ? (DROP ? "apply + drop" : "apply (no drop)") : "dry-run"}`);
  const before = await listCollections();
  console.log("\nCollections before:");
  console.log(before.map((name) => `  - ${name}`).join("\n") || "  (none)");

  const embedResults = [];
  for (const item of CONFIGS) {
    embedResults.push(await embedCollection(item.collection, item.field, before));
  }
  console.log("\nEmbed config collections → Widget:");
  console.table(embedResults);

  const delivery = await migrateDeliveryRequests(before);
  console.log("\nDeliveryRequest → WidgetEvent:");
  console.log(delivery);

  const verify = await verifyWidgetsHaveConfigs();
  console.log("\nWidget embed coverage:");
  console.log(verify);

  if (verify.incomplete > 0 && DROP) {
    console.warn("\nRefusing to drop orphans: some Widget docs are missing embedded configs.");
    console.warn("Re-run with --apply (no --drop), fix incomplete widgets, then drop.");
    return;
  }

  const dropResult = await dropOrphans(before);
  console.log("\nOrphan cleanup:");
  console.log(dropResult);

  if (APPLY && DROP) {
    const after = await listCollections();
    console.log("\nCollections after:");
    console.log(after.map((name) => `  - ${name}`).join("\n") || "  (none)");
  } else if (!DROP) {
    console.log("\nTip: re-run with --apply --drop to remove orphan collections after a successful embed.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
