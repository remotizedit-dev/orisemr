import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('patients', 'appointments', 'queue_entries', 'invoices')
    ORDER BY tablename, indexname;
  `;
  for (const r of rows) {
    console.log(`${r.tablename} -> ${r.indexname}`);
  }
}

main().catch(console.error);
