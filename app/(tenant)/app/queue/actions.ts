"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { formatDhakaTime } from "@/lib/utils";

export async function checkInPatientAction(appointmentId: string) {
  const { tenant, user } = await requireClinicStaff();

  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const counterKey = `SERIAL:${todayDhakaStr}`;

  let assignedSerial = 1;

  await db.transaction(async (tx) => {
    // 1. Fetch appointment details to verify and support upsert
    const [appointment] = await tx
      .select({
        id: schema.appointments.id,
        patientId: schema.appointments.patientId,
        doctorId: schema.appointments.doctorId,
        chairId: schema.appointments.chairId,
        status: schema.appointments.status,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.id, appointmentId)
        )
      )
      .limit(1);

    if (!appointment || !appointment.patientId) {
      throw new Error("Cannot check in appointment without a registered patient");
    }

    // 2. Fetch existing queue entry if any
    const [existingEntry] = await tx
      .select()
      .from(schema.queueEntries)
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.appointmentId, appointmentId)
        )
      )
      .limit(1);

    // If entry already has a serial number assigned today, preserve it
    if (existingEntry && existingEntry.serialNo && existingEntry.date === todayDhakaStr) {
      assignedSerial = existingEntry.serialNo;
      await tx
        .update(schema.queueEntries)
        .set({
          status: "waiting",
          checkedInAt: existingEntry.checkedInAt || new Date(),
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.queueEntries.id, existingEntry.id));
    } else {
      // 3. Collision-proof serial number: query existing max serial for today
      const [maxSerialRow] = await tx
        .select({
          maxSerial: sql<number>`COALESCE(MAX(${schema.queueEntries.serialNo}), 0)`,
        })
        .from(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.date, todayDhakaStr)
          )
        );

      const currentMax = Number(maxSerialRow?.maxSerial || 0);

      // Increment or initialize counter with floor at currentMax + 1
      const [counter] = await tx
        .insert(schema.tenantCounters)
        .values({
          tenantId: tenant.id,
          key: counterKey,
          nextValue: currentMax + 2,
        })
        .onConflictDoUpdate({
          target: [schema.tenantCounters.tenantId, schema.tenantCounters.key],
          set: {
            nextValue: sql`GREATEST(${schema.tenantCounters.nextValue} + 1, ${currentMax + 2})`,
          },
        })
        .returning();

      assignedSerial = Math.max(Number(counter.nextValue) - 1, currentMax + 1);

      // 4. Update or Insert queue entry
      if (existingEntry) {
        await tx
          .update(schema.queueEntries)
          .set({
            status: "waiting",
            serialNo: assignedSerial,
            queuePosition: assignedSerial,
            checkedInAt: new Date(),
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(schema.queueEntries.id, existingEntry.id));
      } else {
        await tx.insert(schema.queueEntries).values({
          tenantId: tenant.id,
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          chairId: appointment.chairId || null,
          date: todayDhakaStr,
          status: "waiting",
          serialNo: assignedSerial,
          queuePosition: assignedSerial,
          checkedInAt: new Date(),
          updatedBy: user.id,
          updatedAt: new Date(),
        });
      }
    }

    // 5. Keep appointment status synced (confirm it upon check-in if pending)
    if (appointment.status === "pending") {
      await tx
        .update(schema.appointments)
        .set({
          status: "confirmed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.appointments.tenantId, tenant.id),
            eq(schema.appointments.id, appointmentId)
          )
        );
    }
  });

  revalidatePath("/app/queue");
  revalidatePath("/app/appointments");
  revalidatePath("/app");

  return { success: true, serialNo: assignedSerial };
}

export async function advanceQueueStatusAction(
  queueEntryId: string,
  newStatus: (typeof schema.queueStatusEnum.enumValues)[number],
  chairId?: string
) {
  const { tenant, user } = await requireClinicStaff();

  const now = new Date();
  const updateData: Partial<typeof schema.queueEntries.$inferInsert> = {
    status: newStatus,
    updatedBy: user.id,
    updatedAt: now,
  };

  if (newStatus === "in_chair") {
    updateData.inChairAt = now;
    if (chairId) {
      updateData.chairId = chairId;
    }
  } else if (newStatus === "billing") {
    updateData.billingAt = now;
  } else if (newStatus === "done") {
    updateData.doneAt = now;
  }

  await db
    .update(schema.queueEntries)
    .set(updateData)
    .where(
      and(
        eq(schema.queueEntries.tenantId, tenant.id),
        eq(schema.queueEntries.id, queueEntryId)
      )
    );

  revalidatePath("/app/queue");

  return { success: true };
}

export async function callNextPatientAction(doctorId?: string, chairId?: string) {
  const { tenant, user } = await requireClinicStaff();
  const targetDocId = doctorId || user.id;

  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Find earliest waiting patient by assigned Serial Number (SL #1 before SL #2)
  const [nextPatient] = await db
    .select()
    .from(schema.queueEntries)
    .where(
      and(
        eq(schema.queueEntries.tenantId, tenant.id),
        eq(schema.queueEntries.date, todayDhakaStr),
        eq(schema.queueEntries.status, "waiting"),
        doctorId ? eq(schema.queueEntries.doctorId, targetDocId) : undefined
      )
    )
    .orderBy(schema.queueEntries.serialNo, schema.queueEntries.checkedInAt)
    .limit(1);

  if (nextPatient) {
    await advanceQueueStatusAction(nextPatient.id, "in_chair", chairId);
    return { success: true, patientId: nextPatient.patientId, serialNo: nextPatient.serialNo };
  }

  return { success: false, message: "No patients currently in Waiting status." };
}

export async function markNoShowAction(appointmentId: string) {
  const { tenant, user } = await requireClinicStaff();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.queueEntries)
      .set({
        status: "no_show",
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.appointmentId, appointmentId)
        )
      );

    await tx
      .update(schema.appointments)
      .set({
        status: "no_show",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.id, appointmentId)
        )
      );
  });

  revalidatePath("/app/queue");
  revalidatePath("/app/appointments");
  return { success: true };
}

export async function cancelQueueBookingAction(appointmentId: string) {
  const { tenant, user } = await requireClinicStaff();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.queueEntries)
      .set({
        status: "cancelled",
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.appointmentId, appointmentId)
        )
      );

    await tx
      .update(schema.appointments)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.id, appointmentId)
        )
      );
  });

  revalidatePath("/app/queue");
  revalidatePath("/app/appointments");
  return { success: true };
}

export async function revertToBookedAction(appointmentId: string) {
  const { tenant, user } = await requireClinicStaff();

  await db.transaction(async (tx) => {
    // 1. Reset queue entry to booked, clearing any serial number
    await tx
      .update(schema.queueEntries)
      .set({
        status: "booked",
        serialNo: null,
        queuePosition: 0,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.appointmentId, appointmentId)
        )
      );

    // 2. Set appointment status back to confirmed
    await tx
      .update(schema.appointments)
      .set({
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.id, appointmentId)
        )
      );
  });

  revalidatePath("/app/queue");
  revalidatePath("/app/appointments");
  return { success: true };
}

export interface QueueItem {
  id: string;
  appointmentId: string;
  status: "booked" | "waiting" | "in_chair" | "billing" | "done" | "no_show" | "cancelled";
  serialNo: number | null;
  chairId?: string | null;
  chairName?: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientCard: string;
  allergyFlags: string[];
  doctorId: string;
  doctorName: string;
  startTime: string;
  startTimeRaw?: string;
}

export async function fetchTodayQueueItems(tenantId: string): Promise<QueueItem[]> {
  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 1. Auto-sync any confirmed/pending appointments scheduled for today into queueEntries
  const dayStart = new Date(`${todayDhakaStr}T00:00:00+06:00`);
  const dayEnd = new Date(`${todayDhakaStr}T23:59:59.999+06:00`);

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
        eq(schema.appointments.tenantId, tenantId),
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
          eq(schema.queueEntries.tenantId, tenantId),
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
          tenantId: tenantId,
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

  // 2. Fetch all queue entries for today joined with appointments, patients, doctors, and chairs
  const entries = await db
    .select({
      id: schema.queueEntries.id,
      appointmentId: schema.queueEntries.appointmentId,
      status: schema.queueEntries.status,
      serialNo: schema.queueEntries.serialNo,
      chairId: schema.queueEntries.chairId,
      chairName: schema.chairs.name,
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
    .leftJoin(
      schema.chairs,
      eq(schema.queueEntries.chairId, schema.chairs.id)
    )
    .where(
      and(
        eq(schema.queueEntries.tenantId, tenantId),
        eq(schema.queueEntries.date, todayDhakaStr)
      )
    )
    .orderBy(schema.appointments.startTime);

  // Auto-heal any checked-in active entries that might be missing a serial number
  const unassignedActive = entries.filter(
    (e) =>
      e.status !== "booked" &&
      e.status !== "cancelled" &&
      e.status !== "no_show" &&
      (e.serialNo === null || e.serialNo <= 0)
  );

  if (unassignedActive.length > 0) {
    let currentMax = Math.max(
      ...entries.map((e) => Number(e.serialNo) || 0),
      0
    );

    for (const item of unassignedActive) {
      currentMax += 1;
      item.serialNo = currentMax;
      await db
        .update(schema.queueEntries)
        .set({
          serialNo: currentMax,
          queuePosition: currentMax,
          updatedAt: new Date(),
        })
        .where(eq(schema.queueEntries.id, item.id));
    }

    const counterKey = `SERIAL:${todayDhakaStr}`;
    await db
      .insert(schema.tenantCounters)
      .values({
        tenantId,
        key: counterKey,
        nextValue: currentMax + 1,
      })
      .onConflictDoUpdate({
        target: [schema.tenantCounters.tenantId, schema.tenantCounters.key],
        set: {
          nextValue: sql`GREATEST(${schema.tenantCounters.nextValue}, ${currentMax + 1})`,
        },
      });
  }

  return entries.map((e) => ({
    id: e.id,
    appointmentId: e.appointmentId,
    status: e.status,
    serialNo: e.serialNo,
    chairId: e.chairId,
    chairName: e.chairName || null,
    patientId: e.patientId,
    patientName: e.patientName,
    patientPhone: e.patientPhone,
    patientCard: e.patientCard,
    allergyFlags: e.allergyFlags || [],
    doctorId: e.doctorId,
    doctorName: e.doctorName,
    startTime: formatDhakaTime(e.startTime),
    startTimeRaw: e.startTime.toISOString(),
  }));
}

export async function getLiveQueueItemsAction(): Promise<QueueItem[]> {
  const { tenant } = await requireClinicStaff();
  return fetchTodayQueueItems(tenant.id);
}

export async function getPublicQueueDataAction(tenantSlug: string): Promise<{
  success: boolean;
  tenant?: { id: string; name: string; brandColor: string | null };
  items?: QueueItem[];
  error?: string;
}> {
  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      brandColor: schema.tenants.brandColor,
    })
    .from(schema.tenants)
    .where(
      and(
        eq(schema.tenants.slug, tenantSlug.toLowerCase().trim()),
        eq(schema.tenants.status, "active")
      )
    )
    .limit(1);

  if (!tenant) {
    return { success: false, error: "Clinic not found or inactive" };
  }

  const items = await fetchTodayQueueItems(tenant.id);
  // Privacy sanitization for public display screen
  const sanitizedItems = items.map((i) => ({
    ...i,
    patientPhone: i.patientPhone
      ? `${i.patientPhone.slice(0, 3)}****${i.patientPhone.slice(-4)}`
      : "",
    allergyFlags: [],
  }));

  return {
    success: true,
    tenant,
    items: sanitizedItems,
  };
}

