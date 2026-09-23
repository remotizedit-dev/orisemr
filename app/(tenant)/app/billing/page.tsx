import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireClinicStaff } from "@/lib/session";
import { formatBdt, formatDhakaDate } from "@/lib/utils";
import {
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  Printer,
  Search,
} from "lucide-react";

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
  const todayDhakaStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

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

        <div className="flex items-center gap-2">
          <Link
            href="/app/billing/dues"
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] text-xs font-semibold shadow-xs transition"
          >
            Review Outstanding Dues →
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

      {/* Invoices List */}
      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Invoice Code</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Due Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#6B7280]">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const due = inv.totalBdt - inv.paidBdt;
                  return (
                    <tr key={inv.id} className="hover:bg-white/70 transition">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#2A5CAA]">
                        {inv.code || "DRAFT"}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/app/patients/${inv.patientId}`}
                          className="font-bold text-xs text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline block"
                        >
                          {inv.patientName}
                        </Link>
                        <span className="text-[11px] text-[#6B7280] font-mono">
                          {inv.patientCard}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-xs text-[#1C1C1E]">
                        {formatBdt(inv.totalBdt)}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#30D158] font-semibold">
                        {formatBdt(inv.paidBdt)}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold text-[#FF453A]">
                        {formatBdt(due)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            inv.status === "paid"
                              ? "bg-[#E8F8EE] text-[#30D158]"
                              : inv.status === "partial"
                              ? "bg-[#FFF7EB] text-[#FF9F0A]"
                              : inv.status === "due"
                              ? "bg-[#FFEBEA] text-[#FF453A]"
                              : "bg-[#F4F4F5] text-[#6B7280]"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/print/invoice/${inv.id}`}
                          target="_blank"
                          className="text-xs font-semibold text-[#2A5CAA] hover:underline flex items-center justify-end gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
