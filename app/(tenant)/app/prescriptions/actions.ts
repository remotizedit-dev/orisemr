"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { generateRecordCode } from "@/lib/barcode/codes";
import { canDoctorAccessPatient } from "@/lib/patient-privacy";

export interface PrescriptionItemInput {
  medicineId: string;
  medicineLineSnapshot: string;
  dosagePatternId?: string | null;
  dosageTextBn?: string | null;
  mealTimingId?: string | null;
  mealTimingTextBn?: string | null;
  durationOptionId?: string | null;
  durationTextBn?: string | null;
  customInstruction?: string | null;
  sortOrder: number;
}

export interface SavePrescriptionInput {
  patientId: string;
  appointmentId?: string | null;
  chiefComplaint?: string;
  examination?: string;
  diagnosis?: string;
  investigations?: string;
  toothCodes: string[];
  nextVisitDate?: string | null;
  notes?: string;
  allergyOverride: boolean;
  items: PrescriptionItemInput[];
  adviceLines: {
    adviceTemplateId?: string | null;
    textBn: string;
    sortOrder: number;
  }[];
}

export async function savePrescriptionAction(input: SavePrescriptionInput) {
  const { tenant, user } = await requireClinicStaff();

  // Allow registered dentists, DOCTOR role, and TENANT_ADMIN / SUPER_ADMIN managing the clinic
  const canPrescribe =
    (user.isDoctor ||
    user.role === "DOCTOR" ||
    user.role === "TENANT_ADMIN" ||
    user.role === "SUPER_ADMIN") &&
    user.role !== "RECEPTIONIST";

  if (!canPrescribe) {
    throw new Error(
      "Access Denied: Only clinical dentists or clinic administrators are authorized to write or issue prescriptions. Staff accounts do not have prescription privileges."
    );
  }

  // 1. Sanitize appointmentId (prevent invalid UUID crashes)
  const cleanAppointmentId =
    input.appointmentId &&
    input.appointmentId !== "undefined" &&
    input.appointmentId !== "null" &&
    /^[0-9a-fA-F-]{36}$/.test(input.appointmentId)
      ? input.appointmentId
      : null;

  // 2. Sanitize nextVisitDate (must be YYYY-MM-DD or null)
  let cleanNextVisitDate: string | null = null;
  if (input.nextVisitDate && typeof input.nextVisitDate === "string") {
    const trimmed = input.nextVisitDate.trim();
    if (trimmed !== "" && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      cleanNextVisitDate = trimmed;
    }
  }

  // 3. Verify patient belongs to this clinic
  const [existingPatient] = await db
    .select({ id: schema.patients.id })
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        eq(schema.patients.id, input.patientId)
      )
    )
    .limit(1);

  if (!existingPatient) {
    throw new Error("Patient not found in this clinic");
  }

  // Strict privacy check: Pure doctors in ISOLATED mode cannot issue Rx for unassigned patients
  const hasAccess = await canDoctorAccessPatient(tenant, user, input.patientId);
  if (!hasAccess) {
    throw new Error(
      "Access Denied: This patient is not assigned to you under your chamber's strict privacy settings."
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Increment RX counter
      const [counter] = await tx
        .insert(schema.tenantCounters)
        .values({
          tenantId: tenant.id,
          key: "RX",
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
      const rxCode = generateRecordCode("RX", tenant.shortCode, seq);

      // 2. Insert Prescription
      const [prescription] = await tx
        .insert(schema.prescriptions)
        .values({
          tenantId: tenant.id,
          rxCode,
          patientId: input.patientId,
          doctorId: user.id,
          appointmentId: cleanAppointmentId,
          chiefComplaint: input.chiefComplaint?.trim() || null,
          examination: input.examination?.trim() || null,
          diagnosis: input.diagnosis?.trim() || null,
          investigations: input.investigations?.trim() || null,
          toothCodes: Array.isArray(input.toothCodes) ? input.toothCodes : [],
          nextVisitDate: cleanNextVisitDate,
          notes: input.notes?.trim() || null,
          allergyOverride: Boolean(input.allergyOverride),
        })
        .returning();

      // 3. Insert Prescription Items (Batch Insert)
      const validItems = (input.items || []).filter((item) => Boolean(item.medicineId));
      if (validItems.length > 0) {
        await tx.insert(schema.prescriptionItems).values(
          validItems.map((item) => ({
            tenantId: tenant.id,
            prescriptionId: prescription.id,
            medicineId: item.medicineId,
            medicineLineSnapshot: item.medicineLineSnapshot,
            dosagePatternId: item.dosagePatternId || null,
            dosageTextBn: item.dosageTextBn || null,
            mealTimingId: item.mealTimingId || null,
            mealTimingTextBn: item.mealTimingTextBn || null,
            durationOptionId: item.durationOptionId || null,
            durationTextBn: item.durationTextBn || null,
            customInstruction: item.customInstruction || null,
            sortOrder: item.sortOrder || 1,
          }))
        );

        // Update doctor medicine preferences concurrently
        await Promise.all(
          validItems.map((item) =>
            tx
              .insert(schema.doctorMedicinePreferences)
              .values({
                tenantId: tenant.id,
                doctorId: user.id,
                medicineId: item.medicineId,
                dosagePatternId: item.dosagePatternId || null,
                mealTimingId: item.mealTimingId || null,
                durationOptionId: item.durationOptionId || null,
                customInstruction: item.customInstruction || null,
                useCount: 1,
                lastUsedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [
                  schema.doctorMedicinePreferences.doctorId,
                  schema.doctorMedicinePreferences.medicineId,
                ],
                set: {
                  dosagePatternId: item.dosagePatternId || null,
                  mealTimingId: item.mealTimingId || null,
                  durationOptionId: item.durationOptionId || null,
                  customInstruction: item.customInstruction || null,
                  useCount: sql`${schema.doctorMedicinePreferences.useCount} + 1`,
                  lastUsedAt: new Date(),
                },
              })
          )
        );
      }

      // 4. Insert Advice Lines (Batch Insert)
      const validAdvice = (input.adviceLines || []).filter((adv) => Boolean(adv.textBn?.trim()));
      if (validAdvice.length > 0) {
        await tx.insert(schema.prescriptionAdvice).values(
          validAdvice.map((adv) => ({
            tenantId: tenant.id,
            prescriptionId: prescription.id,
            adviceTemplateId: adv.adviceTemplateId || null,
            textBn: adv.textBn.trim(),
            sortOrder: adv.sortOrder || 1,
          }))
        );
      }

      // 5. If patient was in chair in queue, advance them to billing
      if (cleanAppointmentId) {
        await tx
          .update(schema.queueEntries)
          .set({
            status: "billing",
            billingAt: new Date(),
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.queueEntries.tenantId, tenant.id),
              eq(schema.queueEntries.appointmentId, cleanAppointmentId),
              eq(schema.queueEntries.status, "in_chair")
            )
          );
      }

      return { prescriptionId: prescription.id, rxCode };
    });

    revalidatePath("/app/queue");
    revalidatePath("/app/prescriptions");
    revalidatePath("/app/billing");

    return result;
  } catch (error: any) {
    console.error("savePrescriptionAction failed:", error);
    throw new Error(error?.message || "Failed to save prescription. Please check input data.");
  }
}

export async function getPrescriptionDetailsAction(prescriptionId: string) {
  const { tenant } = await requireClinicStaff();

  const [prescription] = await db
    .select({
      id: schema.prescriptions.id,
      rxCode: schema.prescriptions.rxCode,
      patientId: schema.prescriptions.patientId,
      doctorId: schema.prescriptions.doctorId,
      appointmentId: schema.prescriptions.appointmentId,
      chiefComplaint: schema.prescriptions.chiefComplaint,
      examination: schema.prescriptions.examination,
      diagnosis: schema.prescriptions.diagnosis,
      investigations: schema.prescriptions.investigations,
      toothCodes: schema.prescriptions.toothCodes,
      nextVisitDate: schema.prescriptions.nextVisitDate,
      notes: schema.prescriptions.notes,
      allergyOverride: schema.prescriptions.allergyOverride,
      createdAt: schema.prescriptions.createdAt,
      patientName: schema.patients.name,
      patientCardNumber: schema.patients.cardNumber,
      patientPhone: schema.patients.phone,
      patientGender: schema.patients.gender,
      patientApproxAge: schema.patients.approxAge,
      doctorName: schema.users.name,
      doctorTitle: schema.users.doctorTitle,
      doctorDegrees: schema.users.doctorDegrees,
      doctorSpecialty: schema.users.doctorSpecialty,
    })
    .from(schema.prescriptions)
    .innerJoin(
      schema.patients,
      eq(schema.prescriptions.patientId, schema.patients.id)
    )
    .innerJoin(
      schema.users,
      eq(schema.prescriptions.doctorId, schema.users.id)
    )
    .where(
      and(
        eq(schema.prescriptions.tenantId, tenant.id),
        eq(schema.prescriptions.id, prescriptionId)
      )
    )
    .limit(1);

  if (!prescription) {
    throw new Error("Prescription not found");
  }

  const items = await db
    .select()
    .from(schema.prescriptionItems)
    .where(
      and(
        eq(schema.prescriptionItems.tenantId, tenant.id),
        eq(schema.prescriptionItems.prescriptionId, prescriptionId)
      )
    )
    .orderBy(schema.prescriptionItems.sortOrder);

  const adviceList = await db
    .select()
    .from(schema.prescriptionAdvice)
    .where(
      and(
        eq(schema.prescriptionAdvice.tenantId, tenant.id),
        eq(schema.prescriptionAdvice.prescriptionId, prescriptionId)
      )
    )
    .orderBy(schema.prescriptionAdvice.sortOrder);

  return {
    prescription,
    items,
    adviceList,
  };
}

export interface UpdatePrescriptionDetailsInput {
  notes?: string;
  chiefComplaint?: string;
  examination?: string;
  diagnosis?: string;
  investigations?: string;
  nextVisitDate?: string | null;
  toothCodes?: string[];
}

export async function updatePrescriptionDetailsAction(
  prescriptionId: string,
  input: UpdatePrescriptionDetailsInput
) {
  const { tenant, user } = await requireClinicStaff();

  const canPrescribe =
    (user.isDoctor ||
    user.role === "DOCTOR" ||
    user.role === "TENANT_ADMIN" ||
    user.role === "SUPER_ADMIN") &&
    user.role !== "RECEPTIONIST";

  if (!canPrescribe) {
    throw new Error(
      "Access Denied: Only clinical dentists or clinic administrators are authorized to edit prescriptions. Staff accounts do not have prescription editing privileges."
    );
  }

  let cleanNextVisitDate: string | null = null;
  if (input.nextVisitDate && typeof input.nextVisitDate === "string") {
    const trimmed = input.nextVisitDate.trim();
    if (trimmed !== "" && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      cleanNextVisitDate = trimmed;
    }
  }

  const [updated] = await db
    .update(schema.prescriptions)
    .set({
      notes: input.notes !== undefined ? input.notes.trim() || null : undefined,
      chiefComplaint: input.chiefComplaint !== undefined ? input.chiefComplaint.trim() || null : undefined,
      examination: input.examination !== undefined ? input.examination.trim() || null : undefined,
      diagnosis: input.diagnosis !== undefined ? input.diagnosis.trim() || null : undefined,
      investigations: input.investigations !== undefined ? input.investigations.trim() || null : undefined,
      nextVisitDate: cleanNextVisitDate,
      toothCodes: input.toothCodes !== undefined ? input.toothCodes : undefined,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.prescriptions.tenantId, tenant.id),
        eq(schema.prescriptions.id, prescriptionId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Prescription not found or failed to update");
  }

  revalidatePath("/app/prescriptions");
  revalidatePath("/app/queue");
  revalidatePath(`/app/patients/${updated.patientId}`);

  return updated;
}
