"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Stethoscope,
  ArrowRightLeft,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { reassignPatientDoctorAction } from "@/app/(tenant)/app/patients/actions";
import { reassignQueueDoctorAction } from "@/app/(tenant)/app/queue/actions";
import { reassignAppointmentDoctorAction } from "@/app/(tenant)/app/appointments/actions";

interface DoctorOption {
  id: string;
  name: string;
}

interface SwitchDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  appointmentId?: string;
  queueEntryId?: string;
  patientName: string;
  currentDoctorId?: string | null;
  currentDoctorName?: string | null;
  doctors: DoctorOption[];
  onSuccess?: (newDoctorId: string, newDoctorName: string) => void;
}

export function SwitchDoctorModal({
  isOpen,
  onClose,
  patientId,
  appointmentId,
  queueEntryId,
  patientName,
  currentDoctorId,
  currentDoctorName,
  doctors,
  onSuccess,
}: SwitchDoctorModalProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableDoctors = doctors.filter((d) => d.id !== currentDoctorId);

  const quickReasons = [
    "Attending doctor has to leave / emergency",
    "Doctor is currently free / faster treatment",
    "Patient requested doctor switch",
    "Complex case transfer to specialist",
  ];

  const handleConfirm = async () => {
    if (!selectedDoctorId) {
      toast.error("Please select a doctor to switch to");
      return;
    }

    const selectedDoc = doctors.find((d) => d.id === selectedDoctorId);
    const targetName = selectedDoc?.name || "Doctor";

    setIsSubmitting(true);
    try {
      if (queueEntryId) {
        await reassignQueueDoctorAction(queueEntryId, selectedDoctorId);
      } else if (appointmentId) {
        await reassignAppointmentDoctorAction(appointmentId, selectedDoctorId);
      } else if (patientId) {
        await reassignPatientDoctorAction(patientId, selectedDoctorId, reason);
      } else {
        throw new Error("No target patient, queue, or appointment specified");
      }

      toast.success(
        `Doctor switched to Dr. ${targetName}! ${patientName} has been reassigned.`
      );
      if (onSuccess) {
        onSuccess(selectedDoctorId, targetName);
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to switch doctor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#E2E8F0] bg-gradient-to-r from-blue-50/70 via-white to-amber-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2A5CAA] text-white flex items-center justify-center shadow-md shadow-[#2A5CAA]/20">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0F172A] tracking-tight">
                    Switch Attending Doctor
                  </h3>
                  <p className="text-xs text-[#64748B] font-medium">
                    Reassign patient between chamber dentists
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Patient & Current Doctor Pill */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] block">
                    Patient
                  </span>
                  <span className="text-base font-black text-[#0F172A]">
                    {patientName}
                  </span>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] block">
                    Current Doctor
                  </span>
                  <span className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg inline-block font-mono">
                    {currentDoctorName || "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Select New Doctor */}
              <div className="space-y-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-[#334155] flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-[#2A5CAA]" />
                  <span>Select New Attending Doctor:</span>
                </label>

                {availableDoctors.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>No other active dentists found in this clinic to switch to.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableDoctors.map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelectedDoctorId(doc.id)}
                          className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/70 border-[#2A5CAA] shadow-xs ring-1 ring-[#2A5CAA]"
                              : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                                isSelected
                                  ? "bg-[#2A5CAA] text-white"
                                  : "bg-[#F1F5F9] text-[#475569]"
                              }`}
                            >
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-extrabold text-sm text-[#0F172A] block">
                                {doc.name}
                              </span>
                              <span className="text-[11px] font-medium text-emerald-700">
                                Available in Chamber
                              </span>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "bg-[#2A5CAA] border-[#2A5CAA] text-white"
                                : "border-[#CBD5E1] bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Reason Snippets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#475569] block">
                  Quick Reason (Optional):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickReasons.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      onClick={() => setReason(qr)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        reason === qr
                          ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                          : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] hover:bg-[#E2E8F0]"
                      }`}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#475569] font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedDoctorId || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-black text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reassigning...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Confirm Doctor Switch</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
