import { sql } from "drizzle-orm";
import { db } from "@/db";

async function run() {
  console.log("Updating users_tenant_role_chk constraint...");
  await db.execute(sql.raw("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_role_chk;"));
  await db.execute(
    sql.raw("ALTER TABLE users ADD CONSTRAINT users_tenant_role_chk CHECK (role <> 'SUPER_ADMIN' OR tenant_id IS NULL);")
  );
  console.log("✓ Constraint updated successfully!");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
