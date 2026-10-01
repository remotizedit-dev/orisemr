"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { parseRecordCode } from "./codes";
import { normalizeBdPhone } from "@/lib/utils";

export interface CodeResolutionResult {
  found: boolean;
  type?: "appointment" | "prescription" | "invoice" | "report" | "patient";
  id?: string;
  url?: string;
  patient?: typeof schema.patients.$inferSelect;
  todayAppointment?: typeof schema.appointments.$inferSelect;
  canCheckIn?: boolean;
  message?: string;
}

/**
 * Resolves a scanned or typed code in the context of the active tenant.
 */
export async function resolveCode(
  code: string,
  tenantId: string,
  tenantShortCode: string
): Promise<CodeResolutionResult> {
  if (!code || !tenantId) {
    return { found: false, message: "Invalid code or tenant" };
  }

  const clean = code.trim().toUpperCase();

  // 1. Check for standard record prefixes: APT-, RX-, INV-, RPT-
  const parsed = parseRecordCode(clean);
  if (parsed.isValid && parsed.prefix && parsed.shortCode) {
    // If the short code does not match current clinic, return not found
    if (parsed.shortCode !== tenantShortCode.toUpperCase()) {
      return {
        found: false,
        message: `Code belongs to another clinic (${parsed.shortCode})`,
      };
    }

    if (parsed.prefix === "APT") {
      const [apt] = await db
        .select()
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.tenantId, tenantId),
            eq(schema.appointments.appointmentCode, clean)
          )
        )
        .limit(1);

      if (apt) {
        return {
          found: true,
          type: "appointment",
          id: apt.id,
          url: `/app/appointments?code=${clean}`,
        };
      }
    } else if (parsed.prefix === "RX") {
      const [rx] = await db
        .select()
        .from(schema.prescriptions)
        .where(
          and(
            eq(schema.prescriptions.tenantId, tenantId),
            eq(schema.prescriptions.rxCode, clean)
          )
        )
        .limit(1);

      if (rx) {
        return {
          found: true,
          type: "prescription",
          id: rx.id,
          url: `/app/patients/${rx.patientId}?tab=prescriptions`,
        };
      }
    } else if (parsed.prefix === "INV") {
      const [inv] = await db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.tenantId, tenantId),
            eq(schema.invoices.invoiceCode, clean)
          )
        )
        .limit(1);

      if (inv) {
        return {
          found: true,
          type: "invoice",
          id: inv.id,
          url: `/print/invoice/${inv.id}`,
        };
      }
    } else if (parsed.prefix === "RPT") {
      const [rpt] = await db
        .select()
        .from(schema.attachments)
        .where(
          and(
            eq(schema.attachments.tenantId, tenantId),
            eq(schema.attachments.reportCode, clean)
          )
        )
        .limit(1);

      if (rpt) {
        return {
          found: true,
          type: "report",
          id: rpt.id,
          url: `/app/patients/${rpt.patientId}?tab=files`,
        };
      }
    }
  }

  // 2. Direct lookup by Patient Card Number (supports numeric, alphanumeric, custom prefixes)
  let [patient] = await db
    .select()
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenantId),
        isNull(schema.patients.deletedAt),
        eq(schema.patients.cardNumber, clean)
      )
    )
    .limit(1);

  // 3. If not found by card number, try Phone Number lookup
  if (!patient) {
    const normalizedPhone = normalizeBdPhone(clean);
    if (normalizedPhone) {
      const [byPhone] = await db
        .select()
        .from(schema.patients)
        .where(
          and(
            eq(schema.patients.tenantId, tenantId),
            isNull(schema.patients.deletedAt),
            eq(schema.patients.phone, normalizedPhone)
          )
        )
        .limit(1);
      if (byPhone) patient = byPhone;
    }
  }

  // 4. If not found, try Patient Name search
  if (!patient && clean.length >= 2) {
    const [byName] = await db
      .select()
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.tenantId, tenantId),
          isNull(schema.patients.deletedAt),
          sql`${schema.patients.name} ILIKE ${`%${clean}%`}`
        )
      )
      .limit(1);
    if (byName) patient = byName;
  }

  if (patient) {
    // Check if patient has an appointment today not yet checked in
    const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const todayApts = await db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenantId),
          eq(schema.appointments.patientId, patient.id),
          eq(schema.appointments.status, "confirmed")
        )
      );

    // Check if there is an appointment scheduled for today's calendar date
    const todayAppointment = todayApts.find((apt) => {
      const aptDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(apt.startTime));
      return aptDateStr === todayDhakaStr;
    });

    let canCheckIn = false;
    if (todayAppointment) {
      // Check queue entry status
      const [qEntry] = await db
        .select({ status: schema.queueEntries.status })
        .from(schema.queueEntries)
        .where(eq(schema.queueEntries.appointmentId, todayAppointment.id))
        .limit(1);

      if (qEntry && qEntry.status === "booked") {
        canCheckIn = true;
      }
    }

    return {
      found: true,
      type: "patient",
      id: patient.id,
      url: `/app/patients/${patient.id}`,
      patient,
      todayAppointment,
      canCheckIn,
    };
  }

  return {
    found: false,
    message: `No record found for "${clean}"`,
  };
}
