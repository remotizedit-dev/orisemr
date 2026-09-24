"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import {
  calculateAvailableSlots,
  type CandidateDoctor,
} from "@/lib/scheduling/slot-engine";
import { generateRecordCode } from "@/lib/barcode/codes";
import { sendEmail, renderAppointmentConfirmationHtml } from "@/lib/email/mailer";
import { formatDhakaDate } from "@/lib/utils";

export interface GetStaffSlotsInput {
  dateStr: string; // YYYY-MM-DD
  durationMinutes: number;
  doctorId?: string; // specific doctor ID or "any"
}

export async function getStaffSlotsAction(input: GetStaffSlotsInput) {
  const { tenant } = await requireClinicStaff();
  const { dateStr, durationMinutes, doctorId = "any" } = input;

  if (!dateStr || durationMinutes <= 0) {
    return { slots: [] };
  }

  // Parse target date and weekday in UTC
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = targetDate.getUTCDay();

  // 1. Fetch clinic working hours for weekday
  const clinicHours = await db
    .select()
    .from(schema.tenantWorkingHours)
    .where(
      and(
        eq(schema.tenantWorkingHours.tenantId, tenant.id),
        eq(schema.tenantWorkingHours.weekday, weekday)
      )
    );

  // 2. Fetch candidate doctors
  const doctors = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.isDoctor, true),
        eq(schema.users.status, "active")
      )
    );

  const candidates: CandidateDoctor[] = [];

  for (const doc of doctors) {
    // Check personal schedule
    const personalSchedules = await db
      .select()
      .from(schema.doctorSchedules)
      .where(
        and(
          eq(schema.doctorSchedules.tenantId, tenant.id),
          eq(schema.doctorSchedules.doctorId, doc.id),
          eq(schema.doctorSchedules.weekday, weekday)
        )
      );

    const windows =
      personalSchedules.length > 0
        ? personalSchedules.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        : clinicHours.map((h) => ({
            startTime: h.startTime,
            endTime: h.endTime,
          }));

    // Fetch existing appointments on this date
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    const existingAppointments = await db
      .select({
        startTime: schema.appointments.startTime,
        endTime: schema.appointments.endTime,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.doctorId, doc.id),
          sql`${schema.appointments.status} NOT IN ('cancelled', 'no_show')`,
          sql`${schema.appointments.startTime} >= ${dayStart.toISOString()}`,
          sql`${schema.appointments.startTime} <= ${dayEnd.toISOString()}`
        )
      );

    candidates.push({
      doctorId: doc.id,
      doctorName: doc.name,
      sortOrder: 0,
      appointmentCountToday: existingAppointments.length,
      windows,
      busyIntervals: existingAppointments.map((a) => ({
        startTime: new Date(a.startTime),
        endTime: new Date(a.endTime),
      })),
    });
  }

  const slots = calculateAvailableSlots({
    date: dateStr,
    totalDurationMinutes: durationMinutes,
    slotGranularityMinutes: 10,
    bookingBufferMinutes: tenant.bookingBufferMinutes ?? 0,
    minLeadMinutes: 0, // Staff can book immediate slots
    referenceTime: new Date(),
    selectedDoctorId: doctorId,
    candidates,
  });

  return {
    slots: slots.map((s) => ({
      time: s.time,
      displayTime: s.displayTime,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      doctorId: s.doctorId,
    })),
  };
}

export interface CreateStaffAppointmentInput {
  patientId: string;
  doctorId: string;
  chairId?: string;
  dateStr: string; // YYYY-MM-DD
  startTime: string; // ISO string
  endTime: string; // ISO string
  serviceIds: string[];
  isOverbooked?: boolean;
  notes?: string;
}

export async function createStaffAppointmentAction(input: CreateStaffAppointmentInput) {
  const { tenant, user } = await requireClinicStaff();

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new Error("Invalid appointment start or end time.");
  }

  // Check overlap if not explicitly overbooked
  if (!input.isOverbooked) {
    const overlapping = await db
      .select({ id: schema.appointments.id })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.doctorId, input.doctorId),
          sql`${schema.appointments.status} NOT IN ('cancelled', 'no_show')`,
          sql`${schema.appointments.startTime} < ${end.toISOString()}`,
          sql`${schema.appointments.endTime} > ${start.toISOString()}`
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      return {
        error: "OVERLAP",
        message: "This slot overlaps with an existing appointment for this doctor. Overbook to proceed anyway?",
      };
    }
  }

  // Fetch selected services
  const selectedServices = await db
    .select()
    .from(schema.services)
    .where(
      and(
        eq(schema.services.tenantId, tenant.id),
        inArray(schema.services.id, input.serviceIds)
      )
    );

  const newAppointmentId = await db.transaction(async (tx) => {
    // Increment appointment counter
    const [counter] = await tx
      .insert(schema.tenantCounters)
      .values({
        tenantId: tenant.id,
        key: "APT",
        nextValue: 2,
      })
      .onConflictDoUpdate({
        target: [schema.tenantCounters.tenantId, schema.tenantCounters.key],
        set: {
          nextValue: sql`${schema.tenantCounters.nextValue} + 1`,
        },
      })
      .returning();

    const seq = counter ? counter.nextValue - 1 : 1;
    const appointmentCode = generateRecordCode("APT", tenant.shortCode, seq);

    // Insert appointment
    const [created] = await tx
      .insert(schema.appointments)
      .values({
        tenantId: tenant.id,
        appointmentCode,
        patientId: input.patientId,
        doctorId: input.doctorId,
        chairId: input.chairId || null,
        startTime: start,
        endTime: end,
        status: "confirmed",
        source: "staff",
        isOverbooked: input.isOverbooked ?? false,
        notes: input.notes || null,
        createdBy: user.id,
      })
      .returning({ id: schema.appointments.id });

    // Insert appointment_services snapshots
    let sortOrder = 0;
    for (const s of selectedServices) {
      await tx.insert(schema.appointmentServices).values({
        tenantId: tenant.id,
        appointmentId: created.id,
        serviceId: s.id,
        serviceNameSnapshot: s.name,
        durationMinutesSnapshot: s.durationMinutes,
        priceBdtSnapshot: s.priceBdt,
        toothCodes: [],
        sortOrder: sortOrder++,
      });
    }

    // If appointment is for today (Asia/Dhaka), automatically add to queueEntries
    const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (input.dateStr === todayDhakaStr) {
      // Find max serial for today
      const maxSerialResult = await tx
        .select({ maxSerial: sql<number>`COALESCE(MAX(${schema.queueEntries.serialNo}), 0)` })
        .from(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.date, todayDhakaStr)
          )
        );

      const nextSerial = (Number(maxSerialResult[0]?.maxSerial) || 0) + 1;

      await tx.insert(schema.queueEntries).values({
        tenantId: tenant.id,
        appointmentId: created.id,
        patientId: input.patientId,
        doctorId: input.doctorId,
        chairId: input.chairId || null,
        date: todayDhakaStr,
        status: "booked",
        serialNo: nextSerial,
        queuePosition: nextSerial,
      });
    }

    return created.id;
  });

  // Dispatch confirmation email asynchronously if patient email is available
  try {
    const [patient] = await db
      .select({ name: schema.patients.name, email: schema.patients.email })
      .from(schema.patients)
      .where(eq(schema.patients.id, input.patientId))
      .limit(1);

    if (patient?.email) {
      const [assignedDoctor] = await db
        .select({ name: schema.users.name, title: schema.users.doctorTitle })
        .from(schema.users)
        .where(eq(schema.users.id, input.doctorId))
        .limit(1);

      const [aptRecord] = await db
        .select({ appointmentCode: schema.appointments.appointmentCode })
        .from(schema.appointments)
        .where(eq(schema.appointments.id, newAppointmentId))
        .limit(1);

      const docName = assignedDoctor
        ? `${assignedDoctor.title || "Dr."} ${assignedDoctor.name}`
        : "Dental Surgeon";

      await sendEmail({
        to: patient.email.trim(),
        subject: `Appointment Confirmed - ${tenant.name} (${aptRecord?.appointmentCode})`,
        html: renderAppointmentConfirmationHtml({
          patientName: patient.name,
          doctorName: docName,
          clinicName: tenant.name,
          clinicAddress: tenant.address || undefined,
          clinicPhone: tenant.phone || undefined,
          displayTime: `${input.dateStr} from ${formatDhakaDate(start, "hh:mm a")} to ${formatDhakaDate(end, "hh:mm a")}`,
          appointmentCode: aptRecord?.appointmentCode || "APT",
          isConfirmed: true,
        }),
      });
    }
  } catch (err) {
    console.warn("Notice: could not send staff appointment confirmation email:", err);
  }

  revalidatePath("/app/appointments");
  revalidatePath("/app/queue");
  revalidatePath("/app");

  return { success: true, appointmentId: newAppointmentId };
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  newStatus: (typeof schema.appointmentStatusEnum.enumValues)[number],
  cancelReason?: string
) {
  const { tenant, user } = await requireClinicStaff();

  await db.transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === "cancelled" && cancelReason) {
      updateData.cancelReason = cancelReason;
    }

    if (newStatus === "confirmed") {
      updateData.confirmedBy = user.id;
      updateData.confirmedAt = new Date();
    }

    await tx
      .update(schema.appointments)
      .set(updateData)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.id, appointmentId)
        )
      );

    // Sync queue entry if exists
    if (newStatus === "cancelled" || newStatus === "no_show") {
      await tx
        .delete(schema.queueEntries)
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.appointmentId, appointmentId)
          )
        );
    } else if (newStatus === "completed") {
      await tx
        .update(schema.queueEntries)
        .set({
          status: "done",
          doneAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.queueEntries.tenantId, tenant.id),
            eq(schema.queueEntries.appointmentId, appointmentId)
          )
        );
    }
  });

  if (newStatus === "confirmed") {
    try {
      const [apt] = await db
        .select({
          code: schema.appointments.appointmentCode,
          startTime: schema.appointments.startTime,
          patientName: schema.patients.name,
          patientEmail: schema.patients.email,
          docName: schema.users.name,
          docTitle: schema.users.doctorTitle,
        })
        .from(schema.appointments)
        .innerJoin(
          schema.patients,
          eq(schema.appointments.patientId, schema.patients.id)
        )
        .innerJoin(
          schema.users,
          eq(schema.appointments.doctorId, schema.users.id)
        )
        .where(
          and(
            eq(schema.appointments.tenantId, tenant.id),
            eq(schema.appointments.id, appointmentId)
          )
        )
        .limit(1);

      if (apt?.patientEmail) {
        await sendEmail({
          to: apt.patientEmail.trim(),
          subject: `Appointment Confirmed - ${tenant.name} (${apt.code})`,
          html: renderAppointmentConfirmationHtml({
            patientName: apt.patientName,
            doctorName: `${apt.docTitle || "Dr."} ${apt.docName}`,
            clinicName: tenant.name,
            clinicAddress: tenant.address || undefined,
            clinicPhone: tenant.phone || undefined,
            displayTime: formatDhakaDate(apt.startTime, "dd MMM yyyy 'at' hh:mm a"),
            appointmentCode: apt.code,
            isConfirmed: true,
          }),
        });
      }
    } catch (e) {
      console.warn("Notice: could not send status confirmation email:", e);
    }
  }

  revalidatePath("/app/appointments");
  revalidatePath("/app/queue");
  revalidatePath("/app");
  return { success: true };
}

export async function advanceAppointmentQueueAction(
  appointmentId: string,
  queueTargetStatus: "waiting" | "in_chair" | "done"
) {
  const { tenant, user } = await requireClinicStaff();

  await db.transaction(async (tx) => {
    const patch: Record<string, unknown> = {
      status: queueTargetStatus,
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    if (queueTargetStatus === "waiting") {
      patch.checkedInAt = new Date();
    } else if (queueTargetStatus === "in_chair") {
      patch.inChairAt = new Date();
    } else if (queueTargetStatus === "done") {
      patch.doneAt = new Date();
      await tx
        .update(schema.appointments)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.appointments.tenantId, tenant.id),
            eq(schema.appointments.id, appointmentId)
          )
        );
    }

    await tx
      .update(schema.queueEntries)
      .set(patch)
      .where(
        and(
          eq(schema.queueEntries.tenantId, tenant.id),
          eq(schema.queueEntries.appointmentId, appointmentId)
        )
      );
  });

  revalidatePath("/app/appointments");
  revalidatePath("/app/queue");
  revalidatePath("/app");
  return { success: true };
}

export async function searchPatientsForBookingAction(query: string) {
  const { tenant } = await requireClinicStaff();

  if (!query || query.trim().length < 1) {
    return [];
  }

  const clean = query.trim();
  const searchPattern = `%${clean}%`;

  const results = await db
    .select({
      id: schema.patients.id,
      name: schema.patients.name,
      phone: schema.patients.phone,
      cardNumber: schema.patients.cardNumber,
      gender: schema.patients.gender,
      bloodGroup: schema.patients.bloodGroup,
    })
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        sql`(${schema.patients.name} ILIKE ${searchPattern} OR ${schema.patients.phone} ILIKE ${searchPattern} OR ${schema.patients.cardNumber} ILIKE ${searchPattern})`
      )
    )
    .limit(10);

  return results;
}
