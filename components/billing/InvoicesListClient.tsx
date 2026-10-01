"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Printer, Search, FileText } from "lucide-react";
import { formatBdt } from "@/lib/utils";
import PaginationControls from "@/components/ui/PaginationControls";

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
}

interface InvoicesListClientProps {
  invoices: InvoiceRow[];
}

export default function InvoicesListClient({ invoices }: InvoicesListClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredInvoices = invoices.filter((inv) => {
    // Status filter
    if (statusFilter !== "all" && inv.status !== statusFilter) {
      return false;
    }

    // Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (inv.code && inv.code.toLowerCase().includes(q)) ||
      inv.patientName.toLowerCase().includes(q) ||
      inv.patientCard.toLowerCase().includes(q)
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

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Search and Status Filters */}
      <div className="glass-panel p-4 rounded-3xl border border-[#E4E4E7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-5 h-5 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search invoice code, patient, or card #..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border border-[#E4E4E7] text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition shadow-2xs font-medium placeholder:text-[#6B7280]"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 bg-[#F4F4F5] p-1.5 rounded-2xl text-xs flex-wrap">
          {["all", "due", "partial", "paid"].map((st) => {
            const count = invoices.filter((inv) =>
              st === "all" ? true : inv.status === st
            ).length;

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
                <th className="py-4 px-5">Invoice Code</th>
                <th className="py-4 px-5">Patient Name</th>
                <th className="py-4 px-5">Total Amount</th>
                <th className="py-4 px-5">Paid</th>
                <th className="py-4 px-5">Due Balance</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#6B7280]">
                    {search || statusFilter !== "all" ? (
                      <div>No invoices match your selected search or filter.</div>
                    ) : (
                      <div>No invoices generated yet. Click &quot;Create New Invoice&quot; to begin.</div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const due = inv.totalBdt - inv.paidBdt;
                  return (
                    <tr key={inv.id} className="hover:bg-white/80 transition group">
                      <td className="py-4 px-5 font-mono text-xs font-bold text-[#2A5CAA]">
                        {inv.code || "DRAFT"}
                      </td>
                      <td className="py-4 px-5">
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
                      <td className="py-4 px-5 font-bold text-sm text-[#1C1C1E]">
                        {formatBdt(inv.totalBdt)}
                      </td>
                      <td className="py-4 px-5 text-sm text-[#30D158] font-semibold">
                        {formatBdt(inv.paidBdt)}
                      </td>
                      <td className="py-4 px-5 text-sm font-bold text-[#FF453A]">
                        {formatBdt(due)}
                      </td>
                      <td className="py-4 px-5">
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
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {due > 0 && (
                            <Link
                              href={`/app/billing/dues?invoiceId=${inv.id}`}
                              prefetch={false}
                              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                              title="Collect payment on remaining due"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Due</span>
                            </Link>
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
    </div>
  );
}
