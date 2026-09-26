"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ToothSelector } from "./ToothSelector";
import { ClinicalAutocompleteInput } from "./ClinicalAutocompleteInput";
import { PatientProfileModal } from "./PatientProfileModal";
import { UploadReportModal } from "./UploadReportModal";
import { checkMedicineAllergy, type AllergyCheckResult } from "@/lib/clinical-flags";
import { savePrescriptionAction } from "@/app/(tenant)/app/prescriptions/actions";
import {
  AlertCircle,
  AlertTriangle,
  Armchair,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

export interface PatientAttachmentItem {
  id: string;
  title?: string | null;
  kind: string;
  reportCode?: string | null;
  s3Key: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  uploadedAt: string;
  uploadedByName?: string | null;
  url: string;
}

interface PrescriptionBuilderProps {
  patient: {
    id: string;
    name: string;
    cardNumber: string;
    gender: string;
    approxAge: number | null;
    allergyFlags: string[];
    medicalConditions: string[];
    bloodGroup?: string | null;
    phone?: string | null;
  };
  appointmentId?: string;
  initialReports?: PatientAttachmentItem[];
  catalogMedicines: {
    id: string;
    brandName: string | null;
    genericName: string;
    strength: string | null;
    form: string;
    drugClass: string | null;
  }[];
  dosagePatterns: {
    id: string;
    labelBn: string;
    code: string;
    formGroup: string;
  }[];
  mealTimings: {
    id: string;
    labelBn: string;
    code: string;
  }[];
  durationOptions: {
    id: string;
    labelBn: string;
    daysCount: number | null;
  }[];
  adviceTemplates: {
    id: string;
    groupName: string;
    textBn: string;
  }[];
  quickTexts: {
    id: string;
    kind: string;
    text: string;
  }[];
}

interface SelectedMedicineItem {
  id: string;
  medicineId: string;
  brandName: string | null;
  genericName: string;
  strength: string | null;
  form: string;
  drugClass: string | null;
  dosagePatternId?: string;
  dosageTextBn?: string;
  mealTimingId?: string;
  mealTimingTextBn?: string;
  durationOptionId?: string;
  durationTextBn?: string;
  customInstruction?: string;
  allergyNotice?: AllergyCheckResult;
}

export function PrescriptionBuilder({
  patient,
  appointmentId,
  initialReports = [],
  catalogMedicines,
  dosagePatterns,
  mealTimings,
  durationOptions,
  adviceTemplates,
  quickTexts,
}: PrescriptionBuilderProps) {
  const router = useRouter();

  // In-chair patient clinical reports state (filtered for this patient only)
  const [reports, setReports] = useState<PatientAttachmentItem[]>(initialReports);
  const [lightboxAttachment, setLightboxAttachment] = useState<PatientAttachmentItem | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxRotation, setLightboxRotation] = useState<number>(0);
  const [isReportsExpanded, setIsReportsExpanded] = useState<boolean>(true);

  // Keyboard navigation for radiograph Lightbox
  useEffect(() => {
    if (!lightboxAttachment) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxAttachment(null);
      } else if (e.key === "ArrowLeft") {
        const idx = reports.findIndex((r) => r.id === lightboxAttachment.id);
        if (idx > 0) {
          setLightboxAttachment(reports[idx - 1]);
          setLightboxZoom(1);
          setLightboxRotation(0);
        }
      } else if (e.key === "ArrowRight") {
        const idx = reports.findIndex((r) => r.id === lightboxAttachment.id);
        if (idx < reports.length - 1) {
          setLightboxAttachment(reports[idx + 1]);
          setLightboxZoom(1);
          setLightboxRotation(0);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxAttachment, reports]);

  // Clinical Notes State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [examination, setExamination] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [investigations, setInvestigations] = useState("");
  const [toothCodes, setToothCodes] = useState<string[]>([]);
  const [nextVisitDate, setNextVisitDate] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Prescribed items & advice state
  const [selectedItems, setSelectedItems] = useState<SelectedMedicineItem[]>([]);
  const [selectedAdvice, setSelectedAdvice] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Medicine search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof catalogMedicines>([]);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Post-save modal state
  const [savedPrescription, setSavedPrescription] = useState<{
    id: string;
    rxCode: string;
  } | null>(null);

  // Allergy block modal state
  const [blockingItem, setBlockingItem] = useState<{
    medicine: (typeof catalogMedicines)[0];
    allergy: AllergyCheckResult;
  } | null>(null);

  const handleSearchMedicine = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = catalogMedicines
      .filter(
        (m) =>
          (m.brandName && m.brandName.toLowerCase().includes(q)) ||
          m.genericName.toLowerCase().includes(q)
      )
      .slice(0, 8);
    setSearchResults(matches);
  };

  const addMedicine = (medicine: (typeof catalogMedicines)[0], overrideConfirmed = false) => {
    // Check allergy
    if (!overrideConfirmed && medicine.drugClass) {
      const allergyCheck = checkMedicineAllergy(medicine, patient.allergyFlags);
      if (allergyCheck.level === "block") {
        setBlockingItem({ medicine, allergy: allergyCheck });
        return;
      }
    }

    const defaultDosage = dosagePatterns[0]?.labelBn || "১+০+১";
    const defaultMeal = mealTimings[0]?.labelBn || "খাবার পর";
    const defaultDuration = durationOptions[0]?.labelBn || "৫ দিন";

    const newItem: SelectedMedicineItem = {
      id: Math.random().toString(36).substring(7),
      medicineId: medicine.id,
      brandName: medicine.brandName,
      genericName: medicine.genericName,
      strength: medicine.strength,
      form: medicine.form,
      drugClass: medicine.drugClass,
      dosageTextBn: defaultDosage,
      mealTimingTextBn: defaultMeal,
      durationTextBn: defaultDuration,
      allergyNotice: medicine.drugClass
        ? checkMedicineAllergy(medicine, patient.allergyFlags)
        : undefined,
    };

    setSelectedItems([...selectedItems, newItem]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const toggleAdviceGroup = (groupName: string) => {
    const templatesInGroup = adviceTemplates.filter((a) => a.groupName === groupName);
    const linesToAdd = templatesInGroup.map((t) => t.textBn);
    const newAdvice = Array.from(new Set([...selectedAdvice, ...linesToAdd]));
    setSelectedAdvice(newAdvice);
  };

  const toggleAdviceLine = (line: string) => {
    if (selectedAdvice.includes(line)) {
      setSelectedAdvice(selectedAdvice.filter((a) => a !== line));
    } else {
      setSelectedAdvice([...selectedAdvice, line]);
    }
  };

  const handleSave = async () => {
    // Medicines are now OPTIONAL. Ensure at least one clinical finding or advice or medicine is present.
    const hasAnyContent =
      selectedItems.length > 0 ||
      selectedAdvice.length > 0 ||
      chiefComplaint.trim() ||
      examination.trim() ||
      diagnosis.trim() ||
      investigations.trim() ||
      toothCodes.length > 0;

    if (!hasAnyContent) {
      toast.error("Please provide at least a diagnosis, advice, or medicine before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const formattedItems = selectedItems.map((item, idx) => {
        const formPrefix =
          item.form === "tablet"
            ? "Tab."
            : item.form === "capsule"
            ? "Cap."
            : item.form === "mouthwash"
            ? "Mouthwash"
            : "";
        const lineSnapshot = item.brandName
          ? `${formPrefix} ${item.brandName} ${item.strength || ""} (${item.genericName})`.trim()
          : `${formPrefix} ${item.genericName} ${item.strength || ""}`.trim();

        return {
          medicineId: item.medicineId,
          medicineLineSnapshot: lineSnapshot,
          dosageTextBn: item.dosageTextBn || null,
          mealTimingTextBn: item.mealTimingTextBn || null,
          durationTextBn: item.durationTextBn || null,
          customInstruction: item.customInstruction || null,
          sortOrder: idx + 1,
        };
      });

      const formattedAdvice = selectedAdvice.map((text, idx) => ({
        textBn: text,
        sortOrder: idx + 1,
      }));

      const res = await savePrescriptionAction({
        patientId: patient.id,
        appointmentId,
        chiefComplaint,
        examination,
        diagnosis,
        investigations,
        toothCodes,
        nextVisitDate: nextVisitDate || null,
        notes,
        allergyOverride: selectedItems.some((i) => i.allergyNotice?.level === "block"),
        items: formattedItems,
        adviceLines: formattedAdvice,
      });

      toast.success(`Prescription ${res.rxCode} saved successfully!`);
      setSavedPrescription({ id: res.prescriptionId, rxCode: res.rxCode });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save prescription");
    } finally {
      setIsSaving(false);
    }
  };

  const adviceGroups = Array.from(new Set(adviceTemplates.map((a) => a.groupName)));

  // Separate suggestions for each finding category
  const ccSuggestions = quickTexts.filter((q) => q.kind === "chief_complaint");
  const oeSuggestions = quickTexts.filter((q) => q.kind === "examination");
  const dxSuggestions = quickTexts.filter((q) => q.kind === "diagnosis");
  const ixSuggestions = quickTexts.filter((q) => q.kind === "investigation");

  return (
    <div className="space-y-6">
      {/* Allergy Warning Modal */}
      {blockingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#FF453A] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#FF453A]">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Drug Allergy Warning
                </h3>
                <span className="text-xs font-semibold text-[#FF453A]">
                  Critical Clinical Conflict
                </span>
              </div>
            </div>

            <p className="text-sm text-[#1C1C1E] leading-relaxed">
              Patient has documented allergy:{" "}
              <strong className="text-[#FF453A]">
                {blockingItem.allergy.matchedFlag}
              </strong>
              .<br />
              Prescribing{" "}
              <strong>
                {blockingItem.medicine.brandName || blockingItem.medicine.genericName}
              </strong>{" "}
              may trigger severe allergic reaction.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBlockingItem(null)}
                className="px-4 py-2 rounded-xl bg-[#F4F4F5] text-xs font-semibold text-[#1C1C1E] hover:bg-[#E4E4E7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const med = blockingItem.medicine;
                  setBlockingItem(null);
                  addMedicine(med, true);
                  toast.warning("Allergy override confirmed and audited");
                }}
                className="px-4 py-2 rounded-xl bg-[#FF453A] hover:bg-[#e0382e] text-white text-xs font-bold shadow cursor-pointer"
              >
                Override &amp; Prescribe Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Saved Success Modal */}
      {savedPrescription && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#E4E4E7] shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2.5">
              <div className="w-16 h-16 rounded-full bg-[#30D158]/15 text-[#30D158] flex items-center justify-center mx-auto mb-2">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-black text-[#1C1C1E]">
                Prescription Issued Successfully!
              </h3>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Prescription{" "}
                <span className="font-mono font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded">
                  {savedPrescription.rxCode}
                </span>{" "}
                for <strong>{patient.name}</strong> has been saved.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <Link
                href={`/app/billing/new?patientId=${patient.id}${appointmentId ? `&appointmentId=${appointmentId}` : ""}`}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <CreditCard className="w-4.5 h-4.5" />
                <span>Proceed to Billing &amp; Collect Payment →</span>
              </Link>

              <Link
                href={`/print/prescription/${savedPrescription.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>Open &amp; Print Prescription ↗</span>
              </Link>

              <Link
                href="/app/queue"
                className="w-full py-3 px-4 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Armchair className="w-4.5 h-4.5 text-[#2A5CAA]" />
                <span>Return to In-Chair Queue</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <User className="w-4.5 h-4.5 text-[#2A5CAA]" />
                <span>View Patient Records &amp; History</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Profile Popup Modal */}
      <PatientProfileModal
        patientId={patient.id}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Upload Report / Camera Capture Modal */}
      <UploadReportModal
        patientId={patient.id}
        prescriptionId={savedPrescription?.id}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={(newDoc) => {
          setReports((prev) => [
            {
              id: newDoc.id,
              title: newDoc.title,
              kind: newDoc.kind,
              reportCode: newDoc.reportCode,
              s3Key: newDoc.s3Key,
              contentType: newDoc.contentType,
              sizeBytes: newDoc.sizeBytes,
              uploadedAt:
                newDoc.uploadedAt instanceof Date
                  ? newDoc.uploadedAt.toISOString()
                  : String(newDoc.uploadedAt || new Date().toISOString()),
              uploadedByName: newDoc.uploadedByName,
              url: newDoc.url,
            },
            ...prev,
          ]);
        }}
      />

      {/* High-Resolution In-Chair Radiograph Lightbox Modal */}
      <AnimatePresence>
        {lightboxAttachment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setLightboxAttachment(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5"
          >
            {/* Top Header Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 py-2.5 px-4 rounded-2xl bg-white/10 backdrop-blur-md text-white border border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#2A5CAA] text-white">
                  {lightboxAttachment.kind.replace("_", " ")}
                </span>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>{lightboxAttachment.title}</span>
                    {lightboxAttachment.reportCode && (
                      <span className="font-mono text-xs text-white/70 font-normal">
                        ({lightboxAttachment.reportCode})
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-white/70">
                    Patient: {patient.name} ({patient.cardNumber}) • Uploaded:{" "}
                    {new Date(lightboxAttachment.uploadedAt).toLocaleDateString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition cursor-pointer"
                  title="Zoom Out (-25%)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-1 text-white/80 min-w-[48px] text-center">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                  className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition cursor-pointer"
                  title="Zoom In (+25%)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition cursor-pointer flex items-center gap-1"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCcw className="w-4 h-4 -scale-x-100" />
                  <span className="text-xs font-mono">{lightboxRotation}°</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxRotation(0);
                  }}
                  className="px-2.5 py-1 rounded-xl hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Reset
                </button>

                <a
                  href={lightboxAttachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition cursor-pointer"
                  title="Open in Full Tab ↗"
                >
                  <ArrowRight className="w-4 h-4 -rotate-45" />
                </a>

                <button
                  type="button"
                  onClick={() => setLightboxAttachment(null)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer ml-1"
                  title="Close Lightbox (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Image Canvas */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full flex-1 max-w-5xl my-4 flex items-center justify-center overflow-auto relative select-none"
            >
              <img
                src={lightboxAttachment.url}
                alt={lightboxAttachment.title || "Radiograph"}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  transition: "transform 0.18s ease-out",
                }}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl"
                draggable={false}
              />
            </div>

            {/* Bottom Navigation Strip */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md flex items-center justify-between gap-3 py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10"
            >
              {(() => {
                const currentIdx = reports.findIndex((r) => r.id === lightboxAttachment.id);
                const hasPrev = currentIdx > 0;
                const hasNext = currentIdx < reports.length - 1;

                return (
                  <>
                    <button
                      type="button"
                      disabled={!hasPrev}
                      onClick={() => {
                        if (hasPrev) {
                          setLightboxAttachment(reports[currentIdx - 1]);
                          setLightboxZoom(1);
                          setLightboxRotation(0);
                        }
                      }}
                      className="px-3 py-1 rounded-full text-xs font-bold hover:bg-white/20 disabled:opacity-30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="text-xs font-mono text-white/80">
                      {currentIdx + 1} of {reports.length}
                    </span>
                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={() => {
                        if (hasNext) {
                          setLightboxAttachment(reports[currentIdx + 1]);
                          setLightboxZoom(1);
                          setLightboxRotation(0);
                        }
                      }}
                      className="px-3 py-1 rounded-full text-xs font-bold hover:bg-white/20 disabled:opacity-30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* ROW 1: FULL-WIDTH STICKY PATIENT CLINICAL BANNER                     */}
      {/* ==================================================================== */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[#E4E4E7] shadow-sm bg-white space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2A5CAA] to-[#1E4282] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {patient.name[0] || "P"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#1C1C1E] tracking-tight">
                  {patient.name}
                </h1>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-[#2A5CAA] bg-[#E8EEF7] px-2.5 py-0.5 rounded-lg border border-[#2A5CAA]/20">
                  Card: {patient.cardNumber}
                </span>
                {patient.bloodGroup && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                    {patient.bloodGroup}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[#4B5563] mt-0.5">
                {patient.approxAge ? `${patient.approxAge} yrs` : "Age —"} •{" "}
                <span className="capitalize">{patient.gender}</span>
                {patient.phone && ` • ${patient.phone}`}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons (No page navigation needed!) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] text-xs font-bold flex items-center gap-2 border border-[#E4E4E7] transition cursor-pointer shadow-2xs"
            >
              <User className="w-4 h-4 text-[#2A5CAA]" />
              <span>View Profile &amp; History</span>
            </button>

            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Upload Report / X-Ray (S3)</span>
            </button>
          </div>
        </div>

        {/* Clinical Alerts Strip: Allergies & Conditions */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#F4F4F5] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase text-[#FF453A] tracking-wider text-[11px]">
              Allergies:
            </span>
            {patient.allergyFlags.length === 0 ? (
              <span className="text-[#6B7280] font-medium italic">None reported</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {patient.allergyFlags.map((flag) => (
                  <span
                    key={flag}
                    className="px-2 py-0.5 rounded-md bg-[#FFEBEA] border border-[#FF453A]/40 text-[#FF453A] font-extrabold"
                  >
                    ⚠️ {flag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <span className="text-[#D1D5DB] hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase text-[#D97706] tracking-wider text-[11px]">
              Conditions:
            </span>
            {patient.medicalConditions.length === 0 ? (
              <span className="text-[#6B7280] font-medium italic">None recorded</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {patient.medicalConditions.map((cond) => (
                  <span
                    key={cond}
                    className="px-2 py-0.5 rounded-md bg-[#FFF7EB] border border-[#FF9F0A]/40 text-[#D97706] font-bold"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* IN-CHAIR PATIENT RADIOGRAPHS & CLINICAL DOCUMENTS TRAY               */}
      {/* Strictly filtered for this patient only                               */}
      {/* ==================================================================== */}
      <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] shadow-sm bg-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center font-bold">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#1C1C1E] tracking-tight">
                  Patient Radiographs &amp; Clinical Documents
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#E8EEF7] text-[#2A5CAA] text-xs font-black">
                  {reports.length}
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#6B7280]">
                Instant in-chair access to {patient.name}&apos;s X-rays, OPG scans, and lab reports while prescribing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>+ Upload / Take Photo</span>
            </button>

            {reports.length > 0 && (
              <button
                type="button"
                onClick={() => setIsReportsExpanded((prev) => !prev)}
                className="px-2.5 py-1.5 rounded-xl border border-[#E4E4E7] hover:bg-[#F4F4F5] text-xs font-bold text-[#4B5563] transition flex items-center gap-1 cursor-pointer"
              >
                <span>{isReportsExpanded ? "Collapse" : "Show All"}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isReportsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Document Cards Display */}
        {isReportsExpanded && (
          <>
            {reports.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-dashed border-[#E4E4E7] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1C1C1E]">
                      No radiographs or clinical documents uploaded for this patient yet
                    </p>
                    <p className="text-[11px] text-[#6B7280]">
                      Capture intraoral photos with dental camera/webcam or upload X-ray images (stored in S3)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#E8EEF7] text-[#2A5CAA] border border-[#2A5CAA]/30 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture / Upload Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
                {reports.map((report) => {
                  const isImg =
                    report.contentType?.startsWith("image/") ||
                    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(report.s3Key || "");

                  return (
                    <div
                      key={report.id}
                      className="group relative rounded-2xl border border-[#E4E4E7] hover:border-[#2A5CAA] bg-white p-2.5 transition shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden"
                    >
                      {/* Thumbnail */}
                      <div
                        onClick={() => {
                          if (isImg) {
                            setLightboxAttachment(report);
                            setLightboxZoom(1);
                            setLightboxRotation(0);
                          } else {
                            window.open(report.url, "_blank");
                          }
                        }}
                        className="w-full h-24 rounded-xl bg-[#0F172A] relative overflow-hidden flex items-center justify-center cursor-pointer group/thumb"
                      >
                        {isImg ? (
                          <>
                            <img
                              src={report.url}
                              alt={report.title || "Report Thumbnail"}
                              className="w-full h-full object-contain transition-transform duration-300 group-hover/thumb:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                              <Search className="w-4 h-4" />
                              <span className="text-[10px] font-bold">Inspect</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 gap-1 p-2">
                            <FileText className="w-6 h-6 text-[#2A5CAA]" />
                            <span className="text-[9px] uppercase font-bold text-center line-clamp-1">
                              {report.contentType?.split("/")[1] || "DOC"}
                            </span>
                          </div>
                        )}

                        {/* Kind Badge Tag */}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                          {report.kind.replace("_", " ")}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="pt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono text-[#2A5CAA] font-bold">
                            {report.reportCode || "DOC"}
                          </span>
                          <span className="text-[#8E8E93]">
                            {new Date(report.uploadedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p
                          className="text-xs font-bold text-[#1C1C1E] line-clamp-1 group-hover:text-[#2A5CAA] transition"
                          title={report.title || "Document"}
                        >
                          {report.title || "Document"}
                        </p>

                        <div className="pt-1 flex items-center justify-between gap-1 border-t border-[#F4F4F5]">
                          {isImg ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxAttachment(report);
                                setLightboxZoom(1);
                                setLightboxRotation(0);
                              }}
                              className="text-[11px] font-bold text-[#2A5CAA] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Search className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#6B7280]">
                              {report.sizeBytes ? `${Math.round(report.sizeBytes / 1024)} KB` : "File"}
                            </span>
                          )}

                          <a
                            href={report.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-md text-[#8E8E93] hover:text-[#2A5CAA] hover:bg-[#E8EEF7] transition"
                            title="Open in new window ↗"
                          >
                            <ArrowRight className="w-3 h-3 -rotate-45" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ROW 2: ERGONOMIC 2-COLUMN CLINICAL WORKSPACE                         */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================== */}
        {/* Left Column (5 of 12 cols): FDI Tooth Chart & Clinical Findings    */}
        {/* ================================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* Tile 1: Tooth Selector */}
          <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] shadow-2xs space-y-3 bg-white">
            <h2 className="text-xs font-black uppercase text-[#4B5563] tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-[#2A5CAA]" />
              <span>Affected Tooth Chart (FDI Dental Arch)</span>
            </h2>
            <ToothSelector selectedTeeth={toothCodes} onChange={setToothCodes} />
          </div>

          {/* Tile 2: Clinical Findings with Typeahead Autocomplete */}
          <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] shadow-2xs space-y-4 bg-white">
            <h2 className="text-xs font-black uppercase text-[#4B5563] tracking-wider pb-2 border-b border-[#E4E4E7]">
              Clinical Findings &amp; Diagnosis
            </h2>

            {/* Chief Complaint */}
            <ClinicalAutocompleteInput
              label="Chief Complaint (C/C)"
              value={chiefComplaint}
              onChange={setChiefComplaint}
              placeholder="Type complaint (e.g. Toothache, Cavity, Bleeding gum)..."
              suggestions={ccSuggestions}
              rows={2}
            />

            {/* On Examination */}
            <ClinicalAutocompleteInput
              label="On Examination (O/E)"
              value={examination}
              onChange={setExamination}
              placeholder="Type findings (e.g. Deep caries, Percussion positive)..."
              suggestions={oeSuggestions}
              rows={2}
            />

            {/* Diagnosis */}
            <ClinicalAutocompleteInput
              label="Diagnosis"
              value={diagnosis}
              onChange={setDiagnosis}
              placeholder="Type diagnosis (e.g. Irreversible pulpitis, Chronic gingivitis)..."
              suggestions={dxSuggestions}
              rows={2}
            />

            {/* Investigations Advised */}
            <ClinicalAutocompleteInput
              label="Investigations Advised"
              value={investigations}
              onChange={setInvestigations}
              placeholder="e.g. IOPA X-Ray, OPG Panoramic, Blood Glucose..."
              suggestions={ixSuggestions}
              isTextarea={false}
            />
          </div>
        </div>

        {/* ================================================================== */}
        {/* Right Column (7 of 12 cols): Prescription Items & Bangla Advice    */}
        {/* ================================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* Tile 3: Prescription Items */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[#E4E4E7] space-y-5 bg-white shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2A5CAA]" />
                <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1E]">
                  Prescription (Rx)
                </h2>
                <span className="text-xs font-bold text-[#6B7280]">
                  (Medicines are optional)
                </span>
              </div>
              <span className="text-xs font-bold bg-[#E8EEF7] text-[#2A5CAA] px-3 py-1 rounded-full font-mono">
                {selectedItems.length} items
              </span>
            </div>

            {/* Fast Medicine Search Input */}
            <div className="relative">
              <div className="flex items-center rounded-2xl border-2 border-[#2A5CAA]/40 focus-within:border-[#2A5CAA] bg-white px-3.5 py-3 shadow-2xs transition">
                <Search className="w-5 h-5 text-[#2A5CAA] mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchMedicine(e.target.value)}
                  placeholder="Type medicine name to search & add (e.g. Napa, Moxacil, Rolac, A-Clox)..."
                  className="w-full bg-transparent text-sm sm:text-base focus:outline-none placeholder:text-sm placeholder:text-[#6B7280] font-medium"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl border border-[#2A5CAA]/30 shadow-2xl overflow-hidden divide-y divide-[#E4E4E7] max-h-72 overflow-y-auto animate-in fade-in-50 duration-150">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addMedicine(m)}
                      className="w-full px-4 py-3 text-left hover:bg-[#E8EEF7] flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <span className="font-black text-sm sm:text-base text-[#1C1C1E] block">
                          {m.brandName ? `${m.brandName} ${m.strength || ""}` : m.genericName}
                        </span>
                        {m.brandName && (
                          <span className="block text-xs font-semibold text-[#6B7280]">
                            {m.genericName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold capitalize px-2.5 py-1 rounded-lg bg-[#F4F4F5] text-[#4B5563] shrink-0">
                        {m.form}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Prescribed Medicines List */}
            {selectedItems.length === 0 ? (
              <div className="p-6 text-center text-sm font-medium text-[#6B7280] bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E4E4E7]">
                No medicines added yet. Medicines are optional — you can issue an advice or referral prescription without prescribing medicines.
              </div>
            ) : (
              <div className="space-y-3.5">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-[#E4E4E7] space-y-3 bg-white shadow-xs hover:border-[#2A5CAA]/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-black text-base text-[#1C1C1E] block">
                          {idx + 1}. {item.brandName ? `${item.brandName} ${item.strength || ""}` : item.genericName}
                        </span>
                        {item.brandName && (
                          <span className="text-xs font-semibold text-[#6B7280] block mt-0.5">
                            ({item.genericName}) • <span className="capitalize">{item.form}</span>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedItems(selectedItems.filter((i) => i.id !== item.id))
                        }
                        className="text-[#6B7280] hover:text-[#FF453A] p-1.5 transition rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.allergyNotice && (
                      <div className="p-2.5 rounded-xl bg-[#FFEBEA] border border-[#FF453A]/30 text-xs text-[#FF453A] flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{item.allergyNotice.message}</span>
                      </div>
                    )}

                    {/* Bangla Chips for Quick Dosage */}
                    <div className="space-y-2 pt-2 border-t border-[#F4F4F5]">
                      {/* Frequency */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs uppercase font-black text-[#4B5563] mr-1">
                          মাত্রা:
                        </span>
                        {dosagePatterns.slice(0, 6).map((dp) => (
                          <button
                            key={dp.id}
                            type="button"
                            onClick={() => {
                              setSelectedItems(
                                selectedItems.map((i) =>
                                  i.id === item.id ? { ...i, dosageTextBn: dp.labelBn } : i
                                )
                              );
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                              item.dosageTextBn === dp.labelBn
                                ? "bg-[#2A5CAA] text-white shadow-xs"
                                : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                            }`}
                          >
                            {dp.labelBn}
                          </button>
                        ))}
                      </div>

                      {/* Meal timing */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs uppercase font-black text-[#4B5563] mr-1">
                          নিয়ম:
                        </span>
                        {mealTimings.slice(0, 4).map((mt) => (
                          <button
                            key={mt.id}
                            type="button"
                            onClick={() => {
                              setSelectedItems(
                                selectedItems.map((i) =>
                                  i.id === item.id ? { ...i, mealTimingTextBn: mt.labelBn } : i
                                )
                              );
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                              item.mealTimingTextBn === mt.labelBn
                                ? "bg-[#2A5CAA] text-white shadow-xs"
                                : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                            }`}
                          >
                            {mt.labelBn}
                          </button>
                        ))}
                      </div>

                      {/* Duration */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs uppercase font-black text-[#4B5563] mr-1">
                          সময়:
                        </span>
                        {durationOptions.slice(0, 5).map((dr) => (
                          <button
                            key={dr.id}
                            type="button"
                            onClick={() => {
                              setSelectedItems(
                                selectedItems.map((i) =>
                                  i.id === item.id ? { ...i, durationTextBn: dr.labelBn } : i
                                )
                              );
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                              item.durationTextBn === dr.labelBn
                                ? "bg-[#2A5CAA] text-white shadow-xs"
                                : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                            }`}
                          >
                            {dr.labelBn}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tile 4: Clinical Advice & Instructions */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[#E4E4E7] space-y-4 bg-white shadow-2xs">
            <h2 className="text-xs font-black uppercase text-[#4B5563] tracking-wider">
              পরামর্শ (Bangla Clinical Advice)
            </h2>

            <div className="flex flex-wrap gap-2">
              {adviceGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => toggleAdviceGroup(group)}
                  className="px-3 py-1.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-bold text-[#1C1C1E] hover:text-[#2A5CAA] transition cursor-pointer shadow-2xs border border-[#E4E4E7]/60"
                >
                  + {group}
                </button>
              ))}
            </div>

            {selectedAdvice.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] space-y-2 text-sm text-[#1C1C1E] font-medium border border-[#E4E4E7]">
                {selectedAdvice.map((line, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2">
                    <span>• {line}</span>
                    <button
                      type="button"
                      onClick={() => toggleAdviceLine(line)}
                      className="text-[#6B7280] hover:text-[#FF453A] cursor-pointer p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Next Follow-up Visit Quick Picks */}
            <div className="pt-3 border-t border-[#E4E4E7] space-y-2">
              <span className="text-xs font-bold text-[#1C1C1E] block">
                Next Follow-up Visit:
              </span>
              <div className="flex flex-wrap gap-2">
                {["+3 days", "+7 days", "+14 days", "+1 month"].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      if (dur === "+3 days") d.setDate(d.getDate() + 3);
                      if (dur === "+7 days") d.setDate(d.getDate() + 7);
                      if (dur === "+14 days") d.setDate(d.getDate() + 14);
                      if (dur === "+1 month") d.setMonth(d.getMonth() + 1);
                      setNextVisitDate(d.toISOString().split("T")[0]);
                    }}
                    className="px-3 py-1 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-bold text-[#1C1C1E] hover:text-[#2A5CAA] cursor-pointer transition border border-[#E4E4E7]/60"
                  >
                    {dur}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E4E4E7] bg-white text-xs font-mono font-bold focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            {/* Doctor Internal Notes */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-[#1C1C1E] mb-1">
                Doctor&apos;s Private Clinical Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional internal notes (not printed on prescription)..."
                className="w-full p-2.5 rounded-xl border border-[#E4E4E7] text-xs focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>
          </div>

          {/* Tile 5: Prominent Save & Print Action */}
          <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] bg-white shadow-lg space-y-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 px-6 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-[#2A5CAA]/25 transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Issuing Prescription...</span>
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  <span>Save &amp; Print Prescription</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
