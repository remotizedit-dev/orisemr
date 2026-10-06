"use server";

import { headers } from "next/headers";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  calculateAvailableSlots,
  computeWorkingHoursIntersection,
  type CandidateDoctor,
} from "@/lib/scheduling/slot-engine";
import { generateRecordCode, generateAutoCardNumber } from "@/lib/barcode/codes";
import { normalizeBdPhone, getDhakaTodayStr, addDhakaDays, formatDoctorName } from "@/lib/utils";
import {
  sendEmailInBackground,
  renderAppointmentConfirmationHtml,
} from "@/lib/email/mailer";

// In-memory sliding window rate limiter for public booking
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkPublicBookingRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxAttempts = 12;

  const current = rateLimitMap.get(clientKey);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(clientKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= maxAttempts) {
    return false;
  }

  current.count += 1;
  return true;
}

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
  const dayStart = new Date(`${dateStr}T00:00:00+06:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999+06:00`);

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

  // Enforce public booking window (days ahead) in Asia/Dhaka
  const dhakaTodayStr = getDhakaTodayStr();
  const maxDaysAhead = tenant.publicBookingDaysAhead ?? 14;
  const maxAllowedDateStr = addDhakaDays(dhakaTodayStr, maxDaysAhead);

  if (dateStr < dhakaTodayStr || dateStr > maxAllowedDateStr) {
    return [];
  }

  const totalDurationMinutes = selectedServices.reduce(
    (acc, s) => acc + s.duration,
    0
  );
  if (totalDurationMinutes === 0) return [];

  // 3. Map candidates in memory (ultra-fast, 0ms)
  const candidates: CandidateDoctor[] = doctors.map((doc) => {
    const personalSchedules = allDoctorSchedules.filter((s) => s.doctorId === doc.id);
    const windows = computeWorkingHoursIntersection(clinicHours, personalSchedules);

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

export async function lookupPublicPatientByCard(
  tenantId: string,
  cardNumber: string,
  phone?: string
) {
  if (!cardNumber || !cardNumber.trim()) {
    return { found: false, verified: false };
  }

  const cleanCard = cardNumber.trim();
  const [patient] = await db
    .select({
      id: schema.patients.id,
      phone: schema.patients.phone,
    })
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenantId),
        eq(schema.patients.cardNumber, cleanCard),
        isNull(schema.patients.deletedAt)
      )
    )
    .limit(1);

  if (!patient) {
    return { found: false, verified: false };
  }

  // If phone is provided, verify match without returning any patient name
  if (phone) {
    const normEntered = normalizeBdPhone(phone);
    const normPatient = normalizeBdPhone(patient.phone);
    if (normEntered && normEntered === normPatient) {
      return { found: true, verified: true };
    }
    return { found: true, verified: false };
  }

  return { found: true, verified: false };
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

  let patientId: string | null = null;
  let patientName = input.name?.trim() || "Patient";
  let patientPhone = normPhone;
  let patientEmail = input.email?.trim() || null;
  let isAutoConfirmed = false;
  let finalAssignedCardNumber: string | null = null;

  // Enforce rate limiting
  const reqHeaders = await headers();
  const clientIp =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    reqHeaders.get("x-real-ip") ||
    "client";

  if (!checkPublicBookingRateLimit(`${clientIp}:${input.tenantId}`)) {
    throw new Error(
      "Too many booking attempts. Please wait a few minutes before trying again."
    );
  }

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, input.tenantId))
    .limit(1);

  if (!tenant) throw new Error("Chamber not found");

  // Enforce public booking window on server
  const dhakaTodayStr = getDhakaTodayStr();
  const maxDaysAhead = tenant.publicBookingDaysAhead ?? 14;
  const maxAllowedDateStr = addDhakaDays(dhakaTodayStr, maxDaysAhead);

  if (input.date < dhakaTodayStr || input.date > maxAllowedDateStr) {
    throw new Error(
      `Appointments can only be booked between ${dhakaTodayStr} and ${maxAllowedDateStr} (within ${maxDaysAhead} days).`
    );
  }

  if (input.isExistingPatient && input.cardNumber) {
    // 1. Existing Patient with Chamber Card ID
    const [patient] = await db
      .select()
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.tenantId, input.tenantId),
          eq(schema.patients.cardNumber, input.cardNumber.trim()),
          isNull(schema.patients.deletedAt)
        )
      )
      .limit(1);

    if (!patient) {
      throw new Error("We couldn't find a registered patient with that chamber card number.");
    }

    // Strict validation: Card is only accepted when entered phone matches patient's phone on file
    if (!normPhone || normPhone !== normalizeBdPhone(patient.phone)) {
      throw new Error("Chamber card number and mobile phone number do not match our records.");
    }

    patientId = patient.id;
    patientName = patient.name;
    patientPhone = patient.phone;
    patientEmail = patient.email || patientEmail;
    finalAssignedCardNumber = patient.cardNumber;
    isAutoConfirmed = tenant.autoConfirmExistingPatientBookings;
  } else {
    // 2. New Patient Booking
    if (!normPhone) {
      throw new Error("Please enter a valid 11-digit Bangladeshi mobile number");
    }
    // Check if phone number already belongs to an existing registered patient
    const [existingPatient] = await db
      .select()
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.tenantId, input.tenantId),
          eq(schema.patients.phone, normPhone),
          isNull(schema.patients.deletedAt)
        )
      )
      .limit(1);

    if (existingPatient) {
      patientId = existingPatient.id;
      patientName = existingPatient.name;
      patientEmail = existingPatient.email || patientEmail;
      finalAssignedCardNumber = existingPatient.cardNumber;
    }
  }

  if (!patientPhone) {
    throw new Error("Please enter a valid 11-digit Bangladeshi mobile number");
  }

  // Calculate start & end times in Asia/Dhaka (+06:00)
  const startTime = new Date(`${input.date}T${input.time.padStart(5, "0")}:00+06:00`);

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
    // If not existing patient and not found by phone, auto-register as new patient
    if (!patientId) {
      // Find or advance CARD counter
      const [pCounter] = await tx
        .insert(schema.tenantCounters)
        .values({
          tenantId: input.tenantId,
          key: "CARD",
          nextValue: 2,
        })
        .onConflictDoUpdate({
          target: [schema.tenantCounters.tenantId, schema.tenantCounters.key],
          set: {
            nextValue: sql`${schema.tenantCounters.nextValue} + 1`,
          },
        })
        .returning();

      let pSeq = pCounter ? pCounter.nextValue - 1 : 1;
      let autoCard = generateAutoCardNumber(pSeq, tenant.patientIdMinLen || 10);

      // Loop to guarantee no collision with pre-printed batch cards or existing cards
      while (true) {
        const [colliding] = await tx
          .select({ id: schema.patients.id })
          .from(schema.patients)
          .where(
            and(
              eq(schema.patients.tenantId, input.tenantId),
              eq(schema.patients.cardNumber, autoCard)
            )
          )
          .limit(1);

        if (!colliding) {
          if (pSeq >= pCounter.nextValue) {
            await tx
              .update(schema.tenantCounters)
              .set({ nextValue: pSeq + 1 })
              .where(
                and(
                  eq(schema.tenantCounters.tenantId, input.tenantId),
                  eq(schema.tenantCounters.key, "CARD")
                )
              );
          }
          break;
        }
        pSeq++;
        autoCard = generateAutoCardNumber(pSeq, tenant.patientIdMinLen || 10);
      }

      const [newPatient] = await tx
        .insert(schema.patients)
        .values({
          tenantId: input.tenantId,
          cardNumber: autoCard,
          name: patientName,
          phone: patientPhone,
          email: patientEmail,
          gender: "other",
          createdBy: input.doctorId,
        })
        .returning();

      patientId = newPatient.id;
      finalAssignedCardNumber = newPatient.cardNumber;
    }

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
        pendingPatientName: patientName,
        pendingPatientPhone: patientPhone,
        pendingPatientEmail: patientEmail,
        doctorId: input.doctorId,
        startTime,
        endTime,
        status: isAutoConfirmed ? "confirmed" : "pending",
        source: "public_booking",
        notes: input.notes,
      })
      .returning();

    // Insert booked services into appointment_services
    for (let i = 0; i < services.length; i++) {
      const srv = services[i];
      await tx.insert(schema.appointmentServices).values({
        tenantId: input.tenantId,
        appointmentId: apt.id,
        serviceId: srv.id,
        serviceNameSnapshot: srv.name,
        durationMinutesSnapshot: srv.durationMinutes,
        priceBdtSnapshot: srv.priceBdt,
        toothCodes: [],
        sortOrder: i + 1,
      });
    }

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

    return {
      appointmentCode,
      isAutoConfirmed,
      patientCardNumber: finalAssignedCardNumber,
      // Patient name omitted to prevent leaking names via public confirmation screens
    };
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
        ? formatDoctorName(assignedDoctor.name, assignedDoctor.title)
        : "Dental Surgeon";

      sendEmailInBackground({
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
      console.warn("Notice: could not prepare booking confirmation email:", e);
    }
  }

  return result;
}
