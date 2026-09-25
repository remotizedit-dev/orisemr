"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPatientProfileHistoryAction } from "@/app/(tenant)/app/patients/actions";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Phone,
  Printer,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdPhone, formatBdt } from "@/lib/utils";

interface PatientProfileModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onCopyPrescriptionItems?: (items: any[]) => void;
}

export function PatientProfileModal({
  patientId,
  isOpen,
  onClose,
  onCopyPrescriptionItems,
}: PatientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"prescriptions" | "reports" | "visits" | "billing">("prescriptions");
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !patientId) return;

    let isMounted = true;
    setLoading(true);

    getPatientProfileHistoryAction(patientId)
      .then((data) => {
        if (isMounted) {
          setProfileData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          toast.error("Failed to load patient history");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, patientId]);

  const patient = profileData?.patient;
  const prescriptions = profileData?.prescriptions || [];
  const appointments = profileData?.appointments || [];
  const invoices = profileData?.invoices || [];
  const attachments = profileData?.attachments || [];

  const totalDue = invoices
    .filter((inv: any) => inv.status === "due" || inv.status === "partial")
    .reduce((acc: number, inv: any) => acc + (inv.totalBdt - inv.paidBdt), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 360, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E4E4E7] overflow-hidden"
          >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-[#E4E4E7] flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#1C1C1E]">
                  {patient?.name || "Patient Profile"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#4B5563]">
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#E4E4E7] text-[#2A5CAA] font-bold">
                    Card: {patient?.cardNumber || "—"}
                  </span>
                  <span>•</span>
                  <span>{patient?.approxAge ? `${patient.approxAge} yrs` : "Age —"}</span>
                  <span>•</span>
                  <span className="capitalize">{patient?.gender || "—"}</span>
                  {patient?.bloodGroup && (
                    <>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                        {patient.bloodGroup}
                      </span>
                    </>
                  )}
                  {patient?.phone && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{formatBdPhone(patient.phone)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Allergies and Conditions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {patient?.allergyFlags?.length > 0 ? (
                patient.allergyFlags.map((flag: string) => (
                  <span
                    key={flag}
                    className="px-2 py-0.5 rounded-lg bg-[#FFEBEA] text-[#FF453A] border border-[#FF453A]/30 text-xs font-bold"
                  >
                    Allergy: {flag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#6B7280]">No known drug allergies</span>
              )}

              {patient?.medicalConditions?.length > 0 &&
                patient.medicalConditions.map((cond: string) => (
                  <span
                    key={cond}
                    className="px-2 py-0.5 rounded-lg bg-[#FFF7EB] text-[#FF9F0A] border border-[#FF9F0A]/30 text-xs font-bold"
                  >
                    {cond}
                  </span>
                ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B7280] hover:text-[#1C1C1E] hover:bg-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#E4E4E7] bg-white text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("prescriptions")}
            className={`px-4 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "prescriptions"
                ? "border-[#2A5CAA] text-[#2A5CAA] bg-[#F8FAFC]"
                : "border-transparent text-[#6B7280] hover:text-[#1C1C1E]"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Past Prescriptions ({prescriptions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "reports"
                ? "border-[#2A5CAA] text-[#2A5CAA] bg-[#F8FAFC]"
                : "border-transparent text-[#6B7280] hover:text-[#1C1C1E]"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Reports &amp; X-Rays ({attachments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("visits")}
            className={`px-4 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "visits"
                ? "border-[#2A5CAA] text-[#2A5CAA] bg-[#F8FAFC]"
                : "border-transparent text-[#6B7280] hover:text-[#1C1C1E]"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Visit History ({appointments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "billing"
                ? "border-[#2A5CAA] text-[#2A5CAA] bg-[#F8FAFC]"
                : "border-transparent text-[#6B7280] hover:text-[#1C1C1E]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Invoices &amp; Balance {totalDue > 0 && `(Due ৳${totalDue})`}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-[#FAFAFA]">
          {loading ? (
            <div className="py-16 text-center text-[#6B7280] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#2A5CAA]" />
              <p className="text-xs font-semibold">Loading patient records...</p>
            </div>
          ) : (
            <>
              {/* Prescriptions Tab */}
              {activeTab === "prescriptions" && (
                <div className="space-y-4">
                  {prescriptions.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-[#6B7280] bg-white rounded-2xl border border-dashed border-[#E4E4E7]">
                      No previous prescriptions recorded for this patient.
                    </div>
                  ) : (
                    prescriptions.map((rx: any) => (
                      <div
                        key={rx.id}
                        className="p-4 rounded-2xl bg-white border border-[#E4E4E7] shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#F4F4F5]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded">
                              {rx.rxCode}
                            </span>
                            <span className="text-xs text-[#6B7280]">
                              {new Date(rx.createdAt).toLocaleDateString([], {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-[#4B5563]">
                            Dr. {rx.doctorName}
                          </span>
                        </div>

                        {rx.diagnosis && (
                          <div className="text-xs">
                            <span className="font-bold text-[#1C1C1E]">Diagnosis: </span>
                            <span className="text-[#4B5563]">{rx.diagnosis}</span>
                          </div>
                        )}

                        {rx.items?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase text-[#6B7280] tracking-wider block">
                              Prescribed Medicines:
                            </span>
                            <div className="bg-[#F8FAFC] p-2.5 rounded-xl space-y-1">
                              {rx.items.map((line: string, i: number) => (
                                <p key={i} className="text-xs font-medium text-[#1C1C1E]">
                                  • {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <a
                            href={`/print/prescription/${rx.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl border border-[#E4E4E7] text-xs font-bold text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] flex items-center gap-1.5 transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#2A5CAA]" />
                            <span>Print Rx ↗</span>
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Reports & X-Rays Tab */}
              {activeTab === "reports" && (
                <div className="space-y-4">
                  {attachments.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-[#6B7280] bg-white rounded-2xl border border-dashed border-[#E4E4E7]">
                      No X-rays, blood reports, or clinical documents uploaded yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {attachments.map((att: any) => (
                        <div
                          key={att.id}
                          className="p-3.5 rounded-2xl bg-white border border-[#E4E4E7] shadow-xs space-y-2.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#E8EEF7] text-[#2A5CAA]">
                                {att.kind.replace("_", " ")}
                              </span>
                              <span className="font-mono text-[10px] text-[#6B7280]">
                                {att.reportCode || "DOC"}
                              </span>
                            </div>

                            <p className="font-bold text-sm text-[#1C1C1E] mt-2 line-clamp-2">
                              {att.title}
                            </p>
                            <p className="text-[11px] text-[#6B7280]">
                              {new Date(att.uploadedAt).toLocaleDateString([], {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>

                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2 px-3 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#2A5CAA] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Full Document ↗</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Visits Tab */}
              {activeTab === "visits" && (
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-[#6B7280] bg-white rounded-2xl border border-dashed border-[#E4E4E7]">
                      No appointment history found.
                    </div>
                  ) : (
                    appointments.map((apt: any) => (
                      <div
                        key={apt.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#E4E4E7] shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center font-bold">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#1C1C1E]">
                              {new Date(apt.startTime).toLocaleDateString([], {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at{" "}
                              {new Date(apt.startTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-xs text-[#6B7280]">
                              Dentist: Dr. {apt.doctorName} • Ref: {apt.appointmentCode}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-slate-100 text-slate-700">
                          {apt.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === "billing" && (
                <div className="space-y-4">
                  {invoices.length === 0 ? (
                    <div className="p-10 text-center text-sm font-medium text-[#6B7280] bg-white rounded-2xl border border-dashed border-[#E4E4E7]">
                      No invoice history for this patient.
                    </div>
                  ) : (
                    invoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-2xl bg-white border border-[#E4E4E7] shadow-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#1C1C1E]">
                              {inv.invoiceCode}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                inv.status === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-mono font-bold text-sm text-[#1C1C1E]">
                            ৳{inv.totalBdt}
                          </p>
                          {inv.totalBdt > inv.paidBdt && (
                            <p className="text-xs font-bold text-[#DC2626]">
                              Due: ৳{inv.totalBdt - inv.paidBdt}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E4E4E7] bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Close &amp; Return to Prescription
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
