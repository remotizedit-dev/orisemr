import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import NewAppointmentClient from "@/components/appointments/NewAppointmentClient";

interface Props {
  searchParams: Promise<{
    patientId?: string;
  }>;
}

export default async function NewAppointmentPage({ searchParams }: Props) {
  const { tenant } = await requireClinicStaff();
  const params = await searchParams;

  // 1. Fetch active doctors
  const doctors = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.isDoctor, true),
        eq(schema.users.status, "active")
      )
    );

  // 2. Fetch active services with category name
  const services = await db
    .select({
      id: schema.services.id,
      name: schema.services.name,
      durationMinutes: schema.services.durationMinutes,
      priceBdt: schema.services.priceBdt,
      category: schema.serviceCategories.name,
    })
    .from(schema.services)
    .innerJoin(
      schema.serviceCategories,
      eq(schema.services.categoryId, schema.serviceCategories.id)
    )
    .where(
      and(
        eq(schema.services.tenantId, tenant.id),
        eq(schema.services.isActive, true)
      )
    )
    .orderBy(schema.serviceCategories.name, schema.services.name);

  // 3. Fetch active chairs
  const chairs = await db
    .select({
      id: schema.chairs.id,
      name: schema.chairs.name,
    })
    .from(schema.chairs)
    .where(
      and(
        eq(schema.chairs.tenantId, tenant.id),
        eq(schema.chairs.isActive, true)
      )
    )
    .orderBy(schema.chairs.sortOrder);

  // 4. Fetch preselected patient if any
  let initialPatient: { id: string; name: string; cardNumber: string } | null = null;
  if (params.patientId) {
    const [p] = await db
      .select({
        id: schema.patients.id,
        name: schema.patients.name,
        cardNumber: schema.patients.cardNumber,
      })
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.tenantId, tenant.id),
          eq(schema.patients.id, params.patientId)
        )
      )
      .limit(1);

    if (p) {
      initialPatient = p;
    }
  }

  return (
    <NewAppointmentClient
      doctors={doctors}
      services={services}
      chairs={chairs}
      initialPatientId={initialPatient?.id}
      initialPatientName={initialPatient?.name}
      initialPatientCard={initialPatient?.cardNumber}
    />
  );
}
