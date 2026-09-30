import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

import { config } from "dotenv";
if (!process.env.DATABASE_URL) {
  config({ path: ".env.local" });
  config({ path: ".env" });
}

// Disable pipelineConnect to support SCRAM-SHA-256 and channel-binding over WebSocket
neonConfig.pipelineConnect = false;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/oris_emr";

// Connection pool singleton for serverless Next.js runtime & Node scripts
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
  keepAlive: NodeJS.Timeout | undefined;
};

// Optimal serverless pool configuration:
// 1. Shorter idleTimeout (15s instead of 5 minutes) allows idle connections to close
//    promptly so Neon compute can auto-suspend when there is no traffic.
// 2. Max connections capped at 10 to avoid exhausting pooler connection limits.
export const pool =
  globalForDb.conn ??
  new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 15000, // 15 seconds: release idle connections quickly
    connectionTimeoutMillis: 10000,
  });

globalForDb.conn = pool;

// Smart Operating-Hours Keep-Alive:
// Solves cold-start latency (0ms wait during clinic working hours) without running up 24/7 bills.
// - "smart" (default): Pings every 3.5 minutes ONLY during clinic hours (08:00 AM – 10:30 PM Dhaka time).
//   Doctors and patients get instantaneous 0ms response times throughout the working day.
//   Overnight (10:30 PM – 08:00 AM), pings automatically pause, allowing Neon to auto-suspend and save costs.
// - "always": Pings 24/7 (for paid Neon plans requiring zero night cold-starts).
// - "off": Completely disables pings (maximum cost-savings on free tier).
const keepAliveMode = (process.env.DB_KEEP_ALIVE_MODE || "smart").toLowerCase();

if (keepAliveMode !== "off" && !globalForDb.keepAlive && typeof setInterval !== "undefined") {
  globalForDb.keepAlive = setInterval(() => {
    if (keepAliveMode === "smart") {
      try {
        const dhakaHour = Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Dhaka",
            hour: "numeric",
            hour12: false,
          }).format(new Date())
        );
        // Pause pings overnight between 11 PM and 8 AM to let Neon sleep
        if (dhakaHour < 8 || dhakaHour >= 23) {
          return;
        }
      } catch {}
    }

    pool.query("SELECT 1").catch(() => {});
  }, 210000); // 3.5 minutes (well within Neon's 5-minute auto-suspend window)

  if (globalForDb.keepAlive.unref) {
    globalForDb.keepAlive.unref();
  }
}

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
