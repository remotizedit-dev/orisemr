"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  calculateAvailableSlots,
  type CandidateDoctor,
} from "@/lib/scheduling/slot-engine";
import { generateRecordCode } from "@/lib/barcode/codes";
import { normalizeBdPhone } from "@/lib/utils";
import { sendEmail, renderAppointmentConfirmationHtml } from "@/lib/email/mailer";

export async function getPublicAvailableSlots(
  tenantId: string,
  dateStr: string,
  serviceIds: string[],
  doctorId: string = "any"
) {
  if (!serviceIds || serviceIds.length === 0 || !dateStr) return [];

  // 1. Resolve target weekday (0..6)
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = targetDate.getUTCDay();
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  // 2. Fetch everything in 1 single parallel round-trip
  const [
    selectedServices,
    [tenant],
    clinicHours,
    doctors,
    allDoctorSchedules,
    allAppointmentsOnDate,
  ] = await Promise.all([
    db
      .select({ duration: schema.services.durationMinutes })
      .from(schema.services)
      .where(
        and(
          eq(schema.services.tenantId, tenantId),
          inArray(schema.services.id, serviceIds)
        )
      ),
    db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1),
    db
      .select()
      .from(schema.tenantWorkingHours)
      .where(
        and(
          eq(schema.tenantWorkingHours.tenantId, tenantId),
          eq(schema.tenantWorkingHours.weekday, weekday)
        )
      ),
    db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenantId),
          eq(schema.users.isDoctor, true),
          eq(schema.users.status, "active")
        )
      ),
    db
      .select()
      .from(schema.doctorSchedules)
      .where(
        and(
          eq(schema.doctorSchedules.tenantId, tenantId),
          eq(schema.doctorSchedules.weekday, weekday)
        )
      ),
    db
      .select({
        doctorId: schema.appointments.doctorId,
        startTime: schema.appointments.startTime,
        endTime: schema.appointments.endTime,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenantId),
          sql`${schema.appointments.status} IN ('pending', 'confirmed')`,
          sql`${schema.appointments.startTime} >= ${dayStart.toISOString()}`,
          sql`${schema.appointments.startTime} <= ${dayEnd.toISOString()}`
        )
      ),
  ]);

  if (!tenant) return [];

  const totalDurationMinutes = selectedServices.reduce(
    (acc, s) => acc + s.duration,
    0
  );
  if (totalDurationMinutes === 0) return [];

  // 3. Map candidates in memory (ultra-fast, 0ms)
  const candidates: CandidateDoctor[] = doctors.map((doc) => {
    const personalSchedules = allDoctorSchedules.filter((s) => s.doctorId === doc.id);
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

    const docAppointments = allAppointmentsOnDate.filter((a) => a.doctorId === doc.id);

    return {
      doctorId: doc.id,
      doctorName: doc.name,
      sortOrder: doc.sortOrder,
      appointmentCountToday: docAppointments.length,
      windows,
      busyIntervals: docAppointments.map((a) => ({
        startTime: new Date(a.startTime),
        endTime: new Date(a.endTime),
      })),
    };
  });

  return calculateAvailableSlots({
    date: dateStr,
    totalDurationMinutes,
    slotGranularityMinutes: tenant.slotGranularityMinutes,
    bookingBufferMinutes: tenant.bookingBufferMinutes,
    minLeadMinutes: tenant.publicBookingMinLeadMinutes,
    selectedDoctorId: doctorId,
    candidates,
  });
}

export interface SubmitPublicBookingInput {
  tenantId: string;
  tenantShortCode: string;
  date: string;
  time: string;
  doctorId: string;
  serviceIds: string[];
  isExistingPatient: boolean;
  cardNumber?: string;
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
}

export async function submitPublicBooking(input: SubmitPublicBookingInput) {
  const normPhone = normalizeBdPhone(input.phone);
  if (!normPhone) {
    throw new Error("Please enter a valid 11-digit Bangladeshi mobile number");
  }

  let patientId: string | null = null;
  let isAutoConfirmed = false;

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, input.tenantId))
    .limit(1);

  if (!tenant) throw new Error("Chamber not found");

  if (input.isExistingPatient && input.cardNumber) {
    const [patient] = await db
      .select()
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.tenantId, input.tenantId),
          eq(schema.patients.cardNumber, input.cardNumber.trim()),
          eq(schema.patients.phone, normPhone)
        )
      )
      .limit(1);

    if (!patient) {
      throw new Error("We couldn't find a matching patient with that card number and phone.");
    }
    patientId = patient.id;
    isAutoConfirmed = tenant.autoConfirmExistingPatientBookings;
  }

  // Calculate start & end times
  const [year, month, day] = input.date.split("-").map(Number);
  const [hours, minutes] = input.time.split(":").map(Number);
  const startTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  const services = await db
    .select()
    .from(schema.services)
    .where(
      and(
        eq(schema.services.tenantId, input.tenantId),
        inArray(schema.services.id, input.serviceIds)
      )
    );

  const totalDuration = services.reduce((acc, s) => acc + s.durationMinutes, 0);
  const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    // Increment appointment counter
    const [counter] = await tx
      .insert(schema.tenantCounters)
      .values({
        tenantId: input.tenantId,
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

    const seq = counter.nextValue - 1;
    const appointmentCode = generateRecordCode("APT", input.tenantShortCode, seq);

    const [apt] = await tx
      .insert(schema.appointments)
      .values({
        tenantId: input.tenantId,
        appointmentCode,
        patientId,
        pendingPatientName: patientId ? null : input.name || "Patient",
        pendingPatientPhone: patientId ? null : normPhone,
        pendingPatientEmail: patientId ? null : input.email || null,
        doctorId: input.doctorId,
        startTime,
        endTime,
        status: isAutoConfirmed ? "confirmed" : "pending",
        source: "public_booking",
        notes: input.notes,
      })
      .returning();

    // If auto-confirmed, create queue entry
    if (isAutoConfirmed && patientId) {
      await tx.insert(schema.queueEntries).values({
        tenantId: input.tenantId,
        appointmentId: apt.id,
        patientId,
        doctorId: input.doctorId,
        date: input.date,
        status: "booked",
      });
    }

    return { appointmentCode, isAutoConfirmed };
  });

  // Send email confirmation if an email is provided
  if (input.email) {
    try {
      const [assignedDoctor] = await db
        .select({ name: schema.users.name, title: schema.users.doctorTitle })
        .from(schema.users)
        .where(eq(schema.users.id, input.doctorId))
        .limit(1);

      const docName = assignedDoctor
        ? `${assignedDoctor.title || "Dr."} ${assignedDoctor.name}`
        : "Dental Surgeon";

      await sendEmail({
        to: input.email.trim(),
        subject: result.isAutoConfirmed
          ? `Appointment Confirmed - ${tenant.name} (${result.appointmentCode})`
          : `Appointment Request Received - ${tenant.name} (${result.appointmentCode})`,
        html: renderAppointmentConfirmationHtml({
          patientName: input.name || "Patient",
          doctorName: docName,
          clinicName: tenant.name,
          clinicAddress: tenant.address || undefined,
          clinicPhone: tenant.phone || undefined,
          displayTime: `${input.date} at ${input.time}`,
          appointmentCode: result.appointmentCode,
          isConfirmed: result.isAutoConfirmed,
        }),
      });
    } catch (e) {
      console.warn("Notice: could not send booking confirmation email:", e);
    }
  }

  return result;
}
