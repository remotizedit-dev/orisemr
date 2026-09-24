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

  if (!user.isDoctor && user.role !== "DOCTOR") {
    throw new Error("Only clinical dentists may save prescriptions");
  }

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
        appointmentId: input.appointmentId || null,
        chiefComplaint: input.chiefComplaint,
        examination: input.examination,
        diagnosis: input.diagnosis,
        investigations: input.investigations,
        toothCodes: input.toothCodes,
        nextVisitDate: input.nextVisitDate || null,
        notes: input.notes,
        allergyOverride: input.allergyOverride,
      })
      .returning();

    // 3. Insert Prescription Items
    for (const item of input.items) {
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
        sortOrder: item.sortOrder,
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
    for (const adv of input.adviceLines) {
      await tx.insert(schema.prescriptionAdvice).values({
        tenantId: tenant.id,
        prescriptionId: prescription.id,
        adviceTemplateId: adv.adviceTemplateId || null,
        textBn: adv.textBn,
        sortOrder: adv.sortOrder,
      });
    }

    // 5. If patient was in chair in queue, advance them to billing
    if (input.appointmentId) {
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
            eq(schema.queueEntries.appointmentId, input.appointmentId),
            eq(schema.queueEntries.status, "in_chair")
          )
        );
    }

    return { prescriptionId: prescription.id, rxCode };
  });

  revalidatePath("/app/queue");
  revalidatePath("/app/prescriptions");
  revalidatePath("/app/billing");
  revalidatePath(`/app/patients/${input.patientId}`);
  revalidatePath("/app");

  return result;
}
