import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { formatBdt } from "@/lib/utils";
import { Plus } from "lucide-react";
import InvoicesListClient, { type InvoiceRow } from "@/components/billing/InvoicesListClient";

export const metadata = {
  title: "Billing & Invoices",
};

export default async function BillingPage() {
  const { tenant } = await requireClinicStaff();

  const invoices = await db
    .select({
      id: schema.invoices.id,
      code: schema.invoices.invoiceCode,
      totalBdt: schema.invoices.totalBdt,
      paidBdt: schema.invoices.paidBdt,
      status: schema.invoices.status,
      createdAt: schema.invoices.createdAt,
      patientId: schema.invoices.patientId,
      patientName: schema.patients.name,
      patientCard: schema.patients.cardNumber,
    })
    .from(schema.invoices)
    .innerJoin(
      schema.patients,
      eq(schema.invoices.patientId, schema.patients.id)
    )
    .where(eq(schema.invoices.tenantId, tenant.id))
    .orderBy(desc(schema.invoices.createdAt));

  // Today's payments collection breakdown
  const allPayments = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.tenantId, tenant.id));

  let totalCollected = 0;
  const methodTotals: Record<string, number> = {
    cash: 0,
    bkash: 0,
    nagad: 0,
    card: 0,
  };

  for (const p of allPayments) {
    totalCollected += p.amountBdt;
    if (methodTotals[p.method] !== undefined) {
      methodTotals[p.method] += p.amountBdt;
    }
  }

  const formattedInvoices: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    code: inv.code,
    totalBdt: inv.totalBdt,
    paidBdt: inv.paidBdt,
    status: inv.status as any,
    createdAt: inv.createdAt,
    patientId: inv.patientId,
    patientName: inv.patientName,
    patientCard: inv.patientCard,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Billing &amp; Invoices
          </h1>
          <p className="text-sm text-[#6B7280]">
            Patient invoicing, partial payment receipts, and digital money reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/billing/dues"
            prefetch={false}
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] text-sm font-bold shadow-2xs transition"
          >
            Review Outstanding Dues →
          </Link>
          <Link
            href="/app/billing/new"
            prefetch={false}
            className="px-5 py-2.5 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Create New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Today's Reconciliation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
          <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
            Total Collection
          </span>
          <span className="text-2xl font-black text-[#1C1C1E] block mt-1">
            {formatBdt(totalCollected)}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
          <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
            Cash Collection
          </span>
          <span className="text-2xl font-bold text-[#30D158] block mt-1">
            {formatBdt(methodTotals.cash)}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
          <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
            bKash Payments
          </span>
          <span className="text-2xl font-bold text-[#E2136E] block mt-1">
            {formatBdt(methodTotals.bkash)}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7]">
          <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
            Nagad &amp; Cards
          </span>
          <span className="text-2xl font-bold text-[#2A5CAA] block mt-1">
            {formatBdt(methodTotals.nagad + methodTotals.card)}
          </span>
        </div>
      </div>

      {/* Invoices List with Search, Filter & 25/100 Pagination */}
      <InvoicesListClient invoices={formattedInvoices} />
    </div>
  );
}

