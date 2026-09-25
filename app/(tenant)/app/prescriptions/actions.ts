"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { generateRecordCode } from "@/lib/barcode/codes";

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
    user.isDoctor ||
    user.role === "DOCTOR" ||
    user.role === "TENANT_ADMIN" ||
    user.role === "SUPER_ADMIN";

  if (!canPrescribe) {
    throw new Error("Only clinical dentists or clinic administrators may issue prescriptions");
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

      // 3. Insert Prescription Items
      for (const item of input.items || []) {
        if (!item.medicineId) continue;

        await tx.insert(schema.prescriptionItems).values({
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
        });

        // Update doctor medicine preferences (last used instructions and counter)
        await tx
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
          });
      }

      // 4. Insert Advice Lines
      for (const adv of input.adviceLines || []) {
        if (!adv.textBn?.trim()) continue;

        await tx.insert(schema.prescriptionAdvice).values({
          tenantId: tenant.id,
          prescriptionId: prescription.id,
          adviceTemplateId: adv.adviceTemplateId || null,
          textBn: adv.textBn.trim(),
          sortOrder: adv.sortOrder || 1,
        });
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
