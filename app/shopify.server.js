import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";

// Create a dedicated Prisma client for session storage with optimized settings
const sessionPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SCRIBERRNOTE_DEV_DATABASE_URL || process.env.SCRIBERRNOTE_DATABASE_URL,
    },
  },
  log: ['error'],
});

// Debug environment variables
console.log("🔍 Shopify Server Environment Check:");
console.log("- SHOPIFY_API_KEY:", process.env.SHOPIFY_API_KEY ? "SET" : "NOT SET");
console.log("- SHOPIFY_API_SECRET:", process.env.SHOPIFY_API_SECRET ? "SET" : "NOT SET");
console.log("- SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL);
console.log("- APP_URL:", process.env.APP_URL);
console.log("- SCOPES:", process.env.SCOPES);

// Ensure appUrl is properly set
const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "https://scriberrdev.vercel.app";
console.log("- Final appUrl:", appUrl);

if (!appUrl || appUrl === "undefined") {
  throw new Error("SHOPIFY_APP_URL or APP_URL environment variable must be set");
}

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET_KEY,
  apiVersion: ApiVersion.January25,
  scopes: (process.env.SCOPES || "").split(",").map(s => s.trim()).filter(Boolean),
  appUrl: appUrl,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(sessionPrisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});



export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
