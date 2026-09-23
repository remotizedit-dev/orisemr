import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { PrescriptionBuilder } from "@/components/prescription/PrescriptionBuilder";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; appointmentId?: string }>;
}) {
  const { tenant } = await requireClinicStaff();
  const { patientId, appointmentId } = await searchParams;

  if (!patientId) {
    notFound();
  }

  // 1. Fetch Patient
  const [patient] = await db
    .select()
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        eq(schema.patients.id, patientId)
      )
    )
    .limit(1);

  if (!patient) {
    notFound();
  }

  // 2. Fetch Catalogs for this clinic
  const catalogMedicines = await db
    .select({
      id: schema.medicines.id,
      brandName: schema.medicines.brandName,
      genericName: schema.medicines.genericName,
      strength: schema.medicines.strength,
      form: schema.medicines.form,
      drugClass: schema.medicines.drugClass,
    })
    .from(schema.medicines)
    .where(
      and(
        eq(schema.medicines.tenantId, tenant.id),
        eq(schema.medicines.isActive, true)
      )
    );

  const dosagePatterns = await db
    .select({
      id: schema.dosagePatterns.id,
      labelBn: schema.dosagePatterns.labelBn,
      code: schema.dosagePatterns.code,
      formGroup: schema.dosagePatterns.formGroup,
    })
    .from(schema.dosagePatterns)
    .where(
      and(
        eq(schema.dosagePatterns.tenantId, tenant.id),
        eq(schema.dosagePatterns.isActive, true)
      )
    );

  const mealTimings = await db
    .select({
      id: schema.mealTimings.id,
      labelBn: schema.mealTimings.labelBn,
      code: schema.mealTimings.code,
    })
    .from(schema.mealTimings)
    .where(
      and(
        eq(schema.mealTimings.tenantId, tenant.id),
        eq(schema.mealTimings.isActive, true)
      )
    );

  const durationOptions = await db
    .select({
      id: schema.durationOptions.id,
      labelBn: schema.durationOptions.labelBn,
      daysCount: schema.durationOptions.daysCount,
    })
    .from(schema.durationOptions)
    .where(
      and(
        eq(schema.durationOptions.tenantId, tenant.id),
        eq(schema.durationOptions.isActive, true)
      )
    );

  const adviceTemplates = await db
    .select({
      id: schema.adviceTemplates.id,
      groupName: schema.adviceTemplates.groupName,
      textBn: schema.adviceTemplates.textBn,
    })
    .from(schema.adviceTemplates)
    .where(
      and(
        eq(schema.adviceTemplates.tenantId, tenant.id),
        eq(schema.adviceTemplates.isActive, true)
      )
    );

  const quickTexts = await db
    .select({
      id: schema.quickTexts.id,
      kind: schema.quickTexts.kind,
      text: schema.quickTexts.text,
    })
    .from(schema.quickTexts)
    .where(
      and(
        eq(schema.quickTexts.tenantId, tenant.id),
        eq(schema.quickTexts.isActive, true)
      )
    );

  return (
    <div className="space-y-6">
      <PrescriptionBuilder
        patient={{
          id: patient.id,
          name: patient.name,
          cardNumber: patient.cardNumber,
          gender: patient.gender,
          approxAge: patient.approxAge,
          allergyFlags: patient.allergyFlags || [],
          medicalConditions: patient.medicalConditions || [],
        }}
        appointmentId={appointmentId}
        catalogMedicines={catalogMedicines}
        dosagePatterns={dosagePatterns}
        mealTimings={mealTimings}
        durationOptions={durationOptions}
        adviceTemplates={adviceTemplates}
        quickTexts={quickTexts}
      />
    </div>
  );
}
