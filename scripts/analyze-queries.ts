import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Checking pg_stat_statements ===");
  try {
    const ext = await sql`SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements'`;
    console.log("pg_stat_statements installed:", ext.length > 0);
  } catch (err: any) {
    console.log("Error checking pg_stat_statements:", err.message);
  }

  // Get a tenant id to use for queries
  const tenants = await sql`SELECT id FROM tenants LIMIT 1`;
  if (tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }
  const tenantId = tenants[0].id;
  const today = new Date().toISOString().split("T")[0];
  console.log(`Using Tenant ID: ${tenantId}, Date: ${today}`);

  console.log("\n=== 1. EXPLAIN ANALYZE: Patients Query ===");
  const qPatients = await sql`
    EXPLAIN ANALYZE
    SELECT id, name, phone, card_number, gender, approx_age, allergy_flags, medical_conditions, created_at
    FROM patients
    WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
    ORDER BY created_at DESC;
  `;
  console.log(qPatients.map((r: any) => r["QUERY PLAN"]).join("\n"));

  console.log("\n=== 2. EXPLAIN ANALYZE: Appointments Query (by tenant and date) ===");
  const dayStart = `${today}T00:00:00+06:00`;
  const dayEnd = `${today}T23:59:59.999+06:00`;
  const qAppts = await sql`
    EXPLAIN ANALYZE
    SELECT a.id, a.appointment_code, a.start_time, a.end_time, a.status, a.patient_id, p.name as patient_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE a.tenant_id = ${tenantId}::uuid
      AND a.start_time >= ${dayStart}::timestamptz
      AND a.start_time <= ${dayEnd}::timestamptz
    ORDER BY a.start_time;
  `;
  console.log(qAppts.map((r: any) => r["QUERY PLAN"]).join("\n"));

  console.log("\n=== 3. EXPLAIN ANALYZE: Queue Query ===");
  const qQueue = await sql`
    EXPLAIN ANALYZE
    SELECT q.id, q.status, q.serial_no, q.queue_position, p.name as patient_name, a.start_time
    FROM queue_entries q
    JOIN appointments a ON q.appointment_id = a.id
    JOIN patients p ON q.patient_id = p.id
    WHERE q.tenant_id = ${tenantId}::uuid AND q.date = ${today}::date
    ORDER BY q.queue_position ASC;
  `;
  console.log(qQueue.map((r: any) => r["QUERY PLAN"]).join("\n"));

  console.log("\n=== 4. EXPLAIN ANALYZE: Dues Query ===");
  const qDues = await sql`
    EXPLAIN ANALYZE
    SELECT i.id, i.invoice_code, i.total_bdt, i.paid_bdt, i.status, i.created_at, p.name as patient_name
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    WHERE i.tenant_id = ${tenantId}::uuid
      AND i.status IN ('due', 'partial')
    ORDER BY i.created_at DESC;
  `;
  console.log(qDues.map((r: any) => r["QUERY PLAN"]).join("\n"));
}

main().catch(console.error);
