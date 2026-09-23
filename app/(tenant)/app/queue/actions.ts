"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";

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
    // 1. Get or create daily serial counter
    const [counter] = await tx
      .insert(schema.tenantCounters)
      .values({
        tenantId: tenant.id,
        key: counterKey,
        nextValue: 2, // will use 1 for first
      })
      .onConflictDoUpdate({
        target: [schema.tenantCounters.tenantId, schema.tenantCounters.key],
        set: {
          nextValue: sql`${schema.tenantCounters.nextValue} + 1`,
        },
      })
      .returning();

    assignedSerial = counter.nextValue - 1;

    // 2. Update queue entry
    await tx
      .update(schema.queueEntries)
      .set({
        status: "waiting",
        serialNo: assignedSerial,
        checkedInAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.appointmentId, appointmentId)
        )
      );
  });

  revalidatePath("/app/queue");
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
  revalidatePath("/app");

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

  // Find earliest waiting patient for this doctor (or any doctor if unspecified)
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
    .orderBy(schema.queueEntries.queuePosition, schema.queueEntries.serialNo)
    .limit(1);

  if (nextPatient) {
    await advanceQueueStatusAction(nextPatient.id, "in_chair", chairId);
    return { success: true, patientId: nextPatient.patientId, serialNo: nextPatient.serialNo };
  }

  return { success: false, message: "No patients currently in Waiting status." };
}
