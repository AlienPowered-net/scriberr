import { prisma } from "../utils/db.server";

export const loader = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "SET" : "NOT SET",
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "SET" : "NOT SET",
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      APP_URL: process.env.APP_URL,
      DATABASE_URL: process.env.SCRIBERRNOTE_DATABASE_URL ? "SET" : "NOT SET",
      DEV_DATABASE_URL: process.env.SCRIBERRNOTE_DEV_DATABASE_URL ? "SET" : "NOT SET",
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      status: "ok",
      environment: envCheck,
      message: "Health check passed"
    }, null, 2), { 
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), { 
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
    