"use server";

import { and, eq, sql } from "drizzle-orm";
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
  appointmentId?: string;
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

  // Calculate totals
  let subtotalBdt = 0;
  for (const item of input.items) {
    if (item.quantity <= 0 || item.unitPriceBdt < 0) {
      throw new Error("Item quantity and price must be non-negative");
    }
    subtotalBdt += item.quantity * item.unitPriceBdt;
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

  // Verify patient belongs to this clinic
  const [patient] = await db
    .select({
      id: schema.patients.id,
      name: schema.patients.name,
      email: schema.patients.email,
      cardNumber: schema.patients.cardNumber,
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
          appointmentId: cleanAppointmentId,
          subtotalBdt,
          discountBdt,
          totalBdt,
          paidBdt: advanceAmount,
          status: initialStatus,
          finalizedAt: new Date(),
          createdBy: user.id,
        })
        .returning({ id: schema.invoices.id });

      // 3. Insert Items
      let sort = 0;
      for (const item of input.items) {
        await tx.insert(schema.invoiceItems).values({
          tenantId: tenant.id,
          invoiceId: created.id,
          serviceId: item.serviceId || null,
          description: item.description,
          toothCodes: item.toothCodes || [],
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

      // 5. If linked to an appointment, mark queue entry as done
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
