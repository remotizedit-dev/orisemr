import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
  const { tenant, user } = await requireClinicStaff();
  const params = await searchParams;

  // Active doctors in tenant clinic
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
    )
    .orderBy(schema.users.name);

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
    id?: string;
    rxCode: string;
    diagnosis?: string | null;
    toothCodes?: string[];
    isAlreadyBilled?: boolean;
    billedInvoiceCode?: string | null;
    billedInvoiceId?: string | null;
  } | null = null;
  let alreadyBilledInfo: {
    invoiceCode: string;
    invoiceId: string;
    message?: string;
  } | null = null;
  let resolvedDoctorId: string | undefined = undefined;

  // 1. If appointmentId is provided, resolve patient and services from appointment
  if (appointmentId) {
    const [existingInv] = await db
      .select({ id: schema.invoices.id, invoiceCode: schema.invoices.invoiceCode })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.tenantId, tenant.id),
          eq(schema.invoices.appointmentId, appointmentId),
          sql`${schema.invoices.status} != 'void'`
        )
      )
      .limit(1);

    if (existingInv) {
      alreadyBilledInfo = {
        invoiceCode: existingInv.invoiceCode || "INV",
        invoiceId: existingInv.id,
        message: `This visit is already billed (${existingInv.invoiceCode || "INV"})`,
      };
    }

    const [apt] = await db
      .select({
        id: schema.appointments.id,
        patientId: schema.appointments.patientId,
        doctorId: schema.appointments.doctorId,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.id, appointmentId)
        )
      )
      .limit(1);

    if (apt?.doctorId) {
      resolvedDoctorId = apt.doctorId;
    }

    if (apt?.patientId) {
      if (!cleanPatientId) cleanPatientId = apt.patientId;
    }

    if (!alreadyBilledInfo) {
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
    }

    // Check for prescription issued for this appointment
    const [rx] = await db
      .select({
        id: schema.prescriptions.id,
        rxCode: schema.prescriptions.rxCode,
        diagnosis: schema.prescriptions.diagnosis,
        toothCodes: schema.prescriptions.toothCodes,
        doctorId: schema.prescriptions.doctorId,
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
      if (rx.doctorId && !resolvedDoctorId) {
        resolvedDoctorId = rx.doctorId;
      }
      prescriptionInfo = {
        id: rx.id,
        rxCode: rx.rxCode,
        diagnosis: rx.diagnosis,
        toothCodes: rx.toothCodes || [],
        isAlreadyBilled: !!alreadyBilledInfo,
        billedInvoiceCode: alreadyBilledInfo?.invoiceCode,
      };

      // Copy prescription's tooth numbers into invoice line items (Issue 13)
      if (rx.toothCodes && rx.toothCodes.length > 0) {
        initialLineItems = initialLineItems.map((item) => ({
          ...item,
          toothCodes: item.toothCodes && item.toothCodes.length > 0 ? item.toothCodes : rx.toothCodes!,
        }));
      }

      // If no explicit appointment services were booked, but doctor wrote prescription and visit is NOT already billed
      if (!alreadyBilledInfo && initialLineItems.length === 0) {
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
  let patientAssignedDocId: string | null = null;
  if (cleanPatientId) {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(cleanPatientId);
    const [p] = await db
      .select({
        id: schema.patients.id,
        name: schema.patients.name,
        cardNumber: schema.patients.cardNumber,
        phone: schema.patients.phone,
        assignedDoctorId: schema.patients.assignedDoctorId,
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
      preselectedPatient = {
        id: p.id,
        name: p.name,
        cardNumber: p.cardNumber,
        phone: p.phone,
      };
      resolvedPatientId = p.id;
      patientAssignedDocId = p.assignedDoctorId;
      if (p.assignedDoctorId && !resolvedDoctorId) {
        resolvedDoctorId = p.assignedDoctorId;
      }
    }
  }

  // 2b. If appointmentId was not explicitly passed, but patient is preselected, auto-load booked services from unbilled appointment
  if (!appointmentId && resolvedPatientId && initialLineItems.length === 0) {
    // Fetch non-void invoices for this patient
    const allPatientInvoices = await db
      .select({
        id: schema.invoices.id,
        invoiceCode: schema.invoices.invoiceCode,
        appointmentId: schema.invoices.appointmentId,
        prescriptionId: schema.invoices.prescriptionId,
        status: schema.invoices.status,
        totalBdt: schema.invoices.totalBdt,
        paidBdt: schema.invoices.paidBdt,
        createdAt: schema.invoices.createdAt,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.tenantId, tenant.id),
          eq(schema.invoices.patientId, resolvedPatientId),
          sql`${schema.invoices.status} != 'void'`
        )
      )
      .orderBy(desc(schema.invoices.createdAt));

    const billedInvoiceIds = allPatientInvoices.map((inv) => inv.id);
    const billedInvoiceItems =
      billedInvoiceIds.length > 0
        ? await db
            .select({
              invoiceId: schema.invoiceItems.invoiceId,
              serviceId: schema.invoiceItems.serviceId,
              description: schema.invoiceItems.description,
            })
            .from(schema.invoiceItems)
            .where(inArray(schema.invoiceItems.invoiceId, billedInvoiceIds))
        : [];

    const recentAppointments = await db
      .select({
        id: schema.appointments.id,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.tenantId, tenant.id),
          eq(schema.appointments.patientId, resolvedPatientId)
        )
      )
      .orderBy(desc(schema.appointments.startTime))
      .limit(5);

    for (const apt of recentAppointments) {
      const existingInv = allPatientInvoices.find((i) => i.appointmentId === apt.id);
      if (existingInv) {
        if (!alreadyBilledInfo) {
          alreadyBilledInfo = {
            invoiceCode: existingInv.invoiceCode || "INV",
            invoiceId: existingInv.id,
            message: `This visit is already billed (${existingInv.invoiceCode || "INV"})`,
          };
        }
        continue;
      }

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
            eq(schema.appointmentServices.appointmentId, apt.id)
          )
        );

      const unbilledServices = bookedServices.filter((s) => {
        const isAlreadyOnInvoice = billedInvoiceItems.some(
          (bi) => bi.serviceId === s.serviceId || bi.description === s.serviceNameSnapshot
        );
        return !isAlreadyOnInvoice;
      });

      if (unbilledServices.length > 0) {
        initialLineItems = unbilledServices.map((bs, idx) => ({
          id: `line-${idx + 1}`,
          serviceId: bs.serviceId,
          description: bs.serviceNameSnapshot,
          toothCodes: bs.toothCodes || [],
          quantity: 1,
          unitPriceBdt: bs.priceBdtSnapshot,
        }));
        break;
      }
    }

    if (!prescriptionInfo) {
      const [latestRx] = await db
        .select({
          id: schema.prescriptions.id,
          rxCode: schema.prescriptions.rxCode,
          diagnosis: schema.prescriptions.diagnosis,
          toothCodes: schema.prescriptions.toothCodes,
          appointmentId: schema.prescriptions.appointmentId,
          createdAt: schema.prescriptions.createdAt,
        })
        .from(schema.prescriptions)
        .where(
          and(
            eq(schema.prescriptions.tenantId, tenant.id),
            eq(schema.prescriptions.patientId, resolvedPatientId)
          )
        )
        .orderBy(desc(schema.prescriptions.createdAt))
        .limit(1);

      if (latestRx) {
        const matchingInvoice = allPatientInvoices.find(
          (inv) =>
            inv.prescriptionId === latestRx.id ||
            (latestRx.appointmentId && inv.appointmentId === latestRx.appointmentId) ||
            billedInvoiceItems.some(
              (bi) =>
                bi.invoiceId === inv.id &&
                (bi.description.includes(latestRx.rxCode) ||
                  (latestRx.diagnosis && bi.description.toLowerCase().includes(latestRx.diagnosis.toLowerCase())))
            )
        );

        if (matchingInvoice) {
          prescriptionInfo = {
            id: latestRx.id,
            rxCode: latestRx.rxCode,
            diagnosis: latestRx.diagnosis,
            toothCodes: latestRx.toothCodes || [],
            isAlreadyBilled: true,
            billedInvoiceCode: matchingInvoice.invoiceCode || "INV",
            billedInvoiceId: matchingInvoice.id,
          };
          if (!alreadyBilledInfo) {
            alreadyBilledInfo = {
              invoiceCode: matchingInvoice.invoiceCode || "INV",
              invoiceId: matchingInvoice.id,
              message: `This visit is already billed (${matchingInvoice.invoiceCode || "INV"})`,
            };
          }
        } else {
          prescriptionInfo = {
            id: latestRx.id,
            rxCode: latestRx.rxCode,
            diagnosis: latestRx.diagnosis,
            toothCodes: latestRx.toothCodes || [],
            isAlreadyBilled: false,
          };

          if (latestRx.toothCodes && latestRx.toothCodes.length > 0) {
            initialLineItems = initialLineItems.map((item) => ({
              ...item,
              toothCodes: item.toothCodes && item.toothCodes.length > 0 ? item.toothCodes : latestRx.toothCodes!,
            }));
          }
        }
      }
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

  const defaultDoctorId =
    resolvedDoctorId ||
    patientAssignedDocId ||
    ((user.isDoctor || user.role === "DOCTOR") ? user.id : undefined);

  return (
    <NewInvoiceClient
      services={services}
      preselectedPatient={preselectedPatient}
      appointmentId={appointmentId}
      initialItems={initialLineItems.length > 0 ? initialLineItems : undefined}
      patientDues={patientDues}
      prescriptionInfo={prescriptionInfo}
      alreadyBilledInfo={alreadyBilledInfo}
      doctors={doctors}
      defaultDoctorId={defaultDoctorId}
    />
  );
}
