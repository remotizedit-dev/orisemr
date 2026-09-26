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

export const pool =
  globalForDb.conn ??
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 300000, // 5 minutes keepalive to prevent frequent reconnects
    connectionTimeoutMillis: 10000,
  });

globalForDb.conn = pool;

// Keep Neon serverless compute warm and prevent 5-minute cold suspension latency
if (!globalForDb.keepAlive && typeof setInterval !== "undefined") {
  globalForDb.keepAlive = setInterval(() => {
    pool.query("SELECT 1").catch(() => {});
  }, 120000); // Ping every 2 minutes
  if (globalForDb.keepAlive.unref) {
    globalForDb.keepAlive.unref();
  }
}

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
