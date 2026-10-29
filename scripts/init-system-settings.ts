import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  console.log("Checking system_settings table in Neon Postgres...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "system_settings" (
      "key" text PRIMARY KEY NOT NULL,
      "value" text NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  console.log("✅ system_settings table verified/created successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  });
