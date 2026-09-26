import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
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
    <div className="w-full">
      <WorkingHoursClient initialShifts={shifts} />
    </div>
  );
}

