import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import ChairsClient from "@/components/settings/ChairsClient";

export default async function SettingsChairsPage() {
  const { tenant } = await requireClinicStaff();

  const chairRows = await db
    .select({
      id: schema.chairs.id,
      name: schema.chairs.name,
      isActive: schema.chairs.isActive,
    })
    .from(schema.chairs)
    .where(eq(schema.chairs.tenantId, tenant.id))
    .orderBy(schema.chairs.sortOrder, schema.chairs.name);

  return (
    <div className="w-full">
      <ChairsClient initialChairs={chairRows} />
    </div>
  );
}

