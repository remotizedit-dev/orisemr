import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import SettingsTabs from "@/components/settings/SettingsTabs";
import WorkingHoursClient from "@/components/settings/WorkingHoursClient";

export default async function SettingsHoursPage() {
  const { tenant } = await requireClinicStaff();

  const shifts = await db
    .select({
      weekday: schema.tenantWorkingHours.weekday,
      startTime: schema.tenantWorkingHours.startTime,
      endTime: schema.tenantWorkingHours.endTime,
    })
    .from(schema.tenantWorkingHours)
    .where(eq(schema.tenantWorkingHours.tenantId, tenant.id))
    .orderBy(schema.tenantWorkingHours.weekday, schema.tenantWorkingHours.startTime);

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

      <WorkingHoursClient initialShifts={shifts} />
    </div>
  );
}
