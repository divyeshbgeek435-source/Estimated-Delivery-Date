import prisma, { hasDeliveryRequestModel, hasWidgetEventKind } from "../../lib/prisma.server";
import { ACTIVITY_KINDS } from "../../lib/constants";
import { normalizePincode, normalizePincodeRules } from "../../lib/pincode";
import { lookupPostalCode } from "../../lib/pincode.server";
import { getWidgetForMerchant } from "./widget.server";

export const REQUEST_STATUSES = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
};

const REQUEST_TYPE = "DELIVERY_REQUEST";
const LEGACY_COLLECTION = "DeliveryRequest";

function asId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.$oid) return value.$oid;
  return String(value);
}

function asDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value.$date) {
    const inner = value.$date;
    if (typeof inner === "string") return inner;
    if (inner?.$numberLong) return new Date(Number(inner.$numberLong)).toISOString();
    return new Date(inner).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function requests() {
  return hasDeliveryRequestModel() ? prisma.deliveryRequest : prisma.widgetEvent;
}

function requestWhere(extra = {}) {
  if (hasWidgetEventKind()) {
    return { kind: ACTIVITY_KINDS.REQUEST, type: REQUEST_TYPE, ...extra };
  }
  return extra;
}

export function serializeDeliveryRequest(row) {
  return {
    id: asId(row.id || row._id),
    widgetId: asId(row.widgetId),
    widgetName: row.widget?.name || row.widgetName || "",
    widgetLocation: row.widget?.location || row.widgetLocation || "",
    pincode: row.pincode,
    country: row.country || "IN",
    city: row.city || "",
    state: row.state || "",
    productTitle: row.productTitle || "",
    status: row.status || REQUEST_STATUSES.PENDING,
    createdAt: asDate(row.createdAt || row.timestamp),
  };
}

let migrated = false;

export async function migrateLegacyDeliveryRequests() {
  if (migrated || hasDeliveryRequestModel() || !hasWidgetEventKind()) {
    migrated = true;
    return;
  }
  migrated = true;
  try {
    const result = await prisma.$runCommandRaw({
      find: LEGACY_COLLECTION,
      filter: {},
      limit: 5000,
    });
    const rows = result?.cursor?.firstBatch || [];
    await Promise.all(
      rows.map(async (doc) => {
        const widgetId = asId(doc.widgetId);
        const merchantId = asId(doc.merchantId);
        const sourceId = asId(doc._id);
        if (!widgetId || !merchantId || !sourceId) return;
        const createdAt = doc.createdAt ? new Date(asDate(doc.createdAt)) : new Date();
        await prisma.widgetEvent
          .create({
            data: {
              widgetId,
              merchantId,
              kind: ACTIVITY_KINDS.REQUEST,
              type: REQUEST_TYPE,
              status: doc.status || REQUEST_STATUSES.PENDING,
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
          })
          .catch(() => {});
      }),
    );
  } catch {
    migrated = true;
  }
}

export async function listDeliveryRequests(merchantId, widgetId) {
  if (!merchantId || !widgetId) return [];
  await migrateLegacyDeliveryRequests();
  const rows = await requests().findMany({
    where: requestWhere({ merchantId, widgetId }),
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(serializeDeliveryRequest);
}

export async function listMerchantDeliveryRequests(merchantId) {
  if (!merchantId) return [];
  await migrateLegacyDeliveryRequests();
  const rows = await requests().findMany({
    where: requestWhere({ merchantId }),
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { widget: { select: { id: true, name: true, location: true } } },
  });
  return rows.map(serializeDeliveryRequest);
}

export async function countPendingDeliveryRequests(merchantId) {
  if (!merchantId) return 0;
  await migrateLegacyDeliveryRequests();
  return requests().count({
    where: requestWhere({ merchantId, status: REQUEST_STATUSES.PENDING }),
  });
}

export async function createDeliveryRequest({
  merchantId,
  widgetId,
  pincode,
  country,
  productId,
  productTitle,
}) {
  const code = normalizePincode(pincode);
  if (!merchantId || !widgetId || !code) {
    throw new Error("A widget, merchant, and pincode are required.");
  }

  await migrateLegacyDeliveryRequests();

  const payload = {
    merchantId,
    widgetId,
    pincode: code,
    country: String(country || "IN").toUpperCase(),
    city: "",
    state: "",
    productId: productId || null,
    productTitle: String(productTitle || "").trim().slice(0, 120) || null,
    status: REQUEST_STATUSES.PENDING,
    ...(hasWidgetEventKind()
      ? { kind: ACTIVITY_KINDS.REQUEST, type: REQUEST_TYPE }
      : {}),
  };

  const fillPlace = (row) => {
    lookupPostalCode(country || "IN", code)
      .then(async (place) => {
        if (!place?.ok || !row?.id) return;
        await requests()
          .update({
            where: { id: String(row.id) },
            data: {
              country: String(place.country || payload.country).toUpperCase(),
              city: place.city || "",
              state: place.state || "",
            },
          })
          .catch(() => {});
      })
      .catch(() => {});
  };

  const existing = await requests().findFirst({
    where: requestWhere({
      merchantId,
      widgetId,
      pincode: code,
      status: REQUEST_STATUSES.PENDING,
    }),
  });
  if (existing) {
    const row = serializeDeliveryRequest(existing);
    if (!row.city) fillPlace(row);
    return row;
  }

  const created = await requests().create({ data: payload });
  const row = serializeDeliveryRequest(created);
  fillPlace(row);
  return row;
}

export async function setDeliveryRequestStatus(merchantId, widgetId, requestId, status) {
  const request = await requests().findFirst({
    where: requestWhere({ id: requestId, merchantId, widgetId }),
  });
  if (!request) return null;

  if (status === REQUEST_STATUSES.ACCEPTED && request.status !== REQUEST_STATUSES.ACCEPTED) {
    const widget = await prisma.widget.findFirst({
      where: { id: widgetId, merchantId },
    });
    if (widget?.shippingRules) {
      const rules = normalizePincodeRules(widget.shippingRules.pincodeRules || {}, widget.shippingRules);
      const already = rules.pincodes.some((entry) => normalizePincode(entry.code) === request.pincode);
      if (!already) {
        rules.enabled = true;
        rules.pincodes = [
          ...rules.pincodes,
          {
            code: request.pincode,
            minDays: widget.shippingRules.transitMinDays || 1,
            maxDays: widget.shippingRules.transitMaxDays || 2,
            label: [request.city, request.state].filter(Boolean).join(", "),
            city: request.city || "",
            state: request.state || "",
            weight: "",
            unit: "kg",
          },
        ];
        await prisma.widget.update({
          where: { id: widgetId },
          data: {
            shippingRules: {
              set: {
                ...widget.shippingRules,
                pincodeRules: rules,
              },
            },
          },
        });
      }
    }
  }

  await requests().update({
    where: { id: requestId },
    data: { status },
  });

  return getWidgetForMerchant(merchantId, widgetId);
}
