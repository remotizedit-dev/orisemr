"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import {
  generateAutoCardNumber,
  getDoctorPrefixLetter,
  formatDoctorSerialCode,
} from "@/lib/barcode/codes";
import { formatDhakaTime, normalizeBdPhone } from "@/lib/utils";
import { getOrSetCache, deleteCache } from "@/lib/cache";

export async function checkInPatientAction(appointmentId: string) {
  const { tenant, user } = await requireClinicStaff();

  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  let assignedSerial = 1;
  let assignedSerialCode = "A-01";

  await db.transaction(async (tx) => {
    // 1. Fetch appointment details to verify and support upsert
    const [appointment] = await tx
      .select({
        id: schema.appointments.id,
        patientId: schema.appointments.patientId,
        pendingPatientName: schema.appointments.pendingPatientName,
        pendingPatientPhone: schema.appointments.pendingPatientPhone,
        pendingPatientEmail: schema.appointments.pendingPatientEmail,
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

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Resolve or auto-register patient if patientId is null (e.g. pending online booking)
    let resolvedPatientId = appointment.patientId;

    if (!resolvedPatientId) {
      const normalizedPhone = normalizeBdPhone(appointment.pendingPatientPhone || "") || appointment.pendingPatientPhone;

      if (normalizedPhone) {
        const [existingPatient] = await tx
          .select({ id: schema.patients.id })
          .from(schema.patients)
          .where(
            and(
              eq(schema.patients.tenantId, tenant.id),
              eq(schema.patients.phone, normalizedPhone)
            )
          )
          .limit(1);

        if (existingPatient) {
          resolvedPatientId = existingPatient.id;
        }
      }

      if (!resolvedPatientId) {
        const [pCounter] = await tx
          .insert(schema.tenantCounters)
          .values({
            tenantId: tenant.id,
            key: "PATIENT",
            nextValue: 2,
          })
          .onConflictDoUpdate({
            target: [schema.tenantCounters.tenantId, schema.tenantCounters.key],
            set: {
              nextValue: sql`${schema.tenantCounters.nextValue} + 1`,
            },
          })
          .returning();

        const pSeq = pCounter ? pCounter.nextValue - 1 : 1;
        const autoCard = generateAutoCardNumber(pSeq, tenant.patientIdMinLen || 6);

        const [newPatient] = await tx
          .insert(schema.patients)
          .values({
            tenantId: tenant.id,
            cardNumber: autoCard,
            name: (appointment.pendingPatientName || "Walk-in Patient").trim(),
            phone: normalizedPhone || "01700000000",
            email: appointment.pendingPatientEmail?.trim() || null,
            gender: "other",
            createdBy: user.id,
          })
          .returning({ id: schema.patients.id });

        resolvedPatientId = newPatient.id;
      }

      // Link resolved patient back to appointment
      await tx
        .update(schema.appointments)
        .set({
          patientId: resolvedPatientId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.appointments.tenantId, tenant.id),
            eq(schema.appointments.id, appointmentId)
          )
        );
    }

    // Resolve doctor prefix letter based on doctor index in clinic
    const clinicDoctors = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenant.id),
          eq(schema.users.isDoctor, true)
        )
      )
      .orderBy(schema.users.createdAt);

    const docIndex = clinicDoctors.findIndex((d) => d.id === appointment.doctorId);
    const prefixLetter = getDoctorPrefixLetter(docIndex >= 0 ? docIndex : 0);
    const counterKey = `SERIAL:${todayDhakaStr}:${appointment.doctorId || "general"}`;

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
      assignedSerialCode =
        existingEntry.serialCode ||
        formatDoctorSerialCode(prefixLetter, assignedSerial);

      await tx
        .update(schema.queueEntries)
        .set({
          status: "waiting",
          patientId: resolvedPatientId,
          doctorId: appointment.doctorId,
          chairId: appointment.chairId || null,
          date: todayDhakaStr,
          serialCode: assignedSerialCode,
          checkedInAt: existingEntry.checkedInAt || new Date(),
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.queueEntries.id, existingEntry.id));
    } else {
      // 3. Collision-proof serial number: query existing max serial for this doctor today
      const [maxSerialRow] = await tx
        .select({
          maxSerial: sql<number>`COALESCE(MAX(${schema.queueEntries.serialNo}), 0)`,
        })
        .from(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.date, todayDhakaStr),
            eq(schema.queueEntries.doctorId, appointment.doctorId)
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
      assignedSerialCode = formatDoctorSerialCode(prefixLetter, assignedSerial);

      // 4. Update or Insert queue entry
      if (existingEntry) {
        await tx
          .update(schema.queueEntries)
          .set({
            status: "waiting",
            patientId: resolvedPatientId,
            doctorId: appointment.doctorId,
            chairId: appointment.chairId || null,
            date: todayDhakaStr,
            serialNo: assignedSerial,
            serialCode: assignedSerialCode,
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
          patientId: resolvedPatientId,
          doctorId: appointment.doctorId,
          chairId: appointment.chairId || null,
          date: todayDhakaStr,
          status: "waiting",
          serialNo: assignedSerial,
          serialCode: assignedSerialCode,
          queuePosition: assignedSerial,
          checkedInAt: new Date(),
          updatedBy: user.id,
          updatedAt: new Date(),
        });
      }
    }

    // 5. Keep appointment status synced (confirm it upon check-in if pending or not yet confirmed)
    if (appointment.status === "pending") {
      await tx
        .update(schema.appointments)
        .set({
          status: "confirmed",
          patientId: resolvedPatientId,
          confirmedBy: user.id,
          confirmedAt: new Date(),
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

  await deleteCache(`queue:today:${tenant.id}`);

  revalidatePath("/app/queue");
  revalidatePath("/app/appointments");
  revalidatePath("/app");

  return { success: true, serialNo: assignedSerial, serialCode: assignedSerialCode };
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
      // Issue 12: Check if this chair is already occupied by another patient
      const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);

      const [busyEntry] = await db
        .select({
          patientName: schema.patients.name,
          chairName: schema.chairs.name,
        })
        .from(schema.queueEntries)
        .innerJoin(schema.patients, eq(schema.queueEntries.patientId, schema.patients.id))
        .leftJoin(schema.chairs, eq(schema.queueEntries.chairId, schema.chairs.id))
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.date, todayDhakaStr),
            eq(schema.queueEntries.status, "in_chair"),
            eq(schema.queueEntries.chairId, chairId),
            sql`${schema.queueEntries.id} != ${queueEntryId}`
          )
        )
        .limit(1);

      if (busyEntry) {
        throw new Error(
          `${busyEntry.chairName || "Dental Chair"} is already occupied by ${busyEntry.patientName}. Please select an empty chair or complete the current visit first.`
        );
      }
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

  if (newStatus === "done") {
    const [entry] = await db
      .select({ appointmentId: schema.queueEntries.appointmentId })
      .from(schema.queueEntries)
      .where(eq(schema.queueEntries.id, queueEntryId))
      .limit(1);

    if (entry?.appointmentId) {
      await db
        .update(schema.appointments)
        .set({
          status: "completed",
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.appointments.tenantId, tenant.id),
            eq(schema.appointments.id, entry.appointmentId)
          )
        );
      revalidatePath("/app/appointments");
    }
  }

  await deleteCache(`queue:today:${tenant.id}`);

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

  // Issue 12: If chairId is provided, check if it's occupied. If so, try to find another vacant chair.
  let assignedChairId = chairId;
  if (assignedChairId) {
    const [busy] = await db
      .select({ id: schema.queueEntries.id })
      .from(schema.queueEntries)
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.date, todayDhakaStr),
          eq(schema.queueEntries.status, "in_chair"),
          eq(schema.queueEntries.chairId, assignedChairId)
        )
      )
      .limit(1);

    if (busy) {
      // Find another available chair in the clinic
      const clinicChairs = await db
        .select({ id: schema.chairs.id })
        .from(schema.chairs)
        .where(
          and(
            eq(schema.chairs.tenantId, tenant.id),
            eq(schema.chairs.isActive, true)
          )
        )
        .orderBy(schema.chairs.sortOrder);

      const busyEntries = await db
        .select({ chairId: schema.queueEntries.chairId })
        .from(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.date, todayDhakaStr),
            eq(schema.queueEntries.status, "in_chair")
          )
        );

      const busyChairIds = new Set(busyEntries.map((e) => e.chairId).filter(Boolean));
      const vacantChair = clinicChairs.find((c) => !busyChairIds.has(c.id));

      if (vacantChair) {
        assignedChairId = vacantChair.id;
      } else if (clinicChairs.length > 0) {
        return {
          success: false,
          message: "All dental chairs are currently occupied. Please complete or bill a patient before calling next.",
        };
      }
    }
  }

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
    try {
      await advanceQueueStatusAction(nextPatient.id, "in_chair", assignedChairId);
      return {
        success: true,
        patientId: nextPatient.patientId,
        serialNo: nextPatient.serialNo,
        serialCode: nextPatient.serialCode,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || "Failed to assign patient to chair." };
    }
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

  await deleteCache(`queue:today:${tenant.id}`);

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

  await deleteCache(`queue:today:${tenant.id}`);

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

  await deleteCache(`queue:today:${tenant.id}`);

  revalidatePath("/app/queue");
  revalidatePath("/app/appointments");
  return { success: true };
}

export async function reassignQueueDoctorAction(
  queueEntryId: string,
  newDoctorId: string
) {
  const { tenant, user } = await requireClinicStaff();

  // 1. Verify queue entry exists in tenant
  const [entry] = await db
    .select({
      id: schema.queueEntries.id,
      appointmentId: schema.queueEntries.appointmentId,
      patientId: schema.queueEntries.patientId,
      serialNo: schema.queueEntries.serialNo,
    })
    .from(schema.queueEntries)
    .where(
      and(
        eq(schema.queueEntries.tenantId, tenant.id),
        eq(schema.queueEntries.id, queueEntryId)
      )
    )
    .limit(1);

  if (!entry) {
    throw new Error("Queue entry not found");
  }

  // 2. Verify new doctor is active in clinic
  const [doctor] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.id, newDoctorId),
        eq(schema.users.isDoctor, true),
        eq(schema.users.status, "active")
      )
    )
    .limit(1);

  if (!doctor) {
    throw new Error("Target doctor was not found or is disabled");
  }

  // 3. Atomically update queueEntry, appointment, and patient record
  await db.transaction(async (tx) => {
    if (entry.serialNo) {
      const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const clinicDoctors = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.tenantId, tenant.id),
            eq(schema.users.isDoctor, true)
          )
        )
        .orderBy(schema.users.createdAt);

      const docIndex = clinicDoctors.findIndex((d) => d.id === newDoctorId);
      const prefixLetter = getDoctorPrefixLetter(docIndex >= 0 ? docIndex : 0);

      const [maxSerialRow] = await tx
        .select({
          maxSerial: sql<number>`COALESCE(MAX(${schema.queueEntries.serialNo}), 0)`,
        })
        .from(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.date, todayDhakaStr),
            eq(schema.queueEntries.doctorId, newDoctorId)
          )
        );

      const assignedNum = Number(maxSerialRow?.maxSerial || 0) + 1;
      const assignedCode = formatDoctorSerialCode(prefixLetter, assignedNum);

      await tx
        .update(schema.queueEntries)
        .set({
          doctorId: newDoctorId,
          serialNo: assignedNum,
          serialCode: assignedCode,
          queuePosition: assignedNum,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.queueEntries.id, entry.id));
    } else {
      await tx
        .update(schema.queueEntries)
        .set({
          doctorId: newDoctorId,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.queueEntries.id, entry.id));
    }

    await tx
      .update(schema.appointments)
      .set({
        doctorId: newDoctorId,
        updatedAt: new Date(),
      })
      .where(eq(schema.appointments.id, entry.appointmentId));

    await tx
      .update(schema.patients)
      .set({
        assignedDoctorId: newDoctorId,
        updatedAt: new Date(),
      })
      .where(eq(schema.patients.id, entry.patientId));
  });

  await deleteCache(`queue:today:${tenant.id}`);

  revalidatePath("/app/queue");
  revalidatePath("/app/appointments");
  revalidatePath("/app/patients");
  revalidatePath(`/app/patients/${entry.patientId}`);

  return {
    success: true,
    doctorId: newDoctorId,
    doctorName: doctor.name,
  };
}

export interface QueueItem {
  id: string;
  appointmentId: string;
  status: "booked" | "waiting" | "in_chair" | "billing" | "done" | "no_show" | "cancelled";
  serialNo: number | null;
  serialCode?: string | null;
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
  endTimeRaw?: string;
  inChairAt?: string | null;
  estimatedDurationMinutes?: number;
  serviceNames?: string[];
}

export async function fetchTodayQueueItems(tenantId: string): Promise<QueueItem[]> {
  return getOrSetCache(
    `queue:today:${tenantId}`,
    async () => {
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
          serialCode: schema.queueEntries.serialCode,
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
          endTime: schema.appointments.endTime,
          inChairAt: schema.queueEntries.inChairAt,
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

      // Auto-heal any checked-in active entries that might be missing a serial number or serialCode
      const clinicDoctors = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.tenantId, tenantId),
            eq(schema.users.isDoctor, true)
          )
        )
        .orderBy(schema.users.createdAt);

      const docIndexMap = new Map(clinicDoctors.map((d, idx) => [d.id, idx]));

      for (const item of entries) {
        if (
          item.status !== "booked" &&
          item.status !== "cancelled" &&
          item.status !== "no_show"
        ) {
          const docIdx = docIndexMap.get(item.doctorId) ?? 0;
          const prefix = getDoctorPrefixLetter(docIdx);

          if (item.serialNo === null || item.serialNo <= 0) {
            const docSerials = entries
              .filter((e) => e.doctorId === item.doctorId && e.serialNo && e.serialNo > 0)
              .map((e) => Number(e.serialNo));
            const currentMax = docSerials.length > 0 ? Math.max(...docSerials) : 0;
            const assigned = currentMax + 1;
            const code = formatDoctorSerialCode(prefix, assigned);
            item.serialNo = assigned;
            item.serialCode = code;

            await db
              .update(schema.queueEntries)
              .set({
                serialNo: assigned,
                serialCode: code,
                queuePosition: assigned,
                updatedAt: new Date(),
              })
              .where(eq(schema.queueEntries.id, item.id));
          } else if (!item.serialCode) {
            const code = formatDoctorSerialCode(prefix, item.serialNo);
            item.serialCode = code;
            await db
              .update(schema.queueEntries)
              .set({
                serialCode: code,
                updatedAt: new Date(),
              })
              .where(eq(schema.queueEntries.id, item.id));
          }
        }
      }

      // Fetch booked services for all today's queue appointments to get planned duration
      const aptIds = entries.map((e) => e.appointmentId).filter(Boolean);
      const servicesMap: Record<string, { serviceName: string; durationMinutes: number }[]> = {};

      if (aptIds.length > 0) {
        const servicesRows = await db
          .select({
            appointmentId: schema.appointmentServices.appointmentId,
            serviceName: schema.appointmentServices.serviceNameSnapshot,
            durationMinutes: schema.appointmentServices.durationMinutesSnapshot,
          })
          .from(schema.appointmentServices)
          .where(
            and(
              eq(schema.appointmentServices.tenantId, tenantId),
              inArray(schema.appointmentServices.appointmentId, aptIds)
            )
          )
          .orderBy(schema.appointmentServices.sortOrder);

        for (const s of servicesRows) {
          if (!servicesMap[s.appointmentId]) {
            servicesMap[s.appointmentId] = [];
          }
          servicesMap[s.appointmentId].push({
            serviceName: s.serviceName,
            durationMinutes: s.durationMinutes,
          });
        }
      }

      return entries.map((e) => {
        const itemServices = servicesMap[e.appointmentId] || [];
        const totalServiceMins = itemServices.reduce((acc, s) => acc + s.durationMinutes, 0);
        const plannedDuration = totalServiceMins > 0
          ? totalServiceMins
          : Math.max(10, Math.round((e.endTime.getTime() - e.startTime.getTime()) / 60000)) || 20;

        return {
          id: e.id,
          appointmentId: e.appointmentId,
          status: e.status,
          serialNo: e.serialNo,
          serialCode: e.serialCode || (e.serialNo ? String(e.serialNo) : null),
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
          endTimeRaw: e.endTime.toISOString(),
          inChairAt: e.inChairAt ? e.inChairAt.toISOString() : null,
          estimatedDurationMinutes: plannedDuration,
          serviceNames: itemServices.map((s) => s.serviceName),
        };
      });
    },
    3 // 3-second cache TTL to coalesce rapid polling into single DB queries
  );
}

export async function getLiveQueueItemsAction(): Promise<QueueItem[]> {
  const { tenant } = await requireClinicStaff();
  return fetchTodayQueueItems(tenant.id);
}

export async function getPublicQueueDataAction(
  tenantSlug: string,
  key?: string
): Promise<{
  success: boolean;
  tenant?: { id: string; name: string; brandColor: string | null };
  items?: QueueItem[];
  error?: string;
}> {
  const cleanSlug = tenantSlug.toLowerCase().trim();

  // Cache public tenant metadata for 5 minutes (300s) to eliminate repetitive DB queries
  const tenant = await getOrSetCache(
    `tenant:public:${cleanSlug}`,
    async () => {
      const [t] = await db
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          brandColor: schema.tenants.brandColor,
          tvDisplaySecret: schema.tenants.tvDisplaySecret,
        })
        .from(schema.tenants)
        .where(
          and(
            eq(schema.tenants.slug, cleanSlug),
            eq(schema.tenants.status, "active")
          )
        )
        .limit(1);
      return t || null;
    },
    300
  );

  if (!tenant) {
    return { success: false, error: "Clinic not found or inactive" };
  }

  // Validate secret key for public queue monitor
  if (!key || !tenant.tvDisplaySecret || key !== tenant.tvDisplaySecret) {
    return { success: false, error: "Unauthorized TV display key" };
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

export async function resetTvSecretAction(): Promise<{
  success: boolean;
  newSecret?: string;
  tvUrl?: string;
  error?: string;
}> {
  try {
    const { tenant } = await requireClinicStaff();
    const crypto = await import("crypto");
    const newSecret = crypto.randomBytes(12).toString("hex");

    await db
      .update(schema.tenants)
      .set({
        tvDisplaySecret: newSecret,
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenant.id));

    await deleteCache(`tenant:public:${tenant.slug}`);
    await deleteCache(`tenant:details:${tenant.id}`);

    return {
      success: true,
      newSecret,
      tvUrl: `/display/${tenant.slug}?key=${newSecret}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reset TV secret key" };
  }
}

export async function reorderWaitingQueueAction(orderedItemIds: string[]) {
  try {
    const { tenant } = await requireClinicStaff();
    if (!orderedItemIds || orderedItemIds.length <= 1) return { success: true };

    const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    await db.transaction(async (tx) => {
      // 1. Fetch current waiting entries for these IDs in this tenant today
      const currentEntries = await tx
        .select({
          id: schema.queueEntries.id,
          serialNo: schema.queueEntries.serialNo,
          serialCode: schema.queueEntries.serialCode,
          doctorId: schema.queueEntries.doctorId,
        })
        .from(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.date, todayDhakaStr),
            eq(schema.queueEntries.status, "waiting"),
            inArray(schema.queueEntries.id, orderedItemIds)
          )
        );

      if (currentEntries.length <= 1) return;

      const clinicDoctors = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.tenantId, tenant.id),
            eq(schema.users.isDoctor, true)
          )
        )
        .orderBy(schema.users.createdAt);

      const docIndexMap = new Map(clinicDoctors.map((d, idx) => [d.id, idx]));
      const entryMap = new Map(currentEntries.map((e) => [e.id, e]));

      // Map existing entry serials
      const validSerials = currentEntries
        .map((e) => e.serialNo)
        .filter((s): s is number => s !== null && s > 0)
        .sort((a, b) => a - b);

      // If any items are missing serials, generate contiguous numbers
      let nextSerial = validSerials.length > 0 ? Math.max(...validSerials) : 0;
      while (validSerials.length < orderedItemIds.length) {
        nextSerial += 1;
        validSerials.push(nextSerial);
      }

      // Reassign serials in the exact orderedItemIds sequence
      for (let i = 0; i < orderedItemIds.length; i++) {
        const entryId = orderedItemIds[i];
        const newSerial = validSerials[i];
        const entry = entryMap.get(entryId);
        const docIdx = entry?.doctorId ? (docIndexMap.get(entry.doctorId) ?? 0) : 0;
        const prefix = getDoctorPrefixLetter(docIdx);
        const newSerialCode = formatDoctorSerialCode(prefix, newSerial);

        await tx
          .update(schema.queueEntries)
          .set({
            serialNo: newSerial,
            serialCode: newSerialCode,
            queuePosition: newSerial,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.queueEntries.tenantId, tenant.id),
              eq(schema.queueEntries.id, entryId)
            )
          );
      }
    });

    await deleteCache(`queue:today:${tenant.id}`);
    revalidatePath("/app/queue");
    revalidatePath("/display/[tenantSlug]");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to reorder waiting queue:", err);
    return { success: false, error: err.message || "Failed to reorder waiting queue" };
  }
}


