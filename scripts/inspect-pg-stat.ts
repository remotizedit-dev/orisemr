import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Top Queries from pg_stat_statements ===");
  try {
    const stats = await sql`
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        rows
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT 10;
    `;
    for (const s of stats) {
      console.log(`\nCalls: ${s.calls} | Total: ${Number(s.total_exec_time).toFixed(2)}ms | Mean: ${Number(s.mean_exec_time).toFixed(2)}ms | Max: ${Number(s.max_exec_time).toFixed(2)}ms | Rows: ${s.rows}`);
      console.log(`Query: ${s.query.slice(0, 150)}...`);
    }
  } catch (err: any) {
    console.log("Could not query pg_stat_statements:", err.message);
  }
}

main().catch(console.error);
