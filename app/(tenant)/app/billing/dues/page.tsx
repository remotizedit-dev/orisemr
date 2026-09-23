import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { formatDhakaDate } from "@/lib/utils";
import DuesClient from "@/components/billing/DuesClient";

export default async function DuesPage() {
  const { tenant } = await requireClinicStaff();

  const dueInvoices = await db
    .select({
      id: schema.invoices.id,
      code: schema.invoices.invoiceCode,
      totalBdt: schema.invoices.totalBdt,
      paidBdt: schema.invoices.paidBdt,
      status: schema.invoices.status,
      createdAt: schema.invoices.createdAt,
      lastReminderSentAt: schema.invoices.lastReminderSentAt,
      patientId: schema.invoices.patientId,
      patientName: schema.patients.name,
      patientCard: schema.patients.cardNumber,
      patientPhone: schema.patients.phone,
      patientEmail: schema.patients.email,
    })
    .from(schema.invoices)
    .innerJoin(
      schema.patients,
      eq(schema.invoices.patientId, schema.patients.id)
    )
    .where(
      and(
        eq(schema.invoices.tenantId, tenant.id),
        inArray(schema.invoices.status, ["due", "partial"])
      )
    )
    .orderBy(desc(schema.invoices.createdAt));

  const nowMs = Date.now();
  let totalDuesSum = 0;

  const formattedInvoices = dueInvoices.map((inv) => {
    const dueBdt = inv.totalBdt - inv.paidBdt;
    totalDuesSum += dueBdt;

    const createdMs = new Date(inv.createdAt).getTime();
    const daysOverdue = Math.floor((nowMs - createdMs) / (1000 * 60 * 60 * 24));

    return {
      id: inv.id,
      code: inv.code || "DRAFT",
      totalBdt: inv.totalBdt,
      paidBdt: inv.paidBdt,
      dueBdt,
      createdAt: formatDhakaDate(inv.createdAt),
      daysOverdue,
      lastReminderSentAt: inv.lastReminderSentAt
        ? inv.lastReminderSentAt.toISOString()
        : null,
      patientId: inv.patientId,
      patientName: inv.patientName,
      patientCard: inv.patientCard,
      patientPhone: inv.patientPhone,
      patientEmail: inv.patientEmail,
    };
  });

  return (
    <DuesClient invoices={formattedInvoices} totalDuesSum={totalDuesSum} />
  );
}
