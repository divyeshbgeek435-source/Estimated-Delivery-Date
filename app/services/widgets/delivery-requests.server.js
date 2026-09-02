import prisma from "../../lib/prisma.server";
import { normalizePincode, normalizePincodeRules } from "../../lib/pincode";
import { lookupPostalCode } from "../../lib/pincode.server";
import { getWidgetForMerchant } from "./widget.server";

export const REQUEST_STATUSES = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
};

const COLLECTION = "DeliveryRequest";

function canUseModel() {
  return typeof prisma.deliveryRequest?.findMany === "function";
}

function oid(id) {
  return { $oid: String(id) };
}

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

function fromRaw(doc = {}) {
  const widget = Array.isArray(doc.widget) ? doc.widget[0] : doc.widget;
  return serializeDeliveryRequest({
    id: asId(doc._id || doc.id),
    widgetId: asId(doc.widgetId),
    widget: widget
      ? { id: asId(widget._id || widget.id), name: widget.name, location: widget.location }
      : undefined,
    pincode: doc.pincode,
    country: doc.country,
    city: doc.city,
    state: doc.state,
    productTitle: doc.productTitle,
    status: doc.status,
    createdAt: asDate(doc.createdAt),
  });
}

async function rawFind(filter, { limit = 200, withWidget = false } = {}) {
  const command = withWidget
    ? {
        aggregate: COLLECTION,
        pipeline: [
          { $match: filter },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: "Widget",
              localField: "widgetId",
              foreignField: "_id",
              as: "widget",
            },
          },
          { $unwind: { path: "$widget", preserveNullAndEmptyArrays: true } },
        ],
        cursor: {},
      }
    : {
        find: COLLECTION,
        filter,
        sort: { createdAt: -1 },
        limit,
      };
  const result = await prisma.$runCommandRaw(command);
  return result?.cursor?.firstBatch || [];
}

export async function listDeliveryRequests(merchantId, widgetId) {
  if (!merchantId || !widgetId) return [];
  if (canUseModel()) {
    const rows = await prisma.deliveryRequest.findMany({
      where: { merchantId, widgetId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(serializeDeliveryRequest);
  }
  const rows = await rawFind({ merchantId: oid(merchantId), widgetId: oid(widgetId) }, { limit: 100 });
  return rows.map(fromRaw);
}

export async function listMerchantDeliveryRequests(merchantId) {
  if (!merchantId) return [];
  try {
    if (canUseModel()) {
      const rows = await prisma.deliveryRequest.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { widget: { select: { id: true, name: true, location: true } } },
      });
      return rows.map(serializeDeliveryRequest);
    }
  } catch (error) {
    console.error("listMerchantDeliveryRequests failed", error);
  }
  const rows = await rawFind({ merchantId: oid(merchantId) }, { limit: 200, withWidget: true });
  return rows.map(fromRaw);
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
    createdAt: asDate(row.createdAt),
  };
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

  const payload = {
    merchantId,
    widgetId,
    pincode: code,
    country: "",
    city: "",
    state: "",
    productId: productId || null,
    productTitle: String(productTitle || "").trim().slice(0, 120) || null,
    status: REQUEST_STATUSES.PENDING,
  };

  payload.country = String(country || "IN").toUpperCase();

  const fillPlace = (row) => {
    lookupPostalCode(country || "IN", code)
      .then(async (place) => {
        if (!place?.ok || !row?.id) return;
        const data = {
          country: String(place.country || payload.country).toUpperCase(),
          city: place.city || "",
          state: place.state || "",
        };
        if (canUseModel()) {
          await prisma.deliveryRequest.update({ where: { id: String(row.id) }, data }).catch(() => {});
          return;
        }
        await prisma
          .$runCommandRaw({
            update: COLLECTION,
            updates: [
              {
                q: { _id: oid(row.id) },
                u: { $set: { ...data, updatedAt: { $date: new Date().toISOString() } } },
              },
            ],
          })
          .catch(() => {});
      })
      .catch(() => {});
  };

  if (canUseModel()) {
    try {
      const existing = await prisma.deliveryRequest.findFirst({
        where: { merchantId, widgetId, pincode: code, status: REQUEST_STATUSES.PENDING },
      });
      if (existing) {
        const row = serializeDeliveryRequest(existing);
        if (!row.city) fillPlace(row);
        return row;
      }
      const created = await prisma.deliveryRequest.create({ data: payload });
      const row = serializeDeliveryRequest(created);
      fillPlace(row);
      return row;
    } catch (error) {
      console.error("deliveryRequest model write failed, using direct insert", error);
    }
  }

  const existingRows = await rawFind(
    {
      merchantId: oid(merchantId),
      widgetId: oid(widgetId),
      pincode: code,
      status: REQUEST_STATUSES.PENDING,
    },
    { limit: 1 },
  );
  if (existingRows[0]) {
    const row = fromRaw(existingRows[0]);
    if (!row.city) fillPlace(row);
    return row;
  }

  const now = new Date().toISOString();
  const result = await prisma.$runCommandRaw({
    insert: COLLECTION,
    documents: [
      {
        widgetId: oid(widgetId),
        merchantId: oid(merchantId),
        pincode: code,
        country: payload.country,
        city: payload.city,
        state: payload.state,
        productId: payload.productId,
        productTitle: payload.productTitle,
        status: REQUEST_STATUSES.PENDING,
        createdAt: { $date: now },
        updatedAt: { $date: now },
      },
    ],
  });
  const inserted = result?.insertedIds?.[0] || result?.insertedIds?.["0"];
  const row = {
    ...payload,
    id: asId(inserted) || "",
    createdAt: now,
  };
  fillPlace(row);
  return row;
}

export async function setDeliveryRequestStatus(merchantId, widgetId, requestId, status) {
  let request = null;
  if (canUseModel()) {
    request = await prisma.deliveryRequest.findFirst({
      where: { id: requestId, merchantId, widgetId },
    });
  } else {
    const rows = await rawFind({ _id: oid(requestId), merchantId: oid(merchantId), widgetId: oid(widgetId) }, { limit: 1 });
    request = rows[0] ? fromRaw(rows[0]) : null;
  }
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

  if (canUseModel()) {
    await prisma.deliveryRequest.update({
      where: { id: requestId },
      data: { status },
    });
  } else {
    await prisma.$runCommandRaw({
      update: COLLECTION,
      updates: [
        {
          q: { _id: oid(requestId), merchantId: oid(merchantId), widgetId: oid(widgetId) },
          u: { $set: { status, updatedAt: { $date: new Date().toISOString() } } },
        },
      ],
    });
  }

  return getWidgetForMerchant(merchantId, widgetId);
}
