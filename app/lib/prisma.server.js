import { PrismaClient } from "@prisma/client";

function createClient() {
  return new PrismaClient();
}

if (!globalThis.prismaGlobal || typeof globalThis.prismaGlobal.deliveryRequest?.findMany !== "function") {
  globalThis.prismaGlobal = createClient();
}

const prisma = globalThis.prismaGlobal;

export default prisma;
