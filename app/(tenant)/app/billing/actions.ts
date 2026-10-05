"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { generateRecordCode } from "@/lib/barcode/codes";

export interface RecordPaymentInput {
  invoiceId: string;
  amountBdt: number;
  method: (typeof schema.paymentMethodEnum.enumValues)[number];
  transactionRef?: string;
  note?: string;
}

export async function recordPaymentAction(input: RecordPaymentInput) {
  const { tenant, user } = await requireClinicStaff();

  if (input.amountBdt <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  await db.transaction(async (tx) => {
    // 1. Fetch current invoice
    const [invoice] = await tx
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.tenantId, tenant.id),
          eq(schema.invoices.id, input.invoiceId)
        )
      )
      .limit(1);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "void") {
      throw new Error("Cannot add payments to a voided invoice");
    }

    const currentBalance = invoice.totalBdt - invoice.paidBdt;
    if (input.amountBdt > currentBalance) {
      throw new Error(
        `Payment amount (৳${input.amountBdt}) cannot exceed remaining balance (৳${currentBalance})`
      );
    }

    // 2. Insert Payment record
    await tx.insert(schema.payments).values({
      tenantId: tenant.id,
      invoiceId: invoice.id,
      amountBdt: input.amountBdt,
      method: input.method,
      transactionRef: input.transactionRef || null,
      receivedBy: user.id,
      paidAt: new Date(),
      note: input.note || null,
    });

    // 3. Update Invoice paid amount and status
    const newPaidBdt = invoice.paidBdt + input.amountBdt;
    const newStatus = newPaidBdt >= invoice.totalBdt ? "paid" : "partial";

    await tx
      .update(schema.invoices)
      .set({
        paidBdt: newPaidBdt,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.invoices.id, invoice.id));

    // 4. Send Payment Confirmation Email if patient has an email
    const [patient] = await tx
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, invoice.patientId))
      .limit(1);

    if (patient?.email) {
      const items = await tx
        .select()
        .from(schema.invoiceItems)
        .where(eq(schema.invoiceItems.invoiceId, invoice.id))
        .orderBy(schema.invoiceItems.sortOrder);

      const { sendEmailInBackground, renderPaymentReceiptHtml } = await import("@/lib/email/mailer");
      const { getFileUrl } = await import("@/lib/s3");

      sendEmailInBackground({
        to: patient.email,
        subject: `Payment Receipt: ${invoice.invoiceCode} - ${tenant.name}`,
        html: renderPaymentReceiptHtml({
          patientName: patient.name,
          cardNumber: patient.cardNumber,
          invoiceCode: invoice.invoiceCode || "INV",
          clinicName: tenant.name,
          clinicLogoUrl: tenant.logoKey ? getFileUrl(tenant.logoKey) : undefined,
          clinicPhone: tenant.phone || undefined,
          clinicAddress: tenant.address || undefined,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          items: items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPriceBdt: it.unitPriceBdt,
            totalBdt: it.totalBdt,
          })),
          subtotalBdt: invoice.subtotalBdt,
          discountBdt: invoice.discountBdt,
          totalBdt: invoice.totalBdt,
          paidAmount: input.amountBdt,
          dueAmount: Math.max(0, invoice.totalBdt - newPaidBdt),
          paymentMethod: input.method,
          paymentStatus: newStatus === "paid" ? "PAID" : "PARTIALLY PAID",
        }),
      });
    }
  });

  revalidatePath("/app/billing");
  revalidatePath("/app/billing/dues");
}

export interface InvoiceItemInput {
  serviceId?: string;
  description: string;
  toothCodes: string[];
  quantity: number;
  unitPriceBdt: number;
}

export interface CreateInvoiceInput {
  patientId: string;
  doctorId?: string | null;
  appointmentId?: string;
  prescriptionId?: string;
  discountBdt: number;
  items: InvoiceItemInput[];
  advancePayment?: {
    amountBdt: number;
    method: (typeof schema.paymentMethodEnum.enumValues)[number];
    transactionRef?: string;
    note?: string;
  };
}

export async function createInvoiceAction(input: CreateInvoiceInput) {
  const { tenant, user } = await requireClinicStaff();

  if (input.items.length === 0) {
    throw new Error("Please add at least one line item to the invoice");
  }

  // Calculate totals and validate prices/quantities defensively (Issue 7)
  let subtotalBdt = 0;
  for (const item of input.items) {
    if (
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity < 1
    ) {
      throw new Error("Item quantity must be at least 1");
    }
    if (
      typeof item.unitPriceBdt !== "number" ||
      !Number.isFinite(item.unitPriceBdt) ||
      item.unitPriceBdt < 0
    ) {
      throw new Error("Item price must be 0 or greater (negative prices are not allowed)");
    }
    subtotalBdt += item.quantity * item.unitPriceBdt;
  }

  if (
    typeof input.discountBdt !== "number" ||
    !Number.isFinite(input.discountBdt) ||
    input.discountBdt < 0
  ) {
    throw new Error("Discount must be 0 or greater");
  }
  if (input.discountBdt > subtotalBdt) {
    throw new Error(`Discount (৳${input.discountBdt}) cannot exceed subtotal (৳${subtotalBdt})`);
  }

  const discountBdt = Math.max(0, input.discountBdt || 0);
  const totalBdt = Math.max(0, subtotalBdt - discountBdt);
  const advanceAmount = Math.max(0, input.advancePayment?.amountBdt || 0);

  if (advanceAmount > totalBdt) {
    throw new Error(`Initial payment cannot exceed invoice total (৳${totalBdt})`);
  }

  const initialStatus =
    totalBdt === 0 || advanceAmount >= totalBdt
      ? "paid"
      : advanceAmount > 0
      ? "partial"
      : "due";

  const cleanAppointmentId =
    input.appointmentId &&
    input.appointmentId !== "undefined" &&
    input.appointmentId !== "null" &&
    /^[0-9a-fA-F-]{36}$/.test(input.appointmentId)
      ? input.appointmentId
      : null;

  const cleanPrescriptionId =
    input.prescriptionId &&
    input.prescriptionId !== "undefined" &&
    input.prescriptionId !== "null" &&
    /^[0-9a-fA-F-]{36}$/.test(input.prescriptionId)
      ? input.prescriptionId
      : null;

  // Verify patient belongs to this clinic
  const [patient] = await db
    .select({
      id: schema.patients.id,
      name: schema.patients.name,
      email: schema.patients.email,
      cardNumber: schema.patients.cardNumber,
      assignedDoctorId: schema.patients.assignedDoctorId,
    })
    .from(schema.patients)
    .where(
      and(
        eq(schema.patients.tenantId, tenant.id),
        eq(schema.patients.id, input.patientId)
      )
    )
    .limit(1);

  if (!patient) {
    throw new Error("Patient not found in this clinic");
  }

  // Resolve which doctor served this patient
  let finalDoctorId =
    input.doctorId && input.doctorId.trim() ? input.doctorId.trim() : null;

  if (!finalDoctorId && cleanAppointmentId) {
    const [apt] = await db
      .select({ doctorId: schema.appointments.doctorId })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, cleanAppointmentId))
      .limit(1);
    if (apt?.doctorId) finalDoctorId = apt.doctorId;
  }

  if (!finalDoctorId && cleanPrescriptionId) {
    const [rx] = await db
      .select({ doctorId: schema.prescriptions.doctorId })
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.id, cleanPrescriptionId))
      .limit(1);
    if (rx?.doctorId) finalDoctorId = rx.doctorId;
  }

  if (!finalDoctorId && patient.assignedDoctorId) {
    finalDoctorId = patient.assignedDoctorId;
  }

  if (!finalDoctorId && (user.isDoctor || user.role === "DOCTOR")) {
    finalDoctorId = user.id;
  }

  try {
    const createdInvoiceId = await db.transaction(async (tx) => {
      // 1. Increment INV counter
      const [counter] = await tx
        .insert(schema.tenantCounters)
        .values({
          tenantId: tenant.id,
          key: "INV",
          nextValue: 2,
        })
        .onConflictDoUpdate({
          target: [schema.tenantCounters.tenantId, schema.tenantCounters.key],
          set: {
            nextValue: sql`${schema.tenantCounters.nextValue} + 1`,
          },
        })
        .returning();

      const seq = counter ? counter.nextValue - 1 : 1;
      const invoiceCode = generateRecordCode("INV", tenant.shortCode, seq);

      // 2. Insert Invoice
      const [created] = await tx
        .insert(schema.invoices)
        .values({
          tenantId: tenant.id,
          invoiceCode,
          patientId: input.patientId,
          doctorId: finalDoctorId,
          appointmentId: cleanAppointmentId,
          prescriptionId: cleanPrescriptionId,
          subtotalBdt,
          discountBdt,
          totalBdt,
          paidBdt: advanceAmount,
          status: initialStatus,
          finalizedAt: new Date(),
          createdBy: user.id,
        })
        .returning({ id: schema.invoices.id });

      // 3. Insert Items (copy prescription teeth if item teeth are empty - Issue 13)
      let fallbackTeeth: string[] = [];
      if (cleanPrescriptionId) {
        const [rx] = await tx
          .select({ toothCodes: schema.prescriptions.toothCodes })
          .from(schema.prescriptions)
          .where(eq(schema.prescriptions.id, cleanPrescriptionId))
          .limit(1);
        if (rx?.toothCodes && rx.toothCodes.length > 0) {
          fallbackTeeth = rx.toothCodes;
        }
      }

      let sort = 0;
      for (const item of input.items) {
        const effectiveTeeth =
          item.toothCodes && item.toothCodes.length > 0
            ? item.toothCodes
            : fallbackTeeth;

        await tx.insert(schema.invoiceItems).values({
          tenantId: tenant.id,
          invoiceId: created.id,
          serviceId: item.serviceId || null,
          description: item.description,
          toothCodes: effectiveTeeth,
          quantity: item.quantity,
          unitPriceBdt: item.unitPriceBdt,
          totalBdt: item.quantity * item.unitPriceBdt,
          sortOrder: sort++,
        });
      }

      // 4. Record advance payment if provided
      if (advanceAmount > 0 && input.advancePayment) {
        await tx.insert(schema.payments).values({
          tenantId: tenant.id,
          invoiceId: created.id,
          amountBdt: advanceAmount,
          method: input.advancePayment.method,
          transactionRef: input.advancePayment.transactionRef || null,
          receivedBy: user.id,
          paidAt: new Date(),
          note: input.advancePayment.note || "Initial settlement at invoice creation",
        });
      }

      // 5. If linked to an appointment, mark queue entry as done and appointment as completed
      if (cleanAppointmentId) {
        await tx
          .update(schema.queueEntries)
          .set({
            status: "done",
            doneAt: new Date(),
            updatedBy: user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.queueEntries.tenantId, tenant.id),
              eq(schema.queueEntries.appointmentId, cleanAppointmentId)
            )
          );

        await tx
          .update(schema.appointments)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.appointments.tenantId, tenant.id),
              eq(schema.appointments.id, cleanAppointmentId)
            )
          );
      }

      return { id: created.id, invoiceCode };
    });

    if (patient.email) {
      const { sendEmailInBackground, renderPaymentReceiptHtml } = await import("@/lib/email/mailer");
      const { getFileUrl } = await import("@/lib/s3");

      sendEmailInBackground({
        to: patient.email,
        subject: `Payment Receipt: ${createdInvoiceId.invoiceCode} - ${tenant.name}`,
        html: renderPaymentReceiptHtml({
          patientName: patient.name,
          cardNumber: patient.cardNumber,
          invoiceCode: createdInvoiceId.invoiceCode,
          clinicName: tenant.name,
          clinicLogoUrl: tenant.logoKey ? getFileUrl(tenant.logoKey) : undefined,
          clinicPhone: tenant.phone || undefined,
          clinicAddress: tenant.address || undefined,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          items: input.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPriceBdt: it.unitPriceBdt,
            totalBdt: it.quantity * it.unitPriceBdt,
          })),
          subtotalBdt,
          discountBdt,
          totalBdt,
          paidAmount: advanceAmount,
          dueAmount: Math.max(0, totalBdt - advanceAmount),
          paymentMethod: input.advancePayment?.method || "cash",
          paymentStatus:
            advanceAmount >= totalBdt
              ? "PAID"
              : advanceAmount > 0
              ? "PARTIALLY PAID"
              : "DUE",
        }),
      });
    }

    revalidatePath("/app/billing");
    revalidatePath("/app/billing/dues");
    if (cleanAppointmentId) {
      revalidatePath("/app/queue");
    }

    return { success: true, invoiceId: createdInvoiceId.id };
  } catch (error: any) {
    console.error("createInvoiceAction failed:", error);
    throw new Error(error?.message || "Failed to create invoice. Please check item details.");
  }
}

export async function sendDueReminderEmailAction(invoiceId: string) {
  const { tenant } = await requireClinicStaff();

  const [invoice] = await db
    .select({
      id: schema.invoices.id,
      code: schema.invoices.invoiceCode,
      totalBdt: schema.invoices.totalBdt,
      paidBdt: schema.invoices.paidBdt,
      status: schema.invoices.status,
      lastReminderSentAt: schema.invoices.lastReminderSentAt,
      patientName: schema.patients.name,
      patientEmail: schema.patients.email,
    })
    .from(schema.invoices)
    .innerJoin(schema.patients, eq(schema.invoices.patientId, schema.patients.id))
    .where(
      and(
        eq(schema.invoices.tenantId, tenant.id),
        eq(schema.invoices.id, invoiceId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "paid" || invoice.status === "void") {
    throw new Error("Invoice has no outstanding dues to remind.");
  }

  if (!invoice.patientEmail) {
    throw new Error("Patient does not have an email address registered.");
  }

  // 24-hour rate limit check
  if (invoice.lastReminderSentAt) {
    const elapsedMs = Date.now() - new Date(invoice.lastReminderSentAt).getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    if (elapsedHours < 24) {
      const waitHours = Math.ceil(24 - elapsedHours);
      throw new Error(`A reminder was already sent today. Please wait ${waitHours} more hours.`);
    }
  }

  const dueBdt = invoice.totalBdt - invoice.paidBdt;

  // Queue reminder email
  await db.insert(schema.emailQueue).values({
    tenantId: tenant.id,
    toEmail: invoice.patientEmail,
    subject: `[${tenant.name}] Outstanding Balance Reminder: Invoice ${invoice.code}`,
    templateKey: "due_reminder",
    payload: {
      patientName: invoice.patientName,
      invoiceCode: invoice.code,
      dueBdt,
      clinicName: tenant.name,
      clinicPhone: tenant.phone || "",
    },
    dedupeKey: `due_reminder_${invoice.id}_${new Date().toISOString().split("T")[0]}`,
  });

  // Update invoice lastReminderSentAt
  await db
    .update(schema.invoices)
    .set({
      lastReminderSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.invoices.id, invoice.id));

  revalidatePath("/app/billing/dues");
  return { success: true };
}

export async function voidInvoiceAction(invoiceId: string, voidReason: string) {
  const { tenant, user } = await requireClinicStaff();

  if (!voidReason || voidReason.trim().length === 0) {
    throw new Error("A reason is required to void an invoice.");
  }

  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.tenantId, tenant.id),
        eq(schema.invoices.id, invoiceId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "void") {
    throw new Error("Invoice is already voided.");
  }

  await db
    .update(schema.invoices)
    .set({
      status: "void",
      voidReason,
      voidedBy: user.id,
      voidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.invoices.id, invoiceId));

  revalidatePath("/app/billing");
  revalidatePath("/app/billing/dues");
  revalidatePath("/app");

  return { success: true };
}

export async function getPatientBillingContextAction(patientIdOrCard: string) {
  const { tenant } = await requireClinicStaff();

  const clean = patientIdOrCard.trim();
  const isUuid = /^[0-9a-fA-F-]{36}$/.test(clean);

  const [patient] = await db
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
          ? eq(schema.patients.id, clean)
          : eq(schema.patients.cardNumber, clean)
      )
    )
    .limit(1);

  if (!patient) {
    return null;
  }

  // 1. Fetch non-void invoices for this patient to prevent duplicate billing
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
      doctorId: schema.invoices.doctorId,
      doctorName: schema.users.name,
    })
    .from(schema.invoices)
    .leftJoin(schema.users, eq(schema.invoices.doctorId, schema.users.id))
    .where(
      and(
        eq(schema.invoices.tenantId, tenant.id),
        eq(schema.invoices.patientId, patient.id),
        sql`${schema.invoices.status} != 'void'`
      )
    )
    .orderBy(desc(schema.invoices.createdAt));

  const allBilledInvoiceIds = allPatientInvoices.map((inv) => inv.id);
  const allBilledItems =
    allBilledInvoiceIds.length > 0
      ? await db
          .select({
            invoiceId: schema.invoiceItems.invoiceId,
            serviceId: schema.invoiceItems.serviceId,
            description: schema.invoiceItems.description,
          })
          .from(schema.invoiceItems)
          .where(inArray(schema.invoiceItems.invoiceId, allBilledInvoiceIds))
      : [];

  // Find recent appointment for this patient with booked services
  const recentAppointments = await db
    .select({
      id: schema.appointments.id,
      status: schema.appointments.status,
      startTime: schema.appointments.startTime,
    })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.tenantId, tenant.id),
        eq(schema.appointments.patientId, patient.id)
      )
    )
    .orderBy(desc(schema.appointments.startTime))
    .limit(5);

  let targetAppointmentId: string | null = null;
  let bookedServices: {
    id: string;
    serviceId: string;
    description: string;
    toothCodes: string[];
    quantity: number;
    unitPriceBdt: number;
  }[] = [];
  let alreadyBilledInfo: {
    invoiceCode: string;
    invoiceId: string;
    message?: string;
  } | null = null;

  for (const apt of recentAppointments) {
    const existingAptInvoice = allPatientInvoices.find((i) => i.appointmentId === apt.id);
    if (existingAptInvoice) {
      if (!alreadyBilledInfo) {
        alreadyBilledInfo = {
          invoiceCode: existingAptInvoice.invoiceCode || "INV",
          invoiceId: existingAptInvoice.id,
          message: `This visit is already billed (${existingAptInvoice.invoiceCode || "INV"})`,
        };
      }
      continue; // Skip appointments already linked to a finalized/paid invoice!
    }

    const services = await db
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

    const unbilledServices = services.filter((s) => {
      const isAlreadyOnInvoice = allBilledItems.some(
        (bi) => bi.serviceId === s.serviceId || bi.description === s.serviceNameSnapshot
      );
      return !isAlreadyOnInvoice;
    });

    if (unbilledServices.length > 0) {
      targetAppointmentId = apt.id;
      bookedServices = unbilledServices.map((s, idx) => ({
        id: `line-${idx + 1}`,
        serviceId: s.serviceId,
        description: s.serviceNameSnapshot,
        toothCodes: s.toothCodes || [],
        quantity: 1,
        unitPriceBdt: s.priceBdtSnapshot,
      }));
      break;
    }
  }

  if (!targetAppointmentId && recentAppointments.length > 0) {
    const firstApt = recentAppointments[0];
    const isFirstBilled = allPatientInvoices.some((i) => i.appointmentId === firstApt.id);
    if (!isFirstBilled) {
      targetAppointmentId = firstApt.id;
    }
  }

  // Check for prescription
  let prescriptionInfo: {
    id?: string;
    rxCode: string;
    diagnosis?: string | null;
    toothCodes?: string[];
    isAlreadyBilled?: boolean;
    billedInvoiceCode?: string | null;
    billedInvoiceId?: string | null;
  } | null = null;

  let targetRx: {
    id: string;
    rxCode: string;
    diagnosis: string | null;
    toothCodes: string[] | null;
    appointmentId: string | null;
    createdAt: Date;
  } | null = null;

  if (targetAppointmentId) {
    const [rx] = await db
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
          eq(schema.prescriptions.appointmentId, targetAppointmentId)
        )
      )
      .limit(1);

    if (rx) targetRx = rx;
  }

  // If still no rx found from appointment, check patient's latest prescription
  if (!targetRx) {
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
          eq(schema.prescriptions.patientId, patient.id)
        )
      )
      .orderBy(desc(schema.prescriptions.createdAt))
      .limit(1);

    if (latestRx) targetRx = latestRx;
  }

  if (targetRx) {
    // Check if this prescription is already billed under an existing invoice
    const matchingInvoice = allPatientInvoices.find(
      (inv) =>
        inv.prescriptionId === targetRx!.id ||
        (targetRx!.appointmentId && inv.appointmentId === targetRx!.appointmentId) ||
        allBilledItems.some(
          (bi) =>
            bi.invoiceId === inv.id &&
            (bi.description.includes(targetRx!.rxCode) ||
              (targetRx!.diagnosis && bi.description.toLowerCase().includes(targetRx!.diagnosis.toLowerCase())))
        )
    );

    if (matchingInvoice) {
      prescriptionInfo = {
        id: targetRx.id,
        rxCode: targetRx.rxCode,
        diagnosis: targetRx.diagnosis,
        toothCodes: targetRx.toothCodes || [],
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
        id: targetRx.id,
        rxCode: targetRx.rxCode,
        diagnosis: targetRx.diagnosis,
        toothCodes: targetRx.toothCodes || [],
        isAlreadyBilled: false,
      };
    }
  }

  // Fetch unpaid past invoices for patient
  const unpaid = allPatientInvoices
    .filter((inv) => (inv.status === "due" || inv.status === "partial") && inv.totalBdt > inv.paidBdt)
    .map((inv) => ({
      id: inv.id,
      invoiceCode: inv.invoiceCode || "DRAFT",
      totalBdt: inv.totalBdt,
      paidBdt: inv.paidBdt,
      dueBdt: inv.totalBdt - inv.paidBdt,
      createdAt: inv.createdAt.toISOString(),
      doctorId: inv.doctorId,
      doctorName: inv.doctorName,
    }));

  if (targetRx?.toothCodes && targetRx.toothCodes.length > 0 && bookedServices.length > 0) {
    bookedServices = bookedServices.map((bs) => ({
      ...bs,
      toothCodes: bs.toothCodes && bs.toothCodes.length > 0 ? bs.toothCodes : targetRx!.toothCodes || [],
    }));
  }

  // Resolve target doctor attribution
  let targetDoctorId: string | null = null;
  if (targetAppointmentId) {
    const [apt] = await db
      .select({ doctorId: schema.appointments.doctorId })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, targetAppointmentId))
      .limit(1);
    if (apt?.doctorId) targetDoctorId = apt.doctorId;
  }
  if (!targetDoctorId && targetRx) {
    const [rx] = await db
      .select({ doctorId: schema.prescriptions.doctorId })
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.id, targetRx.id))
      .limit(1);
    if (rx?.doctorId) targetDoctorId = rx.doctorId;
  }
  if (!targetDoctorId && patient.assignedDoctorId) {
    targetDoctorId = patient.assignedDoctorId;
  }

  return {
    patient,
    appointmentId: targetAppointmentId,
    bookedServices,
    prescriptionInfo,
    alreadyBilledInfo,
    doctorId: targetDoctorId,
    patientDues: {
      totalDueBdt: unpaid.reduce((sum, it) => sum + it.dueBdt, 0),
      unpaidInvoices: unpaid,
    },
  };
}
