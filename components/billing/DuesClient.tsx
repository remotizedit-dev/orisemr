"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Printer,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdt } from "@/lib/utils";
import {
  sendDueReminderEmailAction,
  recordPaymentAction,
} from "@/app/(tenant)/app/billing/actions";

interface DueInvoice {
  id: string;
  code: string;
  totalBdt: number;
  paidBdt: number;
  dueBdt: number;
  createdAt: string;
  daysOverdue: number;
  lastReminderSentAt: string | null;
  patientId: string;
  patientName: string;
  patientCard: string;
  patientPhone: string;
  patientEmail: string | null;
}

interface Props {
  invoices: DueInvoice[];
  totalDuesSum: number;
}

export default function DuesClient({ invoices, totalDuesSum }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceIdParam = searchParams.get("invoiceId");
  const [agingFilter, setAgingFilter] = useState<"all" | "recent" | "medium" | "old">("all");
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Quick Payment Modal state
  const [paymentInvoice, setPaymentInvoice] = useState<DueInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "card">("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  useEffect(() => {
    if (invoiceIdParam) {
      const target = invoices.find((inv) => inv.id === invoiceIdParam);
      if (target) {
        setPaymentInvoice(target);
        setPaymentAmount(target.dueBdt);
      }
    }
  }, [invoiceIdParam, invoices]);

  const filteredInvoices = invoices.filter((inv) => {
    if (agingFilter === "recent") return inv.daysOverdue <= 7;
    if (agingFilter === "medium") return inv.daysOverdue > 7 && inv.daysOverdue <= 30;
    if (agingFilter === "old") return inv.daysOverdue > 30;
    return true;
  });

  async function handleSendReminder(inv: DueInvoice) {
    if (!inv.patientEmail) {
      toast.error("Patient has no email address on file.");
      return;
    }

    try {
      setSendingReminderId(inv.id);
      await sendDueReminderEmailAction(inv.id);
      toast.success(`Due reminder email queued for ${inv.patientName}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminder email");
    } finally {
      setSendingReminderId(null);
    }
  }

  async function handleRecordPayment() {
    if (!paymentInvoice || paymentAmount <= 0) {
      toast.error("Please specify a valid payment amount");
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await recordPaymentAction({
        invoiceId: paymentInvoice.id,
        amountBdt: paymentAmount,
        method: paymentMethod,
        transactionRef,
      });

      toast.success("Payment recorded successfully!");
      setPaymentInvoice(null);
      setPaymentAmount(0);
      setTransactionRef("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  function canSendReminder(lastSent: string | null) {
    if (!lastSent) return true;
    const elapsed = Date.now() - new Date(lastSent).getTime();
    return elapsed >= 24 * 60 * 60 * 1000;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/billing"
            className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">
              Outstanding Dues Aging
            </h1>
            <p className="text-xs text-[#6B7280]">
              Patient accounts receivable, aging brackets, and automated email reminders.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#FFEBEA] border border-[#FF453A]/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#FF453A]" />
          <div>
            <span className="text-[10px] uppercase font-bold text-[#FF453A] tracking-wider block">
              Total Outstanding Balance
            </span>
            <span className="text-lg font-black text-[#FF453A]">
              {formatBdt(totalDuesSum)}
            </span>
          </div>
        </div>
      </div>

      {/* Aging Filter Tabs */}
      <div className="flex items-center gap-2 glass-panel p-2 rounded-2xl border border-[#E4E4E7]">
        {[
          { key: "all", label: `All Dues (${invoices.length})` },
          {
            key: "recent",
            label: `0 - 7 Days (${invoices.filter((i) => i.daysOverdue <= 7).length})`,
          },
          {
            key: "medium",
            label: `8 - 30 Days (${invoices.filter((i) => i.daysOverdue > 7 && i.daysOverdue <= 30).length})`,
          },
          {
            key: "old",
            label: `30+ Days (${invoices.filter((i) => i.daysOverdue > 30).length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAgingFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              agingFilter === tab.key
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#1C1C1E] hover:bg-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dues List */}
      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Aging Bracket</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#6B7280]">
                    No outstanding dues in this category. All clear!
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const eligibleForReminder =
                    inv.patientEmail && canSendReminder(inv.lastReminderSentAt);

                  return (
                    <tr key={inv.id} className="hover:bg-white/70 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-[#2A5CAA] block">
                          {inv.code}
                        </span>
                        <span className="text-[10px] text-[#6B7280]">
                          {inv.createdAt}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          href={`/app/patients/${inv.patientId}`}
                          className="font-bold text-xs text-[#1C1C1E] hover:underline block"
                        >
                          {inv.patientName}
                        </Link>
                        <span className="text-[11px] text-[#6B7280]">
                          {inv.patientPhone} {inv.patientCard && `• ${inv.patientCard}`}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            inv.daysOverdue > 30
                              ? "bg-[#FFEBEA] text-[#FF453A]"
                              : inv.daysOverdue > 7
                              ? "bg-[#FFF7EB] text-[#FF9F0A]"
                              : "bg-[#F4F4F5] text-[#6B7280]"
                          }`}
                        >
                          {inv.daysOverdue} Days Ago
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-xs text-[#1C1C1E]">
                        {formatBdt(inv.totalBdt)}
                      </td>

                      <td className="py-3 px-4 text-xs text-[#30D158] font-semibold">
                        {formatBdt(inv.paidBdt)}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-xs text-[#FF453A]">
                        {formatBdt(inv.dueBdt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setPaymentInvoice(inv);
                              setPaymentAmount(inv.dueBdt);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#E8F8EE] text-[#30D158] hover:bg-[#D4F4DF] text-xs font-bold transition flex items-center gap-1"
                            title="Collect Payment"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Collect</span>
                          </button>

                          <button
                            onClick={() => handleSendReminder(inv)}
                            disabled={
                              !eligibleForReminder ||
                              sendingReminderId === inv.id
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E4E4E7] text-[#2A5CAA] hover:bg-[#F4F4F5] text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            title={
                              !inv.patientEmail
                                ? "No email on file"
                                : !canSendReminder(inv.lastReminderSentAt)
                                ? "Reminder sent in last 24h"
                                : "Send email reminder"
                            }
                          >
                            {sendingReminderId === inv.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Mail className="w-3 h-3" />
                            )}
                            <span>Remind</span>
                          </button>

                          <Link
                            href={`/print/invoice/${inv.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#1C1C1E] transition"
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Payment Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1C1C1E]">
              Collect Due Payment
            </h3>
            <p className="text-xs text-[#6B7280]">
              Patient: <strong>{paymentInvoice.patientName}</strong> • Due:{" "}
              <strong className="text-[#FF453A]">{formatBdt(paymentInvoice.dueBdt)}</strong>
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                  Payment Amount (৳)
                </label>
                <input
                  type="number"
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  max={paymentInvoice.dueBdt}
                  min={1}
                  className="w-full px-3 py-2 text-sm font-bold border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="card">Bank POS / Card</option>
                </select>
              </div>

              {paymentMethod !== "cash" && (
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">
                    Transaction ID / Reference
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. 9J2831KL"
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={isSubmittingPayment}
                className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#28B84D] text-white text-xs font-bold shadow-xs transition"
              >
                Record {formatBdt(paymentAmount)} Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
