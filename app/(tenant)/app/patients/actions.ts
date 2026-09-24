"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { generateAutoCardNumber, generateRecordCode } from "@/lib/barcode/codes";
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

export async function uploadPatientReportAction(formData: FormData) {
  const { tenant, user } = await requireClinicStaff();

  const patientId = formData.get("patientId") as string;
  const kind = (formData.get("kind") as any) || "report";
  const title = (formData.get("title") as string)?.trim() || "Clinical Document";
  const prescriptionId = (formData.get("prescriptionId") as string) || undefined;
  const file = formData.get("file") as File;

  if (!patientId) {
    throw new Error("Patient ID is required");
  }
  if (!file || file.size === 0) {
    throw new Error("Please select or capture a valid file to upload");
  }

  // 1. Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Upload to S3 ORIS-EMR/{tenant_name}/{filename}
  const { uploadMedicalFile, getFileUrl } = await import("@/lib/s3");
  const uploadResult = await uploadMedicalFile(
    tenant.slug,
    file.name || `capture_${Date.now()}.jpg`,
    buffer,
    file.type || "image/jpeg"
  );

  // 3. Generate RPT record code
  const [counter] = await db
    .insert(schema.tenantCounters)
    .values({
      tenantId: tenant.id,
      key: "RPT",
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
  const reportCode = generateRecordCode("RPT", tenant.shortCode, seq);

  // 4. Insert into attachments table
  const [attachment] = await db
    .insert(schema.attachments)
    .values({
      tenantId: tenant.id,
      patientId,
      kind,
      title,
      reportCode,
      prescriptionId: prescriptionId || null,
      s3Key: uploadResult.s3Key,
      contentType: uploadResult.contentType,
      sizeBytes: uploadResult.sizeBytes,
      uploadedBy: user.id,
    })
    .returning();

  return {
    success: true,
    attachment: {
      ...attachment,
      url: getFileUrl(attachment.s3Key),
    },
  };
}

export async function getPatientAttachmentsAction(patientId: string) {
  const { tenant } = await requireClinicStaff();
  const { getFileUrl } = await import("@/lib/s3");

  const rows = await db
    .select({
      id: schema.attachments.id,
      title: schema.attachments.title,
      kind: schema.attachments.kind,
      reportCode: schema.attachments.reportCode,
      s3Key: schema.attachments.s3Key,
      contentType: schema.attachments.contentType,
      sizeBytes: schema.attachments.sizeBytes,
      uploadedAt: schema.attachments.uploadedAt,
      uploadedByName: schema.users.name,
    })
    .from(schema.attachments)
    .leftJoin(schema.users, eq(schema.attachments.uploadedBy, schema.users.id))
    .where(
      and(
        eq(schema.attachments.tenantId, tenant.id),
        eq(schema.attachments.patientId, patientId),
        sql`${schema.attachments.deletedAt} IS NULL`
      )
    )
    .orderBy(desc(schema.attachments.uploadedAt));

  return rows.map((r) => ({
    ...r,
    url: getFileUrl(r.s3Key),
  }));
}

export async function getPatientProfileHistoryAction(patientId: string) {
  const { tenant } = await requireClinicStaff();
  const { getFileUrl } = await import("@/lib/s3");

  const [patient, prescriptions, appointments, invoices, attachments] = await Promise.all([
    // Patient Profile
    db
      .select()
      .from(schema.patients)
      .where(and(eq(schema.patients.tenantId, tenant.id), eq(schema.patients.id, patientId)))
      .limit(1)
      .then((rows) => rows[0] || null),

    // Past Prescriptions with Items
    db
      .select({
        id: schema.prescriptions.id,
        rxCode: schema.prescriptions.rxCode,
        chiefComplaint: schema.prescriptions.chiefComplaint,
        examination: schema.prescriptions.examination,
        diagnosis: schema.prescriptions.diagnosis,
        investigations: schema.prescriptions.investigations,
        toothCodes: schema.prescriptions.toothCodes,
        nextVisitDate: schema.prescriptions.nextVisitDate,
        createdAt: schema.prescriptions.createdAt,
        doctorName: schema.users.name,
      })
      .from(schema.prescriptions)
      .innerJoin(schema.users, eq(schema.prescriptions.doctorId, schema.users.id))
      .where(and(eq(schema.prescriptions.tenantId, tenant.id), eq(schema.prescriptions.patientId, patientId)))
      .orderBy(desc(schema.prescriptions.createdAt)),

    // Past Appointments
    db
      .select({
        id: schema.appointments.id,
        appointmentCode: schema.appointments.appointmentCode,
        startTime: schema.appointments.startTime,
        status: schema.appointments.status,
        doctorName: schema.users.name,
      })
      .from(schema.appointments)
      .innerJoin(schema.users, eq(schema.appointments.doctorId, schema.users.id))
      .where(and(eq(schema.appointments.tenantId, tenant.id), eq(schema.appointments.patientId, patientId)))
      .orderBy(desc(schema.appointments.startTime)),

    // Invoices
    db
      .select()
      .from(schema.invoices)
      .where(and(eq(schema.invoices.tenantId, tenant.id), eq(schema.invoices.patientId, patientId)))
      .orderBy(desc(schema.invoices.createdAt)),

    // Attachments / Reports
    db
      .select({
        id: schema.attachments.id,
        title: schema.attachments.title,
        kind: schema.attachments.kind,
        reportCode: schema.attachments.reportCode,
        s3Key: schema.attachments.s3Key,
        contentType: schema.attachments.contentType,
        sizeBytes: schema.attachments.sizeBytes,
        uploadedAt: schema.attachments.uploadedAt,
      })
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.tenantId, tenant.id),
          eq(schema.attachments.patientId, patientId),
          sql`${schema.attachments.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(schema.attachments.uploadedAt)),
  ]);

  // Fetch prescription items for all patient's prescriptions
  const prescriptionIds = prescriptions.map((p) => p.id);
  const itemsMap: Record<string, string[]> = {};
  if (prescriptionIds.length > 0) {
    const rxItems = await db
      .select({
        prescriptionId: schema.prescriptionItems.prescriptionId,
        medicineLineSnapshot: schema.prescriptionItems.medicineLineSnapshot,
        dosageTextBn: schema.prescriptionItems.dosageTextBn,
        mealTimingTextBn: schema.prescriptionItems.mealTimingTextBn,
        durationTextBn: schema.prescriptionItems.durationTextBn,
      })
      .from(schema.prescriptionItems)
      .where(
        and(
          eq(schema.prescriptionItems.tenantId, tenant.id),
          sql`${schema.prescriptionItems.prescriptionId} IN ${prescriptionIds}`
        )
      );

    for (const item of rxItems) {
      if (!itemsMap[item.prescriptionId]) {
        itemsMap[item.prescriptionId] = [];
      }
      const label = [
        item.medicineLineSnapshot,
        item.dosageTextBn,
        item.mealTimingTextBn,
        item.durationTextBn,
      ]
        .filter(Boolean)
        .join(" — ");
      itemsMap[item.prescriptionId].push(label);
    }
  }

  const enrichedPrescriptions = prescriptions.map((p) => ({
    ...p,
    items: itemsMap[p.id] || [],
  }));

  const enrichedAttachments = attachments.map((a) => ({
    ...a,
    url: getFileUrl(a.s3Key),
  }));

  return {
    patient,
    prescriptions: enrichedPrescriptions,
    appointments,
    invoices,
    attachments: enrichedAttachments,
  };
}
