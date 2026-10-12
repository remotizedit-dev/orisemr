"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  Receipt,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Stethoscope,
  User,
  Filter,
} from "lucide-react";
import { formatBdt, formatDhakaDate, formatDoctorName } from "@/lib/utils";
import { DeleteInvoiceModal } from "@/components/billing/DeleteInvoiceModal";

export interface PatientLedgerInvoice {
  id: string;
  invoiceCode: string | null;
  subtotalBdt: number;
  discountBdt: number;
  totalBdt: number;
  paidBdt: number;
  status: string;
  createdAt: Date;
  doctorName?: string | null;
}

export interface PatientLedgerPayment {
  id: string;
  invoiceId: string;
  invoiceCode?: string | null;
  amountBdt: number;
  method: string;
  transactionRef?: string | null;
  note?: string | null;
  paidAt: Date;
  receivedByName?: string | null;
}

interface PatientPaymentLedgerProps {
  patientId: string;
  patientName: string;
  patientPhone?: string | null;
  invoices: PatientLedgerInvoice[];
  payments: PatientLedgerPayment[];
  isAdmin?: boolean;
}

type TabType = "ledger" | "invoices" | "payments";

interface LedgerEntry {
  id: string;
  date: Date;
  type: "debit" | "credit";
  code: string;
  description: string;
  doctorName?: string | null;
  receiverName?: string | null;
  method?: string | null;
  transactionRef?: string | null;
  debitBdt: number;
  creditBdt: number;
  runningBalanceBdt: number;
  invoiceId?: string;
  status?: string;
  dueBdt?: number;
}

export function PatientPaymentLedger({
  patientId,
  patientName,
  patientPhone,
  invoices,
  payments,
  isAdmin = false,
}: PatientPaymentLedgerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ledger");
  const [deletingInvoice, setDeletingInvoice] = useState<PatientLedgerInvoice | null>(null);

  // Financial summary metrics
  const totalInvoiced = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== "void")
      .reduce((sum, inv) => sum + inv.totalBdt, 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amountBdt, 0);
  }, [payments]);

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "due" || inv.status === "partial")
      .reduce((sum, inv) => sum + Math.max(0, inv.totalBdt - inv.paidBdt), 0);
  }, [invoices]);

  // Construct combined chronological statement
  const chronologicalEntries = useMemo(() => {
    const raw: Array<{
      id: string;
      date: Date;
      type: "debit" | "credit";
      code: string;
      description: string;
      doctorName?: string | null;
      receiverName?: string | null;
      method?: string | null;
      transactionRef?: string | null;
      debitBdt: number;
      creditBdt: number;
      invoiceId?: string;
      status?: string;
      dueBdt?: number;
    }> = [];

    // Add Invoices as Debits
    for (const inv of invoices) {
      if (inv.status === "void") continue;
      const due = Math.max(0, inv.totalBdt - inv.paidBdt);
      raw.push({
        id: `inv-${inv.id}`,
        date: new Date(inv.createdAt),
        type: "debit",
        code: inv.invoiceCode || "DRAFT",
        description: "Clinical Consultation / Treatment Bill",
        doctorName: inv.doctorName,
        debitBdt: inv.totalBdt,
        creditBdt: 0,
        invoiceId: inv.id,
        status: inv.status,
        dueBdt: due,
      });
    }

    // Add Payments as Credits
    for (const pmt of payments) {
      raw.push({
        id: `pmt-${pmt.id}`,
        date: new Date(pmt.paidAt),
        type: "credit",
        code: pmt.invoiceCode ? `PMT (${pmt.invoiceCode})` : "RECEIPT",
        description: `Payment Received (${pmt.method.toUpperCase().replace("_", " ")})`,
        receiverName: pmt.receivedByName,
        method: pmt.method,
        transactionRef: pmt.transactionRef,
        debitBdt: 0,
        creditBdt: pmt.amountBdt,
        invoiceId: pmt.invoiceId,
      });
    }

    // Sort ascending by date to compute running balance correctly
    raw.sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = 0;
    const computed: LedgerEntry[] = [];
    for (const item of raw) {
      if (item.type === "debit") {
        balance += item.debitBdt;
      } else {
        balance -= item.creditBdt;
      }
      computed.push({
        ...item,
        runningBalanceBdt: balance,
      });
    }

    // Present descending for recent-first reading
    return computed.reverse();
  }, [invoices, payments]);

  const methodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case "bkash":
        return "bg-pink-50 text-pink-700 border-pink-200";
      case "nagad":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "card":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "bank_transfer":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Billed (Debit) */}
        <div className="p-4 rounded-2xl bg-white border border-[#E4E4E7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Invoiced
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#2A5CAA]" />
          </div>
          <p className="text-xl font-black text-[#1C1C1E]">
            {formatBdt(totalInvoiced)}
          </p>
          <p className="text-[10px] text-[#8E8E93]">
            {invoices.length} bill{invoices.length === 1 ? "" : "s"} generated
          </p>
        </div>

        {/* Total Paid (Credit) */}
        <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Collected
            </span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900">
            {formatBdt(totalPaid)}
          </p>
          <p className="text-[10px] text-emerald-700">
            {payments.length} receipt{payments.length === 1 ? "" : "s"} recorded
          </p>
        </div>

        {/* Outstanding Due */}
        <div
          className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
            totalOutstanding > 0
              ? "bg-[#FFF7EB] border-[#FF9F0A]/40"
              : "bg-[#FAFAFA] border-[#E4E4E7]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Outstanding Due
            </span>
            {totalOutstanding > 0 ? (
              <AlertCircle className="w-4 h-4 text-[#C0392B]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <p
            className={`text-xl font-black ${
              totalOutstanding > 0 ? "text-[#C0392B]" : "text-[#1C1C1E]"
            }`}
          >
            {formatBdt(totalOutstanding)}
          </p>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] font-medium text-[#8E8E93]">
              {totalOutstanding > 0 ? "Pending collection" : "All cleared"}
            </span>
            {totalOutstanding > 0 && (
              <Link
                href={`/app/billing/dues?search=${encodeURIComponent(
                  patientPhone || patientName
                )}`}
                prefetch={false}
                className="text-[10px] font-bold text-white bg-[#C0392B] hover:bg-[#A93226] px-2 py-0.5 rounded shadow-2xs transition"
              >
                Settle Due →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Container */}
      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        {/* Navigation Bar & Actions */}
        <div className="p-4 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E4E4E7] shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ledger"
                  ? "bg-[#2A5CAA] text-white shadow-2xs"
                  : "text-[#6B7280] hover:text-[#1C1C1E]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "invoices"
                  ? "bg-[#2A5CAA] text-white shadow-2xs"
                  : "text-[#6B7280] hover:text-[#1C1C1E]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Invoices ({invoices.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "payments"
                  ? "bg-[#2A5CAA] text-white shadow-2xs"
                  : "text-[#6B7280] hover:text-[#1C1C1E]"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Receipts ({payments.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/app/billing/new?patientId=${patientId}`}
              prefetch={false}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#2A5CAA] hover:bg-[#1E4282] px-3 py-1.5 rounded-xl transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Invoice</span>
            </Link>
          </div>
        </div>

        {/* Tab Content */}
        <div className="overflow-x-auto">
          {/* TAB 1: FULL STATEMENT / LEDGER */}
          {activeTab === "ledger" && (
            <div>
              {chronologicalEntries.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B7280] space-y-1">
                  <CreditCard className="w-8 h-8 text-[#9CA3AF] mx-auto opacity-50" />
                  <p className="font-semibold text-[#1C1C1E]">
                    No ledger transactions recorded yet.
                  </p>
                  <p className="text-[11px]">
                    Invoices and payments generated for this patient will appear in this statement.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Doctor / Receiver</th>
                      <th className="py-3 px-4 text-right">Debit (৳)</th>
                      <th className="py-3 px-4 text-right">Credit (৳)</th>
                      <th className="py-3 px-4 text-right">Balance (৳)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {chronologicalEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`hover:bg-[#F9FAFB] transition ${
                          entry.type === "debit" ? "bg-white" : "bg-emerald-50/20"
                        }`}
                      >
                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-[#1C1C1E] block">
                            {formatDhakaDate(entry.date, "dd MMM yyyy")}
                          </span>
                          <span className="text-[10px] text-[#8E8E93]">
                            {formatDhakaDate(entry.date, "hh:mm a")}
                          </span>
                        </td>

                        {/* Reference & Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                                entry.type === "debit"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {entry.type === "debit" ? "INVOICE" : "PAYMENT"}
                            </span>
                            <span className="font-mono font-bold text-[#1C1C1E]">
                              {entry.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#6B7280] block mt-0.5">
                            {entry.description}
                          </span>
                          {entry.transactionRef && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Ref: {entry.transactionRef}
                            </span>
                          )}
                        </td>

                        {/* Doctor or Receiving Staff */}
                        <td className="py-3 px-4">
                          {entry.doctorName && (
                            <span className="flex items-center gap-1 text-[#1C1C1E] font-medium">
                              <Stethoscope className="w-3 h-3 text-[#2A5CAA]" />
                              <span>{formatDoctorName(entry.doctorName)}</span>
                            </span>
                          )}
                          {entry.receiverName && (
                            <span className="flex items-center gap-1 text-[#4B5563] text-[11px]">
                              <User className="w-3 h-3 text-[#8E8E93]" />
                              <span>Received by {entry.receiverName}</span>
                            </span>
                          )}
                          {!entry.doctorName && !entry.receiverName && (
                            <span className="text-[#8E8E93]">—</span>
                          )}
                        </td>

                        {/* Debit */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#1C1C1E]">
                          {entry.debitBdt > 0 ? (
                            <span className="text-[#1C1C1E]">
                              +{entry.debitBdt.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[#D1D5DB]">—</span>
                          )}
                        </td>

                        {/* Credit */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {entry.creditBdt > 0 ? (
                            <span>-{entry.creditBdt.toLocaleString()}</span>
                          ) : (
                            <span className="text-[#D1D5DB]">—</span>
                          )}
                        </td>

                        {/* Running Balance */}
                        <td className="py-3 px-4 text-right font-mono font-black">
                          <span
                            className={
                              entry.runningBalanceBdt > 0
                                ? "text-[#C0392B]"
                                : "text-emerald-700"
                            }
                          >
                            {formatBdt(entry.runningBalanceBdt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {entry.invoiceId && (
                            <div className="flex items-center justify-center gap-1.5">
                              {entry.type === "debit" && (entry.dueBdt ?? 0) > 0 && (
                                <Link
                                  href={`/app/billing/dues?invoiceId=${entry.invoiceId}`}
                                  prefetch={false}
                                  className="text-[10px] font-bold text-white bg-[#C0392B] hover:bg-[#A93226] px-2 py-0.5 rounded shadow-2xs"
                                >
                                  Pay
                                </Link>
                              )}
                              <Link
                                href={`/print/invoice/${entry.invoiceId}`}
                                prefetch={false}
                                target="_blank"
                                className="p-1 text-[#2A5CAA] hover:bg-blue-50 rounded transition"
                                title="Print Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: INVOICES LIST */}
          {activeTab === "invoices" && (
            <div>
              {invoices.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B7280]">
                  No invoices generated yet for this patient.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Attending Doctor</th>
                      <th className="py-3 px-4 text-right">Total (৳)</th>
                      <th className="py-3 px-4 text-right">Paid (৳)</th>
                      <th className="py-3 px-4 text-right">Due (৳)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {invoices.map((inv) => {
                      const due = Math.max(0, inv.totalBdt - inv.paidBdt);
                      const isUnpaid =
                        inv.status === "due" || inv.status === "partial" || due > 0;
                      return (
                        <tr key={inv.id} className="hover:bg-[#F9FAFB] transition">
                          <td className="py-3 px-4 font-mono font-bold text-[#1C1C1E]">
                            {inv.invoiceCode || "DRAFT"}
                          </td>
                          <td className="py-3 px-4 text-[#6B7280]">
                            {formatDhakaDate(inv.createdAt, "dd MMM yyyy")}
                          </td>
                          <td className="py-3 px-4">
                            {inv.doctorName ? (
                              <span className="font-medium text-[#1C1C1E]">
                                {formatDoctorName(inv.doctorName)}
                              </span>
                            ) : (
                              <span className="text-[#8E8E93]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#1C1C1E]">
                            {inv.totalBdt.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {inv.paidBdt.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={due > 0 ? "text-[#C0392B]" : "text-[#8E8E93]"}>
                              {due.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                inv.status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : inv.status === "partial"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : inv.status === "void"
                                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {isUnpaid && (
                                <Link
                                  href={`/app/billing/dues?invoiceId=${inv.id}`}
                                  prefetch={false}
                                  className="text-[10px] font-bold text-white bg-[#C0392B] hover:bg-[#A93226] px-2 py-0.5 rounded shadow-2xs"
                                >
                                  Pay Due
                                </Link>
                              )}
                              <Link
                                href={`/print/invoice/${inv.id}`}
                                prefetch={false}
                                target="_blank"
                                className="p-1 text-[#2A5CAA] hover:bg-blue-50 rounded transition"
                                title="Print Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Link>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingInvoice(inv)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="Delete invoice (Admin only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS LIST */}
          {activeTab === "payments" && (
            <div>
              {payments.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#6B7280]">
                  No payment receipts recorded yet for this patient.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <th className="py-3 px-4">Paid At</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4 text-right">Amount (৳)</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Trx Reference</th>
                      <th className="py-3 px-4">Received By</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7]">
                    {payments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-[#F9FAFB] transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-[#1C1C1E] block">
                            {formatDhakaDate(pmt.paidAt, "dd MMM yyyy")}
                          </span>
                          <span className="text-[10px] text-[#8E8E93]">
                            {formatDhakaDate(pmt.paidAt, "hh:mm a")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#1C1C1E]">
                          {pmt.invoiceCode || "DRAFT"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          ৳{pmt.amountBdt.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${methodBadge(
                              pmt.method
                            )}`}
                          >
                            {pmt.method.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#4B5563]">
                          {pmt.transactionRef || "—"}
                        </td>
                        <td className="py-3 px-4 text-[#1C1C1E]">
                          {pmt.receivedByName || "Reception Desk"}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] text-[11px] max-w-xs truncate">
                          {pmt.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Delete Invoice Modal */}
      {deletingInvoice && (
        <DeleteInvoiceModal
          isOpen={!!deletingInvoice}
          onClose={() => setDeletingInvoice(null)}
          invoiceId={deletingInvoice.id}
          invoiceCode={deletingInvoice.invoiceCode || "DRAFT"}
          patientName={patientName}
          totalBdt={deletingInvoice.totalBdt}
          paidBdt={deletingInvoice.paidBdt}
          onDeleted={() => {
            setDeletingInvoice(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
