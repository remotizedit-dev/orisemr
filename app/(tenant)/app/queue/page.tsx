import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { QueueBoard, type QueueItem } from "@/components/queue/QueueBoard";

export default async function LiveQueuePage() {
  const { tenant, user } = await requireClinicStaff();

  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 1. Auto-sync any confirmed/pending appointments scheduled for today into queueEntries
  // (guarantees advance bookings made days ago appear in Booked Today)
  const [year, month, day] = todayDhakaStr.split("-").map(Number);
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  const todayApts = await db
    .select({
      id: schema.appointments.id,
      patientId: schema.appointments.patientId,
      doctorId: schema.appointments.doctorId,
      chairId: schema.appointments.chairId,
    })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.tenantId, tenant.id),
        sql`${schema.appointments.startTime} >= ${dayStart.toISOString()}`,
        sql`${schema.appointments.startTime} <= ${dayEnd.toISOString()}`,
        sql`${schema.appointments.status} NOT IN ('cancelled', 'no_show')`
      )
    );

  if (todayApts.length > 0) {
    const existingQueueRows = await db
      .select({ appointmentId: schema.queueEntries.appointmentId })
      .from(schema.queueEntries)
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.date, todayDhakaStr)
        )
      );
    const existingAptIdSet = new Set(existingQueueRows.map((q) => q.appointmentId));
    const missingQueueApts = todayApts.filter(
      (a) => a.patientId && !existingAptIdSet.has(a.id)
    );

    if (missingQueueApts.length > 0) {
      await db.insert(schema.queueEntries).values(
        missingQueueApts.map((m) => ({
          tenantId: tenant.id,
          appointmentId: m.id,
          patientId: m.patientId!,
          doctorId: m.doctorId,
          chairId: m.chairId || null,
          date: todayDhakaStr,
          status: "booked" as const,
          serialNo: null,
          queuePosition: 0,
        }))
      );
    }
  }

  // 2. Fetch all queue entries for today
  const entries = await db
    .select({
      id: schema.queueEntries.id,
      appointmentId: schema.queueEntries.appointmentId,
      status: schema.queueEntries.status,
      serialNo: schema.queueEntries.serialNo,
      chairId: schema.queueEntries.chairId,
      patientId: schema.patients.id,
      patientName: schema.patients.name,
      patientPhone: schema.patients.phone,
      patientCard: schema.patients.cardNumber,
      allergyFlags: schema.patients.allergyFlags,
      doctorId: schema.users.id,
      doctorName: schema.users.name,
      startTime: schema.appointments.startTime,
    })
    .from(schema.queueEntries)
    .innerJoin(
      schema.appointments,
      eq(schema.queueEntries.appointmentId, schema.appointments.id)
    )
    .innerJoin(
      schema.patients,
      eq(schema.queueEntries.patientId, schema.patients.id)
    )
    .innerJoin(
      schema.users,
      eq(schema.queueEntries.doctorId, schema.users.id)
    )
    .where(
      and(
        eq(schema.queueEntries.tenantId, tenant.id),
        eq(schema.queueEntries.date, todayDhakaStr)
      )
    )
    .orderBy(schema.appointments.startTime);

  const formattedItems: QueueItem[] = entries.map((e) => ({
    id: e.id,
    appointmentId: e.appointmentId,
    status: e.status,
    serialNo: e.serialNo,
    chairId: e.chairId,
    patientId: e.patientId,
    patientName: e.patientName,
    patientPhone: e.patientPhone,
    patientCard: e.patientCard,
    allergyFlags: e.allergyFlags || [],
    doctorId: e.doctorId,
    doctorName: e.doctorName,
    startTime: new Date(e.startTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    startTimeRaw: e.startTime.toISOString(),
  }));

  // 2. Fetch doctors in this clinic
  const staff = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      isDoctor: schema.users.isDoctor,
    })
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenant.id));

  const doctors = staff.filter((s) => s.isDoctor);

  // 3. Fetch active chairs in this clinic
  const chairs = await db
    .select({
      id: schema.chairs.id,
      name: schema.chairs.name,
    })
    .from(schema.chairs)
    .where(
      and(
        eq(schema.chairs.tenantId, tenant.id),
        eq(schema.chairs.isActive, true)
      )
    )
    .orderBy(schema.chairs.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
              Live Patient Queue
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-[#30D158] animate-ping" />
          </div>
          <p className="text-sm text-[#6B7280]">
            Track patient arrivals, assign dental chairs, write prescriptions, and clear payments in real time.
          </p>
        </div>
      </div>

      <QueueBoard
        initialItems={formattedItems}
        currentUserId={user.id}
        currentUserIsDoctor={user.isDoctor}
        doctors={doctors}
        chairs={chairs}
      />
    </div>
  );
}
