"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Printer,
  Search,
  Stethoscope,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdt, formatDoctorName } from "@/lib/utils";
import PaginationControls from "@/components/ui/PaginationControls";
import { recordPaymentAction } from "@/app/(tenant)/app/billing/actions";

export interface InvoiceRow {
  id: string;
  code: string | null;
  totalBdt: number;
  paidBdt: number;
  status: "draft" | "due" | "partial" | "paid" | "void";
  createdAt: Date;
  patientId: string;
  patientName: string;
  patientCard: string;
  doctorId?: string | null;
  doctorName?: string | null;
}

interface InvoicesListClientProps {
  invoices: InvoiceRow[];
  doctors?: { id: string; name: string }[];
  currentUserId?: string;
  isDoctor?: boolean;
  isAdmin?: boolean;
}

export default function InvoicesListClient({
  invoices,
  doctors = [],
  currentUserId,
  isDoctor = false,
  isAdmin = false,
}: InvoicesListClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Take Payment Modal state
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "card">("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  function openPaymentModal(inv: InvoiceRow) {
    const due = Math.max(0, inv.totalBdt - inv.paidBdt);
    setPaymentInvoice(inv);
    setPaymentAmount(due);
    setPaymentMethod("cash");
    setTransactionRef("");
    setPaymentNote("");
  }

  function closePaymentModal() {
    setPaymentInvoice(null);
    setIsSubmittingPayment(false);
  }

  async function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentInvoice) return;

    const due = Math.max(0, paymentInvoice.totalBdt - paymentInvoice.paidBdt);

    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than ৳0");
      return;
    }

    if (paymentAmount > due) {
      toast.error(`Payment cannot exceed outstanding due of ${formatBdt(due)}`);
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await recordPaymentAction({
        invoiceId: paymentInvoice.id,
        amountBdt: paymentAmount,
        method: paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        note: paymentNote.trim() || undefined,
      });

      toast.success(
        `Successfully collected ${formatBdt(paymentAmount)} payment for invoice ${paymentInvoice.code || "INV"}!`
      );
      closePaymentModal();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
      setIsSubmittingPayment(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    // Status filter
    if (statusFilter !== "all" && inv.status !== statusFilter) {
      return false;
    }

    // Doctor filter
    if (doctorFilter === "mine") {
      if (inv.doctorId !== currentUserId) return false;
    } else if (doctorFilter === "unassigned") {
      if (inv.doctorId) return false;
    } else if (doctorFilter !== "all") {
      if (inv.doctorId !== doctorFilter) return false;
    }

    // Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (inv.code && inv.code.toLowerCase().includes(q)) ||
      inv.patientName.toLowerCase().includes(q) ||
      inv.patientCard.toLowerCase().includes(q) ||
      (inv.doctorName && inv.doctorName.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedInvoices = filteredInvoices.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function handleSearchChange(val: string) {
    setSearch(val);
    setCurrentPage(1);
  }

  function handleStatusChange(st: string) {
    setStatusFilter(st);
    setCurrentPage(1);
  }

  function handleDoctorChange(docId: string) {
    setDoctorFilter(docId);
    setCurrentPage(1);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Search, Doctor Filter, and Status Filters */}
      <div className="glass-panel p-4 rounded-3xl border border-[#E4E4E7] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4.5 h-4.5 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search code, patient, card, doctor..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-[#E4E4E7] text-xs text-[#1C1C1E] focus:outline-hidden focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition shadow-2xs font-medium placeholder:text-[#6B7280]"
            />
          </div>

          {/* Doctor Filter (Admins only) */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={doctorFilter}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="py-2 pl-3 pr-8 rounded-2xl bg-white border border-[#E4E4E7] text-xs font-bold text-[#1C1C1E] focus:outline-hidden focus:border-[#2A5CAA] shadow-2xs cursor-pointer"
                >
                  <option value="all">👨‍⚕️ All Doctors</option>
                  {isDoctor && currentUserId && (
                    <option value="mine">⭐ My Invoices Only</option>
                  )}
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {formatDoctorName(doc.name)}
                    </option>
                  ))}
                  <option value="unassigned">General Clinic (Unassigned)</option>
                </select>
              </div>

              {doctorFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => handleDoctorChange("all")}
                  className="text-xs text-[#6B7280] hover:text-[#1C1C1E] underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 bg-[#F4F4F5] p-1.5 rounded-2xl text-xs flex-wrap self-start sm:self-auto">
          {["all", "due", "partial", "paid"].map((st) => {
            const count = invoices.filter((inv) => {
              if (doctorFilter === "mine" && inv.doctorId !== currentUserId) return false;
              if (doctorFilter === "unassigned" && inv.doctorId) return false;
              if (doctorFilter !== "all" && doctorFilter !== "mine" && doctorFilter !== "unassigned" && inv.doctorId !== doctorFilter) return false;
              return st === "all" ? true : inv.status === st;
            }).length;

            return (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === st
                    ? "bg-white text-[#1C1C1E] shadow-2xs"
                    : "text-[#6B7280] hover:text-[#1C1C1E]"
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    statusFilter === st
                      ? "bg-[#2A5CAA] text-white"
                      : "bg-black/5 text-[#6B7280]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="glass-panel rounded-3xl border border-[#E4E4E7] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]/70 text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                <th className="py-4 px-4">Invoice Code</th>
                <th className="py-4 px-4">Patient Name</th>
                <th className="py-4 px-4">Attending Doctor</th>
                <th className="py-4 px-4">Total Amount</th>
                <th className="py-4 px-4">Paid</th>
                <th className="py-4 px-4">Due Balance</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#6B7280]">
                    {search || statusFilter !== "all" || doctorFilter !== "all" ? (
                      <div>No invoices match your selected search or filters.</div>
                    ) : (
                      <div>No invoices generated yet. Click &quot;Create New Invoice&quot; to begin.</div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const due = Math.max(0, inv.totalBdt - inv.paidBdt);
                  const isMyInvoice = currentUserId && inv.doctorId === currentUserId;

                  return (
                    <tr key={inv.id} className="hover:bg-white/80 transition group">
                      <td className="py-4 px-4 font-mono text-xs font-bold text-[#2A5CAA]">
                        {inv.code || "DRAFT"}
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          href={`/app/patients/${inv.patientId}`}
                          prefetch={false}
                          className="font-bold text-sm text-[#1C1C1E] group-hover:text-[#2A5CAA] group-hover:underline block"
                        >
                          {inv.patientName}
                        </Link>
                        <span className="text-xs text-[#6B7280] font-mono">
                          Card: {inv.patientCard}
                        </span>
                      </td>

                      {/* Attending Doctor attribution */}
                      <td className="py-4 px-4">
                        {inv.doctorName ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1C1C1E] bg-[#EBF2FC] text-[#2A5CAA] px-2.5 py-1 rounded-xl">
                              <Stethoscope className="w-3 h-3 text-[#2A5CAA] shrink-0" />
                              <span>{inv.doctorName.startsWith("Dr.") ? inv.doctorName : `Dr. ${inv.doctorName}`}</span>
                            </span>
                            {isMyInvoice && (
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#2A5CAA] text-white">
                                You
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#8E8E93] italic">
                            General Clinic
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-bold text-sm text-[#1C1C1E]">
                        {formatBdt(inv.totalBdt)}
                      </td>
                      <td className="py-4 px-4 text-sm text-[#30D158] font-semibold">
                        {formatBdt(inv.paidBdt)}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-[#FF453A]">
                        {formatBdt(due)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
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
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {due > 0 && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(inv)}
                              className="px-3 py-1.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                              title="Take payment directly on this invoice"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Take Payment</span>
                            </button>
                          )}
                          <Link
                            href={`/print/invoice/${inv.id}`}
                            prefetch={false}
                            target="_blank"
                            className="px-3 py-1.5 rounded-xl bg-[#F4F4F5] hover:bg-[#2A5CAA] hover:text-white text-xs font-bold text-[#1C1C1E] inline-flex items-center gap-1.5 transition shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
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

      {/* Pagination Controls */}
      {filteredInvoices.length > 0 && (
        <PaginationControls
          currentPage={safePage}
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[25, 100]}
        />
      )}

      {/* Quick Take Payment Modal (Doctors & Staff can take payment directly) */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E4E7] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
              <div>
                <h3 className="text-base font-black text-[#1C1C1E] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#2A5CAA]" />
                  <span>Collect Payment</span>
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Invoice <strong className="font-mono text-[#2A5CAA]">{paymentInvoice.code || "INV"}</strong> for{" "}
                  <strong>{paymentInvoice.patientName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="p-1 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#6B7280]">Total Invoice:</span>
                <span className="font-bold text-[#1C1C1E]">{formatBdt(paymentInvoice.totalBdt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6B7280]">Previously Paid:</span>
                <span className="font-bold text-[#30D158]">{formatBdt(paymentInvoice.paidBdt)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-[#E2E8F0]">
                <span className="text-[#FF453A]">Outstanding Due:</span>
                <span className="text-[#FF453A]">
                  {formatBdt(paymentInvoice.totalBdt - paymentInvoice.paidBdt)}
                </span>
              </div>
              {paymentInvoice.doctorName && (
                <div className="flex justify-between text-[11px] pt-1 text-[#2A5CAA] font-medium">
                  <span>Attending Doctor:</span>
                  <span className="font-bold">{paymentInvoice.doctorName}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              {/* Payment Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C1C1E] block">
                  Payment Amount (৳ BDT) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={paymentInvoice.totalBdt - paymentInvoice.paidBdt}
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="Enter amount to collect..."
                  required
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#E4E4E7] text-base font-bold text-[#1C1C1E] focus:outline-hidden focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#2A5CAA]/20"
                />

                {/* Shortcut Pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentAmount(paymentInvoice.totalBdt - paymentInvoice.paidBdt)
                    }
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#EBF2FC] text-[#2A5CAA] hover:bg-[#D7E6FA] transition cursor-pointer"
                  >
                    Full Due ({formatBdt(paymentInvoice.totalBdt - paymentInvoice.paidBdt)})
                  </button>
                  {[500, 1000, 2000].map((amt) => {
                    const due = paymentInvoice.totalBdt - paymentInvoice.paidBdt;
                    if (amt >= due) return null;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPaymentAmount(amt)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-[#F4F4F5] text-[#4B5563] hover:bg-[#E4E4E7] transition cursor-pointer"
                      >
                        ৳{amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C1C1E] block">
                  Payment Method *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["cash", "bkash", "nagad", "card"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold uppercase transition cursor-pointer border ${
                        paymentMethod === m
                          ? "bg-[#2A5CAA] text-white border-[#2A5CAA] shadow-xs"
                          : "bg-white text-[#4B5563] border-[#E4E4E7] hover:bg-[#F4F4F5]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Ref */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C1C1E] block">
                  Transaction Ref / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. bKash TrxID, Pos receipt #..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4E4E7] text-xs text-[#1C1C1E] focus:outline-hidden focus:border-[#2A5CAA]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#4B5563] hover:bg-[#F4F4F5] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment || paymentAmount <= 0}
                  className="px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-black shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm &amp; Record {formatBdt(paymentAmount)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
