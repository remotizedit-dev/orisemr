"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Printer,
  Edit3,
  Check,
  Calendar,
  Lock,
  Stethoscope,
  FileText,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDhakaDate } from "@/lib/utils";
import {
  getPrescriptionDetailsAction,
  updatePrescriptionDetailsAction,
} from "@/app/(tenant)/app/prescriptions/actions";
import { getSignedPrintUrlAction } from "@/app/(print)/actions";

interface PrescriptionViewModalProps {
  prescriptionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  canEdit?: boolean;
}

export function PrescriptionViewModal({
  prescriptionId,
  isOpen,
  onClose,
  onUpdated,
  canEdit = false,
}: PrescriptionViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<{
    prescription: any;
    items: any[];
    adviceList: any[];
  } | null>(null);

  // Editable Form State
  const [notes, setNotes] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [examination, setExamination] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [investigations, setInvestigations] = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  async function handleShareSignedLink() {
    if (!data?.prescription?.id) return;
    try {
      setIsSharing(true);
      const res = await getSignedPrintUrlAction(`/print/prescription/${data.prescription.id}`, 7);
      const fullUrl = `${window.location.origin}${res.signedUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Patient link copied to clipboard! (Expires in 7 days for privacy)");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link");
    } finally {
      setIsSharing(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !prescriptionId) {
      setData(null);
      setIsEditing(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getPrescriptionDetailsAction(prescriptionId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setNotes(res.prescription.notes || "");
          setChiefComplaint(res.prescription.chiefComplaint || "");
          setExamination(res.prescription.examination || "");
          setDiagnosis(res.prescription.diagnosis || "");
          setInvestigations(res.prescription.investigations || "");
          setNextVisitDate(res.prescription.nextVisitDate || "");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          toast.error(err?.message || "Failed to load prescription details");
          setLoading(false);
          onClose();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, prescriptionId, onClose]);

  const handleSave = async () => {
    if (!prescriptionId || !canEdit) return;
    setSaving(true);
    try {
      await updatePrescriptionDetailsAction(prescriptionId, {
        notes,
        chiefComplaint,
        examination,
        diagnosis,
        investigations,
        nextVisitDate: nextVisitDate || null,
      });

      toast.success("Prescription details updated successfully");
      setIsEditing(false);
      if (data) {
        setData({
          ...data,
          prescription: {
            ...data.prescription,
            notes,
            chiefComplaint,
            examination,
            diagnosis,
            investigations,
            nextVisitDate: nextVisitDate || null,
          },
        });
      }
      if (onUpdated) onUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save prescription changes");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E4E4E7] overflow-hidden flex flex-col max-h-[92vh] z-10"
        >
          {loading || !data ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2A5CAA] animate-spin" />
              <p className="text-sm font-semibold text-[#6B7280]">
                Loading prescription details...
              </p>
            </div>
          ) : (
            <>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[#2A5CAA] text-base">
                        {data.prescription.rxCode}
                      </span>
                      <span className="text-xs text-[#6B7280] font-medium">
                        • {formatDhakaDate(data.prescription.createdAt, "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                      Issued by{" "}
                      <strong>
                        {data.prescription.doctorTitle || "Dr."} {data.prescription.doctorName}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          handleSave();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                      disabled={saving}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                        isEditing
                          ? "bg-[#30D158] hover:bg-[#28b84d] text-white"
                          : "bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-[#1C1C1E]"
                      }`}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : isEditing ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Save Changes</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Notes &amp; Findings</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleShareSignedLink}
                    disabled={isSharing}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    title="Copy expiring link to share with patient on WhatsApp"
                  >
                    {isSharing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span>Share Link</span>
                  </button>

                  <Link
                    href={`/print/prescription/${data.prescription.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </Link>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-[#E4E4E7] text-[#6B7280] hover:text-[#1C1C1E] transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Patient Summary Strip */}
                <div className="p-4 rounded-2xl bg-[#EBF2FC]/60 border border-[#2A5CAA]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg text-[#1C1C1E]">
                        {data.prescription.patientName}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#2A5CAA] bg-white px-2.5 py-0.5 rounded-lg border border-[#2A5CAA]/20">
                        Card: {data.prescription.patientCardNumber}
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                      {data.prescription.patientApproxAge
                        ? `${data.prescription.patientApproxAge} yrs`
                        : "Age —"}{" "}
                      • <span className="capitalize">{data.prescription.patientGender}</span>
                      {data.prescription.patientPhone && ` • ${data.prescription.patientPhone}`}
                    </p>
                  </div>

                  <Link
                    href={`/app/patients/${data.prescription.patientId}`}
                    target="_blank"
                    className="text-xs font-bold text-[#2A5CAA] hover:underline flex items-center gap-1 self-start sm:self-center"
                  >
                    <span>View Patient Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {/* DOCTOR'S PRIVATE CLINICAL NOTE (HIGHLIGHTED SECTION) */}
                <div className="p-4.5 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Doctor&apos;s Private Clinical Note</span>
                      <span className="text-[10px] lowercase font-semibold px-2 py-0.5 rounded bg-amber-200/60 text-amber-800">
                        confidential / not printed on paper
                      </span>
                    </div>

                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                      >
                        Edit Note
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add private observations, procedural thoughts, treatment follow-up notes (doctor eyes only)..."
                        className="w-full p-3 rounded-xl border border-amber-300 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-[#1C1C1E]"
                      />
                      <p className="text-[11px] text-amber-700 mt-1">
                        🔒 This note is strictly for internal clinical records and will never appear on the patient&apos;s printed prescription.
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm font-medium text-amber-950 leading-relaxed bg-white/80 p-3 rounded-xl border border-amber-200/60">
                      {data.prescription.notes ? (
                        <p className="whitespace-pre-wrap">{data.prescription.notes}</p>
                      ) : (
                        <span className="italic text-amber-700/80">
                          {canEdit
                            ? 'No private clinical notes recorded for this prescription yet. Click "Edit Note" to add confidential notes.'
                            : "No private clinical notes recorded for this prescription."}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 2-Column: Clinical Findings & Next Visit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Clinical Findings */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E4E7] space-y-3">
                    <span className="text-xs font-black uppercase text-[#4B5563] tracking-wider block">
                      Clinical Findings &amp; Examination
                    </span>

                    {/* Chief Complaint */}
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] block mb-1">
                        Chief Complaint (C/C)
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={chiefComplaint}
                          onChange={(e) => setChiefComplaint(e.target.value)}
                          placeholder="e.g. Toothache, bleeding gums..."
                          className="w-full p-2.5 rounded-xl border border-[#E4E4E7] bg-white text-xs font-medium focus:outline-none focus:border-[#2A5CAA]"
                        />
                      ) : (
                        <p className="text-xs sm:text-sm font-semibold text-[#1C1C1E]">
                          {data.prescription.chiefComplaint || <span className="text-[#8E8E93] italic">—</span>}
                        </p>
                      )}
                    </div>

                    {/* On Examination */}
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] block mb-1">
                        On Examination (O/E)
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={examination}
                          onChange={(e) => setExamination(e.target.value)}
                          placeholder="e.g. Deep caries, percussion tender..."
                          className="w-full p-2.5 rounded-xl border border-[#E4E4E7] bg-white text-xs font-medium focus:outline-none focus:border-[#2A5CAA]"
                        />
                      ) : (
                        <p className="text-xs sm:text-sm font-semibold text-[#1C1C1E]">
                          {data.prescription.examination || <span className="text-[#8E8E93] italic">—</span>}
                        </p>
                      )}
                    </div>

                    {/* Diagnosis */}
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] block mb-1">
                        Diagnosis
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          placeholder="e.g. Irreversible pulpitis..."
                          className="w-full p-2.5 rounded-xl border border-[#E4E4E7] bg-white text-xs font-medium focus:outline-none focus:border-[#2A5CAA]"
                        />
                      ) : (
                        <p className="text-xs sm:text-sm font-bold text-[#2A5CAA]">
                          {data.prescription.diagnosis || <span className="text-[#8E8E93] italic">—</span>}
                        </p>
                      )}
                    </div>

                    {/* Investigations */}
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] block mb-1">
                        Investigations Advised
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={investigations}
                          onChange={(e) => setInvestigations(e.target.value)}
                          placeholder="e.g. IOPA X-Ray, OPG..."
                          className="w-full p-2.5 rounded-xl border border-[#E4E4E7] bg-white text-xs font-medium focus:outline-none focus:border-[#2A5CAA]"
                        />
                      ) : (
                        <p className="text-xs sm:text-sm font-medium text-[#1C1C1E]">
                          {data.prescription.investigations || <span className="text-[#8E8E93] italic">—</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Affected Teeth & Follow-up */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E4E7] space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black uppercase text-[#4B5563] tracking-wider block mb-2">
                        Affected Tooth Chart (FDI)
                      </span>
                      {data.prescription.toothCodes && data.prescription.toothCodes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {data.prescription.toothCodes.map((tooth: string) => (
                            <span
                              key={tooth}
                              className="px-2.5 py-1 bg-[#EBF2FC] text-[#2A5CAA] font-mono font-black text-xs rounded-lg border border-[#2A5CAA]/20 shadow-2xs"
                            >
                              Tooth {tooth}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#8E8E93] italic">No specific tooth recorded</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#E4E4E7]">
                      <span className="text-xs font-bold text-[#6B7280] block mb-1">
                        Next Follow-up Visit
                      </span>
                      {isEditing ? (
                        <input
                          type="date"
                          value={nextVisitDate}
                          onChange={(e) => setNextVisitDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[#E4E4E7] bg-white text-xs font-mono font-bold focus:outline-none focus:border-[#2A5CAA]"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2A5CAA]">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {data.prescription.nextVisitDate
                              ? formatDhakaDate(data.prescription.nextVisitDate, "dd MMM yyyy")
                              : "As needed / Not specified"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prescribed Medicines (℞) */}
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase text-[#4B5563] tracking-wider flex items-center gap-2">
                    <span className="text-base font-serif italic font-bold">℞</span>
                    <span>Prescribed Medicines ({data.items.length})</span>
                  </span>

                  {data.items.length === 0 ? (
                    <p className="text-xs text-[#8E8E93] italic p-4 rounded-xl bg-[#F8FAFC]">
                      No medicines prescribed on this prescription.
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-[#E4E4E7] overflow-hidden divide-y divide-[#E4E4E7]">
                      {data.items.map((item, idx) => {
                        const instructions = [
                          item.dosageTextBn,
                          item.mealTimingTextBn,
                          item.durationTextBn,
                        ].filter(Boolean);

                        return (
                          <div key={item.id} className="p-3.5 bg-white hover:bg-[#F8FAFC] transition">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-sm text-[#1C1C1E]">
                                  {idx + 1}. {item.medicineLineSnapshot}
                                </span>
                                {instructions.length > 0 && (
                                  <p className="text-xs text-[#2A5CAA] font-semibold mt-0.5" lang="bn">
                                    {instructions.join(" — ")}
                                  </p>
                                )}
                                {item.customInstruction && (
                                  <p className="text-xs text-[#6B7280] italic mt-0.5">
                                    Note: {item.customInstruction}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Advice Lines (Bangla) */}
                {data.adviceList.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase text-[#4B5563] tracking-wider block" lang="bn">
                      উপদেশ (Clinical Advice):
                    </span>
                    <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E4E4E7] text-xs space-y-1.5" lang="bn">
                      {data.adviceList.map((adv) => (
                        <div key={adv.id} className="flex items-start gap-2 text-[#1C1C1E] font-medium">
                          <span className="text-[#2A5CAA] font-bold">•</span>
                          <span>{adv.textBn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-[#E4E4E7] flex items-center justify-between bg-[#F8FAFC]">
                <span className="text-xs text-[#6B7280]">
                  Prescription Record ID: <span className="font-mono text-[11px]">{data.prescription.id}</span>
                </span>

                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#28b84d] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save &amp; Finish</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F4F4F5] text-xs font-bold text-[#1C1C1E] transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
