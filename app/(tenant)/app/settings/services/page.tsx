import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
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
    <div className="w-full">
      <ServicesClient initialServices={services} />
    </div>
  );
}

