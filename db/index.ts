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

// Connection pool for serverless Next.js runtime & Node scripts
export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema, casing: "snake_case" });

export type Database = typeof db;
