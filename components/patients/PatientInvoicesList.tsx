"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatBdt, formatDhakaDate } from "@/lib/utils";
import { DeleteInvoiceModal } from "@/components/billing/DeleteInvoiceModal";

export interface PatientInvoiceItem {
  id: string;
  invoiceCode: string | null;
  totalBdt: number;
  paidBdt: number;
  status: string;
  createdAt: Date;
}

interface PatientInvoicesListProps {
  invoices: PatientInvoiceItem[];
  patientName: string;
  isAdmin?: boolean;
}

export function PatientInvoicesList({
  invoices,
  patientName,
  isAdmin = false,
}: PatientInvoicesListProps) {
  const router = useRouter();
  const [deletingInvoice, setDeletingInvoice] = useState<PatientInvoiceItem | null>(null);

  if (invoices.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-[#6B7280]">
        No invoices generated yet.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[#E4E4E7] text-xs">
        {invoices.map((inv) => {
          const dueBdt = inv.totalBdt - inv.paidBdt;
          const isUnpaid = inv.status === "due" || inv.status === "partial" || dueBdt > 0;
          return (
            <div key={inv.id} className="py-3 flex items-center justify-between gap-2 group">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[#1C1C1E]">
                    {inv.invoiceCode || "DRAFT"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      inv.status === "paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : inv.status === "partial"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {inv.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] text-[#6B7280] block mt-0.5">
                  {formatDhakaDate(inv.createdAt, "dd MMM yyyy")}
                </span>
                {isUnpaid && (
                  <span className="text-[11px] text-[#C0392B] font-semibold block">
                    Due: {formatBdt(dueBdt)}
                  </span>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <span className="font-bold text-[#1C1C1E]">
                  {formatBdt(inv.totalBdt)}
                </span>
                <div className="flex items-center gap-2">
                  {isUnpaid && (
                    <Link
                      href={`/app/billing/dues?invoiceId=${inv.id}`}
                      prefetch={false}
                      className="text-[11px] font-bold text-[#C0392B] hover:underline bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                    >
                      Pay Due
                    </Link>
                  )}
                  <Link
                    href={`/print/invoice/${inv.id}`}
                    prefetch={false}
                    target="_blank"
                    className="text-[11px] text-[#2A5CAA] hover:underline"
                  >
                    Print →
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeletingInvoice(inv)}
                      className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                      title="Delete invoice (Admin only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
    </>
  );
}
