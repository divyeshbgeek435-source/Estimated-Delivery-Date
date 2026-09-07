import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./lib/prisma.server.js";
import { persistSessionIdentity, syncMerchantProfile } from "./services/shopify/merchant.server.js";

const prismaSessions = new PrismaSessionStorage(prisma);
const profileSessionStorage = new Proxy(prismaSessions, {
  get(target, prop, receiver) {
    if (prop === "storeSession") {
      return async (session) => {
        const saved = await target.storeSession(session);
        await persistSessionIdentity(session).catch(() => {});
        return saved;
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July26,
  scopes: (
    process.env.SCOPES ||
    process.env.SHOPIFY_SCOPES ||
    "write_products,write_metaobjects,write_metaobject_definitions,read_themes,write_themes,read_orders,write_checkouts"
  )
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: profileSessionStorage,
  useOnlineTokens: true,
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      await syncMerchantProfile({ session, admin });
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.July26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
