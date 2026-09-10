import { z } from "zod";
import {
  CART_DISPLAY_MODES,
  DATE_FORMATS,
  DEFAULT_WORKING_DAYS,
  MARKET_MODES,
  PLACEMENT_MODES,
  ALL_PLACEMENT_POSITIONS,
  PLACEMENT_POSITIONS,
  WIDGET_LOCATIONS,
  WORKING_DAYS,
} from "./constants";
import { isValidTimeZone } from "./timezone";
import {
  DEFAULT_PINCODE_RULES,
  DEFAULT_WEIGHT_RULES,
  LOCATION_SELECTION,
  WEIGHT_DISPLAY_MODES,
  normalizePincodeRules,
  normalizeWeightRules,
} from "./pincode";

export function normalizeHex(value, fallback = "#000000") {
  const match = String(value || "").trim().match(/#?([0-9A-Fa-f]{6})/);
  return match ? `#${match[1]}` : fallback;
}

const hexColor = (fallback) =>
  z.preprocess((value) => normalizeHex(value, fallback), z.string().regex(/^#([0-9A-Fa-f]{6})$/));

const optionalHexColor = z.preprocess((value) => {
  if (value == null || value === "") return "";
  return normalizeHex(value, "");
}, z.string().regex(/^$|^#([0-9A-Fa-f]{6})$/));

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const asString = (fallback = "") =>
  z.preprocess((value) => (value == null ? fallback : value), z.string());

const asEnabled = z.preprocess((value) => {
  if (value == null || value === "") return true;
  return value === true || value === "true" || value === "on" || value === "1";
}, z.boolean());

const asOptionalString = z.preprocess((value) => (value == null || value === "" ? undefined : value), z.string().optional());

const asPincodeCode = z.preprocess(
  (value) => {
    if (value == null || value === "") return undefined;
    return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) || undefined;
  },
  z.string().max(16).optional(),
);

const ianaTimezoneSchema = z.preprocess(
  (value) => (value == null || value === "" ? undefined : String(value).trim()),
  z
    .string()
    .min(1, "Choose a timezone")
    .max(64)
    .refine((value) => isValidTimeZone(value), { message: "Choose a valid timezone" })
    .optional(),
);

export const locationSchema = z.object({
  location: z.enum([
    WIDGET_LOCATIONS.PRODUCT,
    WIDGET_LOCATIONS.CART,
  ]),
  name: asOptionalString.pipe(z.string().trim().max(80).optional()),
});

export const blockedDateSchema = z.object({
  date: asString().pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")),
  endDate: z.preprocess(
    (value) => (value == null || value === "" ? undefined : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
  ),
  name: asString("Holiday").pipe(z.string().trim().min(1).max(80)),
  recurring: z.boolean().optional(),
});

export const shippingSchema = z
  .object({
    processingMinDays: z.coerce.number().int().min(0).max(30),
    processingMaxDays: z.coerce.number().int().min(0).max(60),
    cutoffTime: asString("12:00 AM").pipe(z.string().min(1).max(20)),
    workingDays: z
      .array(z.enum(WORKING_DAYS))
      .default([...DEFAULT_WORKING_DAYS])
      .transform((days) => (days.length ? days : [...DEFAULT_WORKING_DAYS])),
    blockedDates: z.array(blockedDateSchema).default([]),
    transitMinDays: z.coerce.number().int().min(0).max(30),
    transitMaxDays: z.coerce.number().int().min(0).max(60),
    transitWorkingDays: z
      .array(z.enum(WORKING_DAYS))
      .default([...DEFAULT_WORKING_DAYS])
      .transform((days) => (days.length ? days : [...DEFAULT_WORKING_DAYS])),
    transitBlockedDates: z.array(blockedDateSchema).default([]),
    timezone: ianaTimezoneSchema,
    pincodeRules: z.preprocess(
      (value) => (value == null ? DEFAULT_PINCODE_RULES : value),
      z
        .object({
          enabled: z.preprocess(
            (value) => value === true || value === "true" || value === "on" || value === "1",
            z.boolean(),
          ),
          country: asString("IN").pipe(z.string().trim().toUpperCase().min(2).max(2)),
          countries: z.array(asString("").pipe(z.string().trim().toUpperCase().min(2).max(2))).max(40).default([]),
          locations: z
            .array(
              z.object({
                country: asString("IN").pipe(z.string().trim().toUpperCase().min(2).max(2)),
                city: asString("").pipe(z.string().trim().max(80)),
                state: asOptionalString.pipe(z.string().trim().max(80).optional()),
                weight: asOptionalString.pipe(z.string().trim().max(32).optional()),
                unit: asOptionalString.pipe(z.string().trim().max(16).optional()),
                pincodes: z
                  .array(
                    z.union([
                      asPincodeCode,
                      z.object({
                        code: asPincodeCode,
                        label: asOptionalString.pipe(z.string().trim().max(80).optional()),
                        minDays: z.coerce.number().int().min(0).max(60).optional(),
                        maxDays: z.coerce.number().int().min(0).max(90).optional(),
                        weight: asOptionalString.pipe(z.string().trim().max(32).optional()),
                        unit: asOptionalString.pipe(z.string().trim().max(16).optional()),
                      }),
                    ]),
                  )
                  .max(2000)
                  .default([]),
              }),
            )
            .max(80)
            .default([]),
          stateMode: z.preprocess(
            (value) => value || LOCATION_SELECTION.SPECIFIC,
            z.enum([LOCATION_SELECTION.ALL, LOCATION_SELECTION.SPECIFIC]),
          ),
          states: z.array(asString("").pipe(z.string().trim().max(80))).max(80).default([]),
          cityMode: z.preprocess(
            (value) => value || LOCATION_SELECTION.SPECIFIC,
            z.enum([LOCATION_SELECTION.ALL, LOCATION_SELECTION.SPECIFIC]),
          ),
          cities: z
            .array(
              z.union([
                asString("").pipe(z.string().trim().max(80)),
                z.object({
                  name: asString("").pipe(z.string().trim().max(80)),
                  state: asOptionalString.pipe(z.string().trim().max(80).optional()),
                  weight: asOptionalString.pipe(z.string().trim().max(32).optional()),
                  unit: asOptionalString.pipe(z.string().trim().max(16).optional()),
                }),
              ]),
            )
            .max(400)
            .default([]),
          pincodes: z
            .array(
              z.object({
                code: asPincodeCode,
                from: asPincodeCode,
                to: asPincodeCode,
                minDays: z.coerce.number().int().min(0).max(60).optional().default(1),
                maxDays: z.coerce.number().int().min(0).max(90).optional().default(2),
                label: asOptionalString.pipe(z.string().trim().max(80).optional()),
                city: asOptionalString.pipe(z.string().trim().max(80).optional()),
                state: asOptionalString.pipe(z.string().trim().max(80).optional()),
                weight: asOptionalString.pipe(z.string().trim().max(32).optional()),
                unit: asOptionalString.pipe(z.string().trim().max(16).optional()),
              }),
            )
            .max(8000)
            .default([]),
        })
        .transform((value) => normalizePincodeRules(value)),
    ),
    weightRules: z.preprocess(
      (value) => (value == null ? DEFAULT_WEIGHT_RULES : value),
      z
        .object({
          value: asString("").pipe(z.string().trim().max(32)),
          unit: asString("kg").pipe(z.string().trim().max(16)),
          useProductWeight: z.preprocess(
            (value) => value === true || value === "true" || value === "on" || value === "1",
            z.boolean(),
          ),
          displayMode: z.preprocess(
            (value) => value || "",
            z.enum(["", WEIGHT_DISPLAY_MODES.PINCODE, WEIGHT_DISPLAY_MODES.DIRECT]),
          ),
        })
        .transform((value) => normalizeWeightRules(value)),
    ),
  })
  .transform((value) => {
    const processingMinDays = Number(value.processingMinDays) || 0;
    const processingMaxDays = Math.max(Number(value.processingMaxDays) || 0, processingMinDays);
    const transitMinDays = Number(value.transitMinDays) || 0;
    const transitMaxDays = Math.max(Number(value.transitMaxDays) || 0, transitMinDays);
    const next = {
      ...value,
      processingMinDays,
      processingMaxDays,
      transitMinDays,
      transitMaxDays,
    };
    if (next.weightRules?.displayMode !== WEIGHT_DISPLAY_MODES.DIRECT) return next;
    return {
      ...next,
      pincodeRules: { ...next.pincodeRules, enabled: false },
    };
  })
  .refine((value) => value.processingMaxDays >= value.processingMinDays, {
    message: "Longest processing time must be greater than or equal to the shortest.",
    path: ["processingMaxDays"],
  })
  .refine((value) => value.transitMaxDays >= value.transitMinDays, {
    message: "Longest transit time must be greater than or equal to the shortest.",
    path: ["transitMaxDays"],
  });

export const messageSchema = z.object({
  heading: asString("").pipe(z.string().trim().max(80)),
  template: asString(
    "Order today within {counter}, you'll receive your package between {delivery_from} to {delivery_to}",
  ).pipe(z.string().trim().min(1).max(500)),
  dateFormat: z.preprocess(
    (value) => value || DATE_FORMATS.LONG,
    z.enum([DATE_FORMATS.LONG, DATE_FORMATS.NUMERIC_MDY, DATE_FORMATS.NUMERIC_DMY]),
  ),
  dateSeparator: asString("/").pipe(z.string().min(1).max(3)),
  includeYear: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean(),
  ),
  widgetLayout: z.preprocess((value) => value || "FULL", z.enum(["FULL", "MINIMAL"])),
  designTemplate: z.preprocess(
    (value) => value || "TIMELINE",
    z.enum([
      "TIMELINE",
      "JOURNEY",
      "MOMENT",
      "BUBBLE",
      "EXPRESS",
      "SEGMENTS",
      "METER",
      "BAND",
      "COMPACT",
      "STACKED",
      "PILL",
      "CARD",
      "TRACKER",
      "BANNER",
    ]),
  ),
  descriptionEnabled: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1" || value === undefined,
    z.boolean(),
  ),
  headingEnabled: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1" || value === undefined,
    z.boolean(),
  ),
  translations: z.preprocess(
    (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return {};
      // Drop internal meta keys (__design, etc.) before locale shape validation.
      return Object.fromEntries(Object.entries(value).filter(([key]) => !String(key).startsWith("__")));
    },
    z
      .record(
        z.string(),
        z.object({
          template: asOptionalString,
          purchasedTitle: asOptionalString,
          processingTitle: asOptionalString,
          deliveredTitle: asOptionalString,
        }),
      )
      .nullish()
      .transform((value) => value || {}),
  ),
  purchased: asString("bag").pipe(z.string().min(1).max(400000)),
  processing: asString("truck").pipe(z.string().min(1).max(400000)),
  delivered: asString("pin").pipe(z.string().min(1).max(400000)),
  headerIcon: asString("flag").pipe(z.string().min(1).max(400000)),
  headerIconEnabled: asEnabled,
  purchasedEnabled: asEnabled,
  processingEnabled: asEnabled,
  deliveredEnabled: asEnabled,
  savedIcons: z
    .array(
      z.object({
        id: asString(),
        src: asString().pipe(z.string().min(1).max(400000)),
        kind: z.preprocess((value) => value || "static", z.enum(["static", "animated"])),
        label: asString("Custom icon").pipe(z.string().trim().max(40)),
        addedAt: asOptionalString,
      }),
    )
    .nullish()
    .transform((value) => value || []),
  purchasedTitle: z.preprocess(
    (value) => (value == null || value === "" ? "Purchased" : value),
    z.string().trim().min(1).max(40),
  ),
  processingTitle: z.preprocess(
    (value) => (value == null || value === "" ? "Processing" : value),
    z.string().trim().min(1).max(40),
  ),
  deliveredTitle: z.preprocess(
    (value) => (value == null || value === "" ? "Delivered" : value),
    z.string().trim().min(1).max(40),
  ),
  purchasedColor: optionalHexColor,
  processingColor: optionalHexColor,
  deliveredColor: optionalHexColor,
});

export const styleSchema = z.object({
  backgroundType: z.preprocess((value) => value || "SOLID", z.enum(["SOLID", "GRADIENT", "TRANSPARENT"])),
  backgroundColor: hexColor("#FFFFFF"),
  gradientStart: hexColor("#FFFFFF"),
  gradientEnd: hexColor("#F1F1F1"),
  gradientDirection: z.preprocess(
    (value) => value || "TO_BOTTOM",
    z.enum(["TO_RIGHT", "TO_LEFT", "TO_BOTTOM", "TO_TOP", "TO_BOTTOM_RIGHT"]),
  ),
  borderRadius: z.coerce.number().int().min(0).max(32),
  themeColor: hexColor("#008060"),
  borderWidth: z.coerce.number().int().min(0).max(12).default(1),
  borderColor: hexColor("#E1E3E5"),
  paddingTop: z.coerce.number().int().min(0).max(64).default(16),
  paddingMiddle: z.coerce.number().int().min(0).max(64).default(16),
  paddingBottom: z.coerce.number().int().min(0).max(64).default(16),
  paddingLeft: z.coerce.number().int().min(0).max(64).default(16),
  paddingRight: z.coerce.number().int().min(0).max(64).default(16),
  iconSize: z.coerce.number().int().min(12).max(72).default(18),
  progressWidth: z.coerce.number().int().min(1).max(8).default(2),
  progressColor: hexColor("#008060"),
  fontFamily: asString("inherit").pipe(z.string().min(1).max(80)),
  fontSize: z.coerce.number().int().min(10).max(24).default(14),
  textColor: hexColor("#202223"),
  statusFontSize: z.coerce.number().int().min(8).max(24).default(12),
  statusColor: hexColor("#202223"),
  dateFontSize: z.coerce.number().int().min(8).max(24).default(11),
  dateColor: hexColor("#202223"),
  dynamicColor: hexColor("#202223"),
  headingFontWeight: z.coerce.number().int().min(400).max(900).default(600),
  customCss: asString("").pipe(z.string().max(4000)),
});

export const placementSchema = z.object({
  mode: z.preprocess(
    (value) => value || PLACEMENT_MODES.ALL_PRODUCTS,
    z.enum([PLACEMENT_MODES.ALL_PRODUCTS, PLACEMENT_MODES.COLLECTIONS, PLACEMENT_MODES.PRODUCTS]),
  ),
  productIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  products: z
    .array(
      z.object({
        id: asString(),
        title: asString("Product"),
        image: z.preprocess((value) => value ?? null, z.string().nullable().optional()),
        status: asOptionalString,
      }),
    )
    .default([]),
  collections: z
    .array(
      z.object({
        id: asString(),
        title: asString("Collection"),
        handle: asOptionalString,
        image: z.preprocess((value) => value ?? null, z.string().nullable().optional()),
        productsCount: z.preprocess((value) => {
          if (value == null || value === "") return undefined;
          const count = Number(value);
          return Number.isFinite(count) ? count : undefined;
        }, z.number().optional()),
      }),
    )
    .default([]),
  position: asString(PLACEMENT_POSITIONS.BELOW_ATC)
    .pipe(z.string().min(1))
    .refine((value) => ALL_PLACEMENT_POSITIONS.includes(value), {
      message: "Choose a valid placement position",
    }),
});

export const cartSchema = z.object({
  displayMode: z.enum([
    CART_DISPLAY_MODES.PER_PRODUCT,
    CART_DISPLAY_MODES.GENERAL,
  ]),
});

export const editorSchema = z.object({
  name: asString("Delivery widget").pipe(z.string().trim().min(1).max(80)),
  timezone: ianaTimezoneSchema,
  marketMode: z.preprocess(
    (value) => value || MARKET_MODES.ALL,
    z.enum([MARKET_MODES.ALL, MARKET_MODES.SPECIFIC]),
  ),
  marketIds: z.array(z.string()).default([]),
  markets: z
    .array(
      z.object({
        id: asString(),
        title: asString("Market"),
        handle: asOptionalString,
      }),
    )
    .nullish()
    .transform((value) => value || []),
  displayMode: z.preprocess(
    (value) => (value == null ? undefined : value),
    z.enum([CART_DISPLAY_MODES.PER_PRODUCT, CART_DISPLAY_MODES.GENERAL]).optional(),
  ),
});

export const widgetEventSchema = z.object({
  widgetId: objectId,
  type: z.preprocess(
    (value) => String(value || "").toUpperCase(),
    z.enum(["IMPRESSION", "CLICK", "ADD_TO_CART", "CONVERSION"]),
  ),
  productId: z.string().max(128).optional(),
  eventKey: z.string().max(200).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  cursor: z.string().optional(),
});

export function parseFormBooleans(formData, keys) {
  return keys.filter((key) => formData.get(key) === "on" || formData.get(key) === "true");
}

export function formErrors(error) {
  if (!(error instanceof z.ZodError)) {
    return { form: "Something went wrong. Please try again." };
  }

  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
  );
}
