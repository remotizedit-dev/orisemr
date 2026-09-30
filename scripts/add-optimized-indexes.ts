import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Applying optimized indexes...");

  // 1. Patients: active patients sorted by created_at DESC
  await sql`
    CREATE INDEX IF NOT EXISTS patients_tenant_active_created_desc_idx 
    ON patients (tenant_id, created_at DESC) 
    WHERE deleted_at IS NULL;
  `;
  console.log("✓ Created patients_tenant_active_created_desc_idx");

  // 2. Appointments: tenant + doctor + start_time composite
  await sql`
    CREATE INDEX IF NOT EXISTS appointments_tenant_doctor_start_idx 
    ON appointments (tenant_id, doctor_id, start_time);
  `;
  console.log("✓ Created appointments_tenant_doctor_start_idx");

  // 3. Queue entries: tenant + date + queue_position ordering
  await sql`
    CREATE INDEX IF NOT EXISTS queue_tenant_date_pos_sort_idx 
    ON queue_entries (tenant_id, date, queue_position ASC);
  `;
  console.log("✓ Created queue_tenant_date_pos_sort_idx");

  // 4. Invoices: partial index for outstanding dues sorted by created_at DESC
  await sql`
    CREATE INDEX IF NOT EXISTS invoices_unpaid_created_idx 
    ON invoices (tenant_id, created_at DESC) 
    WHERE status IN ('due', 'partial');
  `;
  console.log("✓ Created invoices_unpaid_created_idx");

  // 5. Invoices: tenant + status + created_at composite
  await sql`
    CREATE INDEX IF NOT EXISTS invoices_tenant_status_created_idx 
    ON invoices (tenant_id, status, created_at DESC);
  `;
  console.log("✓ Created invoices_tenant_status_created_idx");

  console.log("All optimized indexes applied successfully!");
}

main().catch(console.error);
