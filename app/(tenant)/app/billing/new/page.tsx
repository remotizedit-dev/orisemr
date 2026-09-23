import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import NewInvoiceClient from "@/components/billing/NewInvoiceClient";

interface Props {
  searchParams: Promise<{
    patientId?: string;
    appointmentId?: string;
  }>;
}

export default async function NewInvoicePage({ searchParams }: Props) {
  const { tenant } = await requireClinicStaff();
  const params = await searchParams;

  // Active services in tenant
  const services = await db
    .select({
      id: schema.services.id,
      name: schema.services.name,
      priceBdt: schema.services.priceBdt,
    })
    .from(schema.services)
    .where(
      and(
        eq(schema.services.tenantId, tenant.id),
        eq(schema.services.isActive, true)
      )
    )
    .orderBy(schema.services.name);

  // Preselected patient if any
  let preselectedPatient: {
    id: string;
    name: string;
    cardNumber: string;
    phone: string;
  } | null = null;

  if (params.patientId) {
    const [p] = await db
      .select({
        id: schema.patients.id,
        name: schema.patients.name,
        cardNumber: schema.patients.cardNumber,
        phone: schema.patients.phone,
      })
      .from(schema.patients)
      .where(
        and(
          eq(schema.patients.tenantId, tenant.id),
          eq(schema.patients.id, params.patientId)
        )
      )
      .limit(1);

    if (p) preselectedPatient = p;
  }

  return (
    <NewInvoiceClient
      services={services}
      preselectedPatient={preselectedPatient}
      appointmentId={params.appointmentId}
    />
  );
}
