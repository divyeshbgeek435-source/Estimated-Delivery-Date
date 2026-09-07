import { Prisma, PrismaClient } from "@prisma/client";

function createClient() {
  return new PrismaClient();
}

function modelHasField(modelName, fieldName) {
  return Boolean(
    Prisma.dmmf?.datamodel?.models
      ?.find((model) => model.name === modelName)
      ?.fields?.some((field) => field.name === fieldName),
  );
}

export function hasDeliveryRequestModel() {
  return typeof prisma.deliveryRequest?.findMany === "function";
}

export function hasWidgetEventKind() {
  return modelHasField("WidgetEvent", "kind");
}

if (!globalThis.prismaGlobal || typeof globalThis.prismaGlobal.widgetEvent?.findMany !== "function") {
  globalThis.prismaGlobal = createClient();
}

const prisma = globalThis.prismaGlobal;

export default prisma;
