"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { deletePatientAction } from "@/app/(tenant)/app/patients/actions";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface DeletePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  cardNumber: string;
  onDeleted?: () => void;
}

export function DeletePatientModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  cardNumber,
  onDeleted,
}: DeletePatientModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deletePatientAction(patientId);
      if (res?.success) {
        toast.success(`Patient ${patientName} (${cardNumber}) was archived/deleted`);
        if (onDeleted) {
          onDeleted();
        }
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete patient");
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
                    Delete Patient Record
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
                    Are you sure you want to delete this patient?
                  </p>
                  <p className="text-red-800 leading-relaxed">
                    This will archive the record for{" "}
                    <strong>{patientName}</strong> (Card:{" "}
                    <span className="font-mono font-bold">{cardNumber}</span>) and remove them from active clinic waiting queues.
                  </p>
                  <p className="text-[11px] text-red-700 pt-1">
                    Historical prescriptions, dental charts, and billing invoices will remain safely archived for clinic audits.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 sm:p-5 bg-[#F8FAFC] border-t border-[#E4E4E7] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#1C1C1E] font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Patient</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
