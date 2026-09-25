import { and, desc, eq, inArray } from "drizzle-orm";
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

  // Active services in tenant catalog
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

  // Sanitize appointmentId
  const appointmentId =
    params.appointmentId &&
    params.appointmentId !== "undefined" &&
    params.appointmentId !== "null" &&
    /^[0-9a-fA-F-]{36}$/.test(params.appointmentId)
      ? params.appointmentId
      : undefined;

  // Sanitize patient query param
  const rawPatientId = params.patientId ? decodeURIComponent(params.patientId).trim() : undefined;
  let cleanPatientId =
    rawPatientId && rawPatientId !== "undefined" && rawPatientId !== "null"
      ? rawPatientId
      : undefined;

  let preselectedPatient: {
    id: string;
    name: string;
    cardNumber: string;
    phone: string;
  } | null = null;

  interface InitialInvoiceItem {
    id: string;
    serviceId?: string;
    description: string;
    toothCodes: string[];
    quantity: number;
    unitPriceBdt: number;
  }

  let initialLineItems: InitialInvoiceItem[] = [];
  let prescriptionInfo: {
    rxCode: string;
    diagnosis?: string | null;
    toothCodes?: string[];
  } | null = null;

  // 1. If appointmentId is provided, resolve patient and services from appointment
  if (appointmentId) {
    const [apt] = await db
      .select({
        id: schema.appointments.id,
        patientId: schema.appointments.patientId,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.id, appointmentId)
        )
      )
      .limit(1);

    if (apt?.patientId) {
      if (!cleanPatientId) cleanPatientId = apt.patientId;
    }

    // Fetch booked services for this appointment
    const bookedServices = await db
      .select({
        id: schema.appointmentServices.id,
        serviceId: schema.appointmentServices.serviceId,
        serviceNameSnapshot: schema.appointmentServices.serviceNameSnapshot,
        priceBdtSnapshot: schema.appointmentServices.priceBdtSnapshot,
        toothCodes: schema.appointmentServices.toothCodes,
      })
      .from(schema.appointmentServices)
      .where(
        and(
          eq(schema.appointmentServices.tenantId, tenant.id),
          eq(schema.appointmentServices.appointmentId, appointmentId)
        )
      );

    if (bookedServices.length > 0) {
      initialLineItems = bookedServices.map((bs, idx) => ({
        id: `line-${idx + 1}`,
        serviceId: bs.serviceId,
        description: bs.serviceNameSnapshot,
        toothCodes: bs.toothCodes || [],
        quantity: 1,
        unitPriceBdt: bs.priceBdtSnapshot,
      }));
    }

    // Check for prescription issued for this appointment
    const [rx] = await db
      .select({
        id: schema.prescriptions.id,
        rxCode: schema.prescriptions.rxCode,
        diagnosis: schema.prescriptions.diagnosis,
        toothCodes: schema.prescriptions.toothCodes,
      })
      .from(schema.prescriptions)
      .where(
        and(
          eq(schema.prescriptions.tenantId, tenant.id),
          eq(schema.prescriptions.appointmentId, appointmentId)
        )
      )
      .limit(1);

    if (rx) {
      prescriptionInfo = {
        rxCode: rx.rxCode,
        diagnosis: rx.diagnosis,
        toothCodes: rx.toothCodes || [],
      };

      // If no explicit appointment services were booked, but doctor wrote prescription
      if (initialLineItems.length === 0) {
        const defaultService = services[0];
        initialLineItems = [
          {
            id: "line-1",
            serviceId: defaultService?.id,
            description: rx.diagnosis
              ? `Dental Treatment & Care (${rx.diagnosis})`
              : (defaultService?.name || "Dental Consultation & Treatment"),
            toothCodes: rx.toothCodes || [],
            quantity: 1,
            unitPriceBdt: defaultService?.priceBdt || 500,
          },
        ];
      }
    }
  }

  // 2. Fetch preselected patient info (support UUID or 10-digit CardNumber)
  let resolvedPatientId: string | null = null;
  if (cleanPatientId) {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(cleanPatientId);
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
          isUuid
            ? eq(schema.patients.id, cleanPatientId)
            : eq(schema.patients.cardNumber, cleanPatientId)
        )
      )
      .limit(1);

    if (p) {
      preselectedPatient = p;
      resolvedPatientId = p.id;
    }
  }

  // 3. Fetch patient's previous unpaid dues
  interface UnpaidInvoice {
    id: string;
    invoiceCode: string;
    totalBdt: number;
    paidBdt: number;
    dueBdt: number;
    createdAt: string;
  }

  let patientDues: {
    totalDueBdt: number;
    unpaidInvoices: UnpaidInvoice[];
  } = {
    totalDueBdt: 0,
    unpaidInvoices: [],
  };

  if (resolvedPatientId) {
    const pastInvoices = await db
      .select({
        id: schema.invoices.id,
        invoiceCode: schema.invoices.invoiceCode,
        totalBdt: schema.invoices.totalBdt,
        paidBdt: schema.invoices.paidBdt,
        status: schema.invoices.status,
        createdAt: schema.invoices.createdAt,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.tenantId, tenant.id),
          eq(schema.invoices.patientId, resolvedPatientId),
          inArray(schema.invoices.status, ["due", "partial"])
        )
      )
      .orderBy(desc(schema.invoices.createdAt));

    const unpaid = pastInvoices
      .filter((inv) => inv.totalBdt > inv.paidBdt)
      .map((inv) => ({
        id: inv.id,
        invoiceCode: inv.invoiceCode || "DRAFT",
        totalBdt: inv.totalBdt,
        paidBdt: inv.paidBdt,
        dueBdt: inv.totalBdt - inv.paidBdt,
        createdAt: inv.createdAt.toISOString(),
      }));

    patientDues = {
      totalDueBdt: unpaid.reduce((sum, it) => sum + it.dueBdt, 0),
      unpaidInvoices: unpaid,
    };
  }

  return (
    <NewInvoiceClient
      services={services}
      preselectedPatient={preselectedPatient}
      appointmentId={appointmentId}
      initialItems={initialLineItems.length > 0 ? initialLineItems : undefined}
      patientDues={patientDues}
      prescriptionInfo={prescriptionInfo}
    />
  );
}
