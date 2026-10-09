import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import PrescriptionsCatalogClient from "@/components/settings/PrescriptionsCatalogClient";

export default async function SettingsPrescriptionsPage() {
  const { tenant } = await requireClinicStaff();

  // Fetch tenant medicines
  const medicines = await db
    .select({
      id: schema.medicines.id,
      brandName: schema.medicines.brandName,
      genericName: schema.medicines.genericName,
      strength: schema.medicines.strength,
      form: schema.medicines.form,
      drugClass: schema.medicines.drugClass,
      isActive: schema.medicines.isActive,
    })
    .from(schema.medicines)
    .where(eq(schema.medicines.tenantId, tenant.id))
    .orderBy(schema.medicines.genericName, schema.medicines.brandName);

  // Fetch tenant advice templates (pre-advice)
  const adviceList = await db
    .select({
      id: schema.adviceTemplates.id,
      groupName: schema.adviceTemplates.groupName,
      textBn: schema.adviceTemplates.textBn,
      isActive: schema.adviceTemplates.isActive,
    })
    .from(schema.adviceTemplates)
    .where(eq(schema.adviceTemplates.tenantId, tenant.id))
    .orderBy(schema.adviceTemplates.groupName, schema.adviceTemplates.textBn);

  // Fetch tenant clinical quick texts (Chief Complaints, Findings, Diagnosis, Investigations)
  let quickTexts = await db
    .select({
      id: schema.quickTexts.id,
      kind: schema.quickTexts.kind,
      text: schema.quickTexts.text,
      source: schema.quickTexts.source,
      isActive: schema.quickTexts.isActive,
      sortOrder: schema.quickTexts.sortOrder,
    })
    .from(schema.quickTexts)
    .where(eq(schema.quickTexts.tenantId, tenant.id))
    .orderBy(schema.quickTexts.kind, schema.quickTexts.sortOrder, schema.quickTexts.text);

  // Fallback auto-seed if tenant has no quick texts yet
  if (quickTexts.length === 0) {
    const masterQt = await db
      .select()
      .from(schema.masterQuickTexts)
      .where(eq(schema.masterQuickTexts.isActive, true));

    if (masterQt.length > 0) {
      await db.insert(schema.quickTexts).values(
        masterQt.map((qt) => ({
          tenantId: tenant.id,
          masterId: qt.id,
          source: "master" as const,
          kind: qt.kind,
          text: qt.text,
          sortOrder: qt.sortOrder,
          isActive: true,
        }))
      );

      quickTexts = await db
        .select({
          id: schema.quickTexts.id,
          kind: schema.quickTexts.kind,
          text: schema.quickTexts.text,
          source: schema.quickTexts.source,
          isActive: schema.quickTexts.isActive,
          sortOrder: schema.quickTexts.sortOrder,
        })
        .from(schema.quickTexts)
        .where(eq(schema.quickTexts.tenantId, tenant.id))
        .orderBy(schema.quickTexts.kind, schema.quickTexts.sortOrder, schema.quickTexts.text);
    }
  }

  return (
    <div className="w-full">
      <PrescriptionsCatalogClient
        initialMedicines={medicines}
        initialAdvice={adviceList}
        initialQuickTexts={quickTexts}
      />
    </div>
  );
}

