"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { generateAutoCardNumber } from "@/lib/barcode/codes";
import { normalizeBdPhone } from "@/lib/utils";

import { sendEmailInBackground, renderPatientWelcomeHtml } from "@/lib/email/mailer";

export async function checkDuplicatePhoneAction(phone: string) {
  const { tenant } = await requireClinicStaff();
  const normalized = normalizeBdPhone(phone);
  if (!normalized) return null;

  const [existing] = await db
    .select({
      id: schema.patients.id,
      name: schema.patients.name,
      cardNumber: schema.patients.cardNumber,
    })
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        eq(schema.patients.phone, normalized)
      )
    )
    .limit(1);

  return existing || null;
}

export interface RegisterPatientInput {
  cardNumber?: string;
  name: string;
  phone: string;
  email?: string;
  approxAge?: number | null;
  dateOfBirth?: string | null;
  gender: "male" | "female" | "other";
  bloodGroup?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions: string[];
  allergyFlags: string[];
  allergyNotes?: string;
  medicalNotes?: string;
}

export async function registerPatientAction(input: RegisterPatientInput) {
  const { tenant, user } = await requireClinicStaff();

  const normalizedPhone = normalizeBdPhone(input.phone);
  if (!normalizedPhone) {
    throw new Error("Invalid Bangladeshi phone number (must be 01XXXXXXXXX)");
  }

  let finalCardNumber = input.cardNumber?.trim();

  // If in AUTO_GENERATE mode or card number not provided, generate from CARD counter
  if (tenant.patientIdMode === "AUTO_GENERATE" || !finalCardNumber) {
    const [counter] = await db
      .insert(schema.tenantCounters)
      .values({
        tenantId: tenant.id,
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

    const seq = counter.nextValue - 1;
    finalCardNumber = generateAutoCardNumber(seq, tenant.patientIdMinLen);
  }

  // Check unique card number within clinic
  const [existingCard] = await db
    .select()
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        eq(schema.patients.cardNumber, finalCardNumber)
      )
    )
    .limit(1);

  if (existingCard) {
    throw new Error(`Card number ${finalCardNumber} is already assigned to ${existingCard.name}`);
  }

  const [patient] = await db
    .insert(schema.patients)
    .values({
      tenantId: tenant.id,
      cardNumber: finalCardNumber,
      name: input.name.trim(),
      phone: normalizedPhone,
      email: input.email?.trim() || null,
      approxAge: input.approxAge || null,
      dateOfBirth: input.dateOfBirth || null,
      gender: input.gender,
      bloodGroup: input.bloodGroup || null,
      address: input.address?.trim() || null,
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
      medicalConditions: input.medicalConditions || [],
      allergyFlags: input.allergyFlags || [],
      allergyNotes: input.allergyNotes?.trim() || null,
      medicalNotes: input.medicalNotes?.trim() || null,
      createdBy: user.id,
    })
    .returning();

  // If patient provided an email address, trigger welcome email asynchronously in the background
  if (patient.email) {
    sendEmailInBackground({
      to: patient.email,
      subject: `Welcome to ${tenant.name} - Registration Card #${patient.cardNumber}`,
      html: renderPatientWelcomeHtml({
        patientName: patient.name,
        cardNumber: patient.cardNumber,
        clinicName: tenant.name,
        clinicPhone: tenant.phone || undefined,
        clinicAddress: tenant.address || undefined,
      }),
    });
  }

  return {
    success: true,
    patientId: patient.id,
    emailDispatched: Boolean(patient.email),
  };
}
