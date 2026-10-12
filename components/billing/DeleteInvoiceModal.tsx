"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { deleteInvoiceAction } from "@/app/(tenant)/app/billing/actions";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatBdt } from "@/lib/utils";

interface DeleteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceCode?: string | null;
  patientName: string;
  totalBdt: number;
  paidBdt?: number;
  onDeleted?: () => void;
}

export function DeleteInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceCode,
  patientName,
  totalBdt,
  paidBdt = 0,
  onDeleted,
}: DeleteInvoiceModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteInvoiceAction(invoiceId);
      if (res?.success) {
        toast.success(`Invoice ${res.invoiceCode || invoiceCode} was deleted successfully`);
        if (onDeleted) {
          onDeleted();
        }
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#E4E4E7] overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-red-950">
                    Delete Invoice (Admin Only)
                  </h3>
                  <p className="text-xs text-red-700">
                    Safety confirmation required
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-red-700 hover:bg-red-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-red-50/60 border border-red-200/80 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900 space-y-1">
                  <p className="font-bold">
                    Are you sure you want to permanently delete this invoice?
                  </p>
                  <p className="text-red-800 leading-relaxed">
                    This will delete invoice <strong className="font-mono">{invoiceCode || "DRAFT"}</strong> for{" "}
                    <strong>{patientName}</strong> ({formatBdt(totalBdt)}
                    {paidBdt > 0 ? `, Paid: ${formatBdt(paidBdt)}` : ""}) along with its line items and payment logs.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#F4F4F5] text-xs text-[#6B7280]">
                <span className="font-bold text-[#1C1C1E]">Warning:</span> This action cannot be undone. Account balances and cashier totals will be updated automatically.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-[#E4E4E7] text-[#1C1C1E] font-bold text-xs hover:bg-[#F4F4F5] transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
