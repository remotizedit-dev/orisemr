"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toggleTenantStatusAction } from "@/app/(platform)/platform/tenants/actions";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  Power,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface TenantStatusToggleProps {
  tenantId: string;
  tenantName: string;
  currentStatus: "active" | "suspended";
  suspendedReason?: string | null;
  suspendedAt?: Date | string | null;
}

export function TenantStatusToggle({
  tenantId,
  tenantName,
  currentStatus,
  suspendedReason,
  suspendedAt,
}: TenantStatusToggleProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async (newStatus: "active" | "suspended") => {
    setIsSubmitting(true);
    try {
      const res = await toggleTenantStatusAction(
        tenantId,
        newStatus,
        newStatus === "suspended" ? reason : undefined
      );

      if (res?.success) {
        toast.success(
          newStatus === "suspended"
            ? `Access turned off for "${tenantName}". Staff sessions revoked immediately.`
            : `Access reactivated for "${tenantName}". Portal and booking restored.`
        );
        setIsModalOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(res?.error || "Failed to update tenant status.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update tenant status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {currentStatus === "active" ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          title="Turn off clinic access (suspends staff logins and public booking)"
        >
          <Ban className="w-3.5 h-3.5 text-red-500" />
          <span>Turn Off Access (Suspend)</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleToggle("active")}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#28B84D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
          title="Reactivate clinic access and restore staff login and booking"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>Reactivate Clinic Access</span>
        </button>
      )}

      {/* Confirmation Modal to Turn Off Access */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#E4E4E7] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                    <Power className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-red-950">
                      Turn Off Clinic Access
                    </h3>
                    <p className="text-xs text-red-700">
                      Suspend &ldquo;{tenantName}&rdquo;
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200/80 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-900 space-y-1.5">
                    <p className="font-bold">
                      What happens when you turn off access:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-red-800">
                      <li>
                        <strong>All staff logins blocked:</strong> Doctors, receptionists, and clinic admins are immediately logged out and cannot log in.
                      </li>
                      <li>
                        <strong>Public booking disabled:</strong> Online patient booking page will immediately return 404 (Not Found).
                      </li>
                      <li>
                        <strong>Data preserved:</strong> All clinical records, prescriptions, and patient data remain safely stored in the database.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Reason Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1C1C1E]">
                    Reason for Suspension (Optional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Overdue monthly subscription fee, Plan expired"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-sm text-[#1C1C1E] focus:outline-none focus:border-red-500 font-medium"
                  />
                  <p className="text-[11px] text-[#6B7280]">
                    Visible to Super Admins in audit records and tenant history.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 bg-[#F8FAFC] border-t border-[#E4E4E7] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#1C1C1E] font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle("suspended")}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Suspending...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Confirm Turn Off Access</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
