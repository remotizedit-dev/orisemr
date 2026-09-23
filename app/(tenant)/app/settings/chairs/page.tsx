import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import SettingsTabs from "@/components/settings/SettingsTabs";
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
          Chamber Settings
        </h1>
        <p className="text-sm text-[#6B7280]">
          Configure clinic operational hours, chairs, billing catalog, and patient ID mode.
        </p>
      </div>

      <SettingsTabs />

      <ChairsClient initialChairs={chairRows} />
    </div>
  );
}
