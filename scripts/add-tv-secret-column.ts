import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  console.log("Adding tv_display_secret column to tenants table...");
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tv_display_secret text;`;
  
  const tenants = await sql`SELECT id, slug, tv_display_secret FROM tenants;`;
  for (const t of tenants) {
    if (!t.tv_display_secret) {
      const secret = crypto.randomBytes(12).toString("hex");
      await sql`UPDATE tenants SET tv_display_secret = ${secret} WHERE id = ${t.id}::uuid;`;
      console.log(`Assigned secret ${secret} to tenant ${t.slug}`);
    }
  }
  const updated = await sql`SELECT id, slug, tv_display_secret FROM tenants;`;
  console.log("Updated tenants with tv_display_secret:", updated);
}

main().catch(console.error);
