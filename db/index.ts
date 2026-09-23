import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/oris_emr";

// Connection pool singleton for serverless Next.js runtime & Node scripts
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

export const pool = globalForDb.conn ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForDb.conn = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
