import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import DoctorsClient from "@/components/settings/DoctorsClient";

export default async function SettingsDoctorsPage() {
  const { tenant } = await requireClinicStaff();

  // Fetch all doctors for this tenant
  const doctors = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      role: schema.users.role,
      isDoctor: schema.users.isDoctor,
      status: schema.users.status,
      doctorTitle: schema.users.doctorTitle,
      doctorDegrees: schema.users.doctorDegrees,
      doctorSpecialty: schema.users.doctorSpecialty,
      doctorRegNo: schema.users.doctorRegNo,
      calendarColor: schema.users.calendarColor,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.isDoctor, true)
      )
    )
    .orderBy(schema.users.name);

  // Fetch all doctor schedules
  const schedules = await db
    .select({
      id: schema.doctorSchedules.id,
      doctorId: schema.doctorSchedules.doctorId,
      weekday: schema.doctorSchedules.weekday,
      startTime: schema.doctorSchedules.startTime,
      endTime: schema.doctorSchedules.endTime,
    })
    .from(schema.doctorSchedules)
    .where(eq(schema.doctorSchedules.tenantId, tenant.id));

  // Fetch clinic default working hours
  const clinicHours = await db
    .select({
      weekday: schema.tenantWorkingHours.weekday,
      startTime: schema.tenantWorkingHours.startTime,
      endTime: schema.tenantWorkingHours.endTime,
    })
    .from(schema.tenantWorkingHours)
    .where(eq(schema.tenantWorkingHours.tenantId, tenant.id));

  return (
    <div className="w-full">
      <DoctorsClient
        initialDoctors={doctors}
        initialSchedules={schedules}
        clinicHours={clinicHours}
      />
    </div>
  );
}
