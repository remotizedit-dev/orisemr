import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { PrescriptionBuilder } from "@/components/prescription/PrescriptionBuilder";

/**
 * Cache chamber clinical catalogs (medicines, dosage patterns, timings, durations, advice, quick texts)
 * per request using React cache() to avoid duplicate DB calls while eliminating serialization errors.
 */
const getCachedPrescriptionCatalog = cache(async (tenantId: string) => {
  const [
    catalogMedicines,
    dosagePatterns,
    mealTimings,
    durationOptions,
    adviceTemplates,
    quickTexts,
  ] = await Promise.all([
    db
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
          eq(schema.medicines.tenantId, tenantId),
          eq(schema.medicines.isActive, true)
        )
      ),

    db
      .select({
        id: schema.dosagePatterns.id,
        labelBn: schema.dosagePatterns.labelBn,
        code: schema.dosagePatterns.code,
        formGroup: schema.dosagePatterns.formGroup,
      })
      .from(schema.dosagePatterns)
      .where(
        and(
          eq(schema.dosagePatterns.tenantId, tenantId),
          eq(schema.dosagePatterns.isActive, true)
        )
      ),

    db
      .select({
        id: schema.mealTimings.id,
        labelBn: schema.mealTimings.labelBn,
        code: schema.mealTimings.code,
      })
      .from(schema.mealTimings)
      .where(
        and(
          eq(schema.mealTimings.tenantId, tenantId),
          eq(schema.mealTimings.isActive, true)
        )
      ),

    db
      .select({
        id: schema.durationOptions.id,
        labelBn: schema.durationOptions.labelBn,
        daysCount: schema.durationOptions.daysCount,
      })
      .from(schema.durationOptions)
      .where(
        and(
          eq(schema.durationOptions.tenantId, tenantId),
          eq(schema.durationOptions.isActive, true)
        )
      ),

    db
      .select({
        id: schema.adviceTemplates.id,
        groupName: schema.adviceTemplates.groupName,
        textBn: schema.adviceTemplates.textBn,
      })
      .from(schema.adviceTemplates)
      .where(
        and(
          eq(schema.adviceTemplates.tenantId, tenantId),
          eq(schema.adviceTemplates.isActive, true)
        )
      ),

    db
      .select({
        id: schema.quickTexts.id,
        kind: schema.quickTexts.kind,
        text: schema.quickTexts.text,
      })
      .from(schema.quickTexts)
      .where(
        and(
          eq(schema.quickTexts.tenantId, tenantId),
          eq(schema.quickTexts.isActive, true)
        )
      ),
  ]);

  return {
    catalogMedicines,
    dosagePatterns,
    mealTimings,
    durationOptions,
    adviceTemplates,
    quickTexts,
  };
});

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; appointmentId?: string }>;
}) {
  const { tenant } = await requireClinicStaff();
  const { patientId: rawPatientId, appointmentId: rawAppointmentId } = await searchParams;

  const patientId = rawPatientId ? decodeURIComponent(rawPatientId).trim() : "";
  const appointmentId =
    rawAppointmentId &&
    rawAppointmentId !== "undefined" &&
    rawAppointmentId !== "null" &&
    /^[0-9a-fA-F-]{36}$/.test(rawAppointmentId)
      ? rawAppointmentId
      : undefined;

  if (!patientId || patientId === "undefined" || patientId === "null") {
    notFound();
  }

  const isUuid = /^[0-9a-fA-F-]{36}$/.test(patientId);

  // Fetch patient profile by UUID or card number, and cached clinical catalogs in parallel
  const [patient, catalog] = await Promise.all([
    db
      .select()
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.tenantId, tenant.id),
          isUuid
            ? eq(schema.patients.id, patientId)
            : eq(schema.patients.cardNumber, patientId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] || null),

    getCachedPrescriptionCatalog(tenant.id),
  ]);

  if (!patient) {
    notFound();
  }

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
          bloodGroup: patient.bloodGroup || null,
          phone: patient.phone || null,
        }}
        appointmentId={appointmentId}
        catalogMedicines={catalog.catalogMedicines}
        dosagePatterns={catalog.dosagePatterns}
        mealTimings={catalog.mealTimings}
        durationOptions={catalog.durationOptions}
        adviceTemplates={catalog.adviceTemplates}
        quickTexts={catalog.quickTexts}
      />
    </div>
  );
}
