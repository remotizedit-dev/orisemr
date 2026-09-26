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

  return (
    <div className="w-full">
      <PrescriptionsCatalogClient
        initialMedicines={medicines}
        initialAdvice={adviceList}
      />
    </div>
  );
}

