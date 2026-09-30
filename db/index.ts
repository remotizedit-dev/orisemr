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
};

// Optimal serverless pool configuration:
// 1. Shorter idleTimeout (15s instead of 5 minutes) allows idle connections to close
//    promptly so Neon compute can auto-suspend and scale to 0 when there is no traffic.
// 2. Max connections capped at 10 to avoid exhausting pooler connection limits.
// 3. NO forced keep-alive ping (SELECT 1 every 2 minutes):
//    Allowing Neon to sleep when inactive saves up to 70-80% of Neon compute hours/billing.
export const pool =
  globalForDb.conn ??
  new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 15000, // 15 seconds: release idle connections quickly to enable auto-suspend
    connectionTimeoutMillis: 10000,
  });

globalForDb.conn = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
