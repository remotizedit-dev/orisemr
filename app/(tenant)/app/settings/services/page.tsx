import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import SettingsTabs from "@/components/settings/SettingsTabs";
import ServicesClient from "@/components/settings/ServicesClient";

export default async function SettingsServicesPage() {
  const { tenant } = await requireClinicStaff();

  const services = await db
    .select({
      id: schema.services.id,
      name: schema.services.name,
      category: schema.serviceCategories.name,
      priceBdt: schema.services.priceBdt,
      durationMinutes: schema.services.durationMinutes,
      isActive: schema.services.isActive,
    })
    .from(schema.services)
    .innerJoin(
      schema.serviceCategories,
      eq(schema.services.categoryId, schema.serviceCategories.id)
    )
    .where(eq(schema.services.tenantId, tenant.id))
    .orderBy(schema.serviceCategories.name, schema.services.name);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
          Chamber Settings
        </h1>
        <p className="text-sm text-[#6B7280]">
          Configure clinic operational hours, chairs, billing catalog, and patient ID mode.
        </p>
      </div>

      <SettingsTabs />

      <ServicesClient initialServices={services} />
    </div>
  );
}
