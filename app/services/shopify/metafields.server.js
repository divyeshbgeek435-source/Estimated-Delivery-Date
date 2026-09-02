import { publicStorefrontConfig } from "../analytics/analytics.server";
import { buildStorefrontDelivery } from "../delivery/delivery-calculator.server";
import prisma from "../../lib/prisma.server";
import { WIDGET_STATUSES } from "../../lib/constants";

export async function syncCheckoutMetafield(admin, widget) {
  if (!admin || !widget || widget.location !== "CHECKOUT") return;

  try {
    const shopResponse = await admin.graphql(`#graphql
      query DeliveryDateShopId {
        shop {
          id
        }
      }
    `);
    const shopJson = await shopResponse.json();
    const ownerId = shopJson.data?.shop?.id;
    if (!ownerId) return;

    const live = widget.status === WIDGET_STATUSES.ACTIVE;
    let value = "null";
    if (live) {
      const product = widget.merchantId
        ? await prisma.widget.findFirst({
            where: { merchantId: widget.merchantId, location: "PRODUCT", status: WIDGET_STATUSES.ACTIVE },
            orderBy: { updatedAt: "desc" },
          })
        : null;
      const shipping = product?.shippingRules || widget.shippingRules;
      const timezone = product?.timezone || widget.timezone;
      const delivery = buildStorefrontDelivery(shipping, timezone, new Date(), {
        dateSettings: {
          dateFormat: widget.messageConfig?.dateFormat,
          dateSeparator: widget.messageConfig?.dateSeparator,
          includeYear: widget.messageConfig?.includeYear,
        },
      });
      value = JSON.stringify(publicStorefrontConfig(widget, delivery));
    }

    await admin.graphql(
      `#graphql
        mutation DeliveryDateMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          metafields: [
            {
              namespace: "$app",
              key: "checkout_widget",
              type: "json",
              ownerId,
              value,
            },
          ],
        },
      },
    );
  } catch (error) {
    console.warn("[edd] checkout metafield sync failed", error?.message || error);
  }
}
