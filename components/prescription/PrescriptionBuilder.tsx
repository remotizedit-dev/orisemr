"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ToothSelector } from "./ToothSelector";
import { ClinicalAutocompleteInput } from "./ClinicalAutocompleteInput";
import { PatientProfileModal } from "./PatientProfileModal";
import { UploadReportModal } from "./UploadReportModal";
import { BarcodeSvg } from "@/components/barcode/BarcodeSvg";
import { checkMedicineAllergy, type AllergyCheckResult } from "@/lib/clinical-flags";
import { getDhakaTodayStr, addDhakaDays, addDhakaMonths, formatDhakaDate } from "@/lib/utils";
import { savePrescriptionAction } from "@/app/(tenant)/app/prescriptions/actions";
import { deletePatientAttachmentAction } from "@/app/(tenant)/app/patients/actions";
import {
  AlertCircle,
  AlertTriangle,
  Armchair,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Phone,
  Plus,
  Printer,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  User,
  X,
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
  clinic?: {
    name: string;
    address?: string | null;
    phone?: string | null;
    logoKey?: string | null;
    logoUrl?: string | null;
    rxPrintLetterhead?: boolean;
  };
  doctor?: {
    name: string;
    doctorTitle?: string | null;
    doctorDegrees?: string | null;
    doctorSpecialty?: string | null;
    doctorRegNo?: string | null;
  };
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
  clinic = {
    name: "Smile Care Dental",
    address: "House 24, Road 7, Dhanmondi, Dhaka 1205",
    phone: "01700000000",
    rxPrintLetterhead: true,
  },
  doctor = {
    name: "Karim Mbappe",
    doctorTitle: "Dr.",
    doctorDegrees: "BDS (DU), PGT (OMS)",
    doctorSpecialty: "Dental Surgeon",
    doctorRegNo: "BMDC-0025",
  },
}: PrescriptionBuilderProps) {
  const router = useRouter();

  // Clinical reports & attachments
  const [reports, setReports] = useState<PatientAttachmentItem[]>(initialReports);
  const [isReportsDrawerOpen, setIsReportsDrawerOpen] = useState(false);

  // Clinical Notes State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [examination, setExamination] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [investigations, setInvestigations] = useState("");
  const [toothCodes, setToothCodes] = useState<string[]>([]);
  const [nextVisitDate, setNextVisitDate] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Tooth selector modal
  const [isToothModalOpen, setIsToothModalOpen] = useState(false);

  // Prescribed items & advice state
  const [selectedItems, setSelectedItems] = useState<SelectedMedicineItem[]>([]);
  const [selectedAdvice, setSelectedAdvice] = useState<string[]>([]);
  const [customAdviceInput, setCustomAdviceInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Medicine search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof catalogMedicines>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Post-save modal state (PrescriptionViewModal)
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
    const defaultMeal = mealTimings[0]?.labelBn || "খাবার পরে";
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
      customInstruction: "",
      allergyNotice: checkMedicineAllergy(medicine, patient.allergyFlags),
    };

    setSelectedItems((prev) => [...prev, newItem]);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const updateItem = (id: string, updates: Partial<SelectedMedicineItem>) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleAdviceLine = (line: string) => {
    if (selectedAdvice.includes(line)) {
      setSelectedAdvice((prev) => prev.filter((a) => a !== line));
    } else {
      setSelectedAdvice((prev) => [...prev, line]);
    }
  };

  const toggleAdviceGroup = (groupName: string) => {
    const groupLines = adviceTemplates
      .filter((a) => a.groupName === groupName)
      .map((a) => a.textBn);

    const allPresent = groupLines.every((l) => selectedAdvice.includes(l));
    if (allPresent) {
      setSelectedAdvice((prev) => prev.filter((l) => !groupLines.includes(l)));
    } else {
      const missing = groupLines.filter((l) => !selectedAdvice.includes(l));
      setSelectedAdvice((prev) => [...prev, ...missing]);
    }
  };

  const handleAddCustomAdvice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAdviceInput.trim()) return;
    if (!selectedAdvice.includes(customAdviceInput.trim())) {
      setSelectedAdvice((prev) => [...prev, customAdviceInput.trim()]);
    }
    setCustomAdviceInput("");
  };

  const handleSave = async () => {
    if (selectedItems.length === 0 && !chiefComplaint && !diagnosis) {
      toast.error("Please add at least one medication, chief complaint, or diagnosis");
      return;
    }

    setIsSaving(true);
    try {
      const formattedItems = selectedItems.map((item, idx) => ({
        medicineId: item.medicineId,
        medicineLineSnapshot: `${item.form ? item.form.toUpperCase() + ". " : ""}${
          item.brandName || item.genericName
        } ${item.strength || ""}`.trim(),
        dosagePatternId: item.dosagePatternId || null,
        dosageTextBn: item.dosageTextBn || null,
        mealTimingId: item.mealTimingId || null,
        mealTimingTextBn: item.mealTimingTextBn || null,
        durationOptionId: item.durationOptionId || null,
        durationTextBn: item.durationTextBn || null,
        customInstruction: item.customInstruction || null,
        sortOrder: idx + 1,
      }));

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

  // Filtered template suggestions
  const ccSuggestions = quickTexts.filter((q) => q.kind === "chief_complaint");
  const oeSuggestions = quickTexts.filter((q) => q.kind === "examination");
  const dxSuggestions = quickTexts.filter((q) => q.kind === "diagnosis");
  const ixSuggestions = quickTexts.filter((q) => q.kind === "investigation");

  // Helper for quick chip appending to clinical notes
  const appendChipText = (
    current: string,
    setFunc: (val: string) => void,
    chipText: string
  ) => {
    if (!current.trim()) {
      setFunc(chipText);
    } else if (!current.toLowerCase().includes(chipText.toLowerCase())) {
      setFunc(`${current.trim()}, ${chipText}`);
    }
  };

  return (
    <div className="bg-[#EAEAEA] min-h-screen py-6 px-3 sm:px-6 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* TOP FLOATING / STICKY ACTION BAR (OUTSIDE THE WHITE PAGE)     */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-3 z-30 max-w-4xl mx-auto mb-6">
        <div className="bg-[#1C1C1E] text-white p-3 rounded-2xl shadow-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/app/prescriptions"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </Link>

            {appointmentId && (
              <Link
                href="/app/queue"
                className="px-3 py-1.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-xs font-bold flex items-center gap-1.5 transition text-white shadow-xs"
              >
                <Armchair className="w-3.5 h-3.5" />
                <span>Return to Queue</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition text-white cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Patient Profile</span>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Upload / Reports button */}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition text-white cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-blue-300" />
              <span>Upload Scans / Reports</span>
              {reports.length > 0 && (
                <span className="px-1.5 py-0.2 bg-[#2A5CAA] text-white rounded-full text-[10px] font-bold">
                  {reports.length}
                </span>
              )}
            </button>

            {/* View Reports Drawer Toggle if reports exist */}
            {reports.length > 0 && (
              <button
                type="button"
                onClick={() => setIsReportsDrawerOpen(!isReportsDrawerOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isReportsDrawerOpen
                    ? "bg-amber-500 text-black font-extrabold"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isReportsDrawerOpen ? "Hide Scans" : "View Scans"}</span>
              </button>
            )}

            {/* Allergy Banner Pill */}
            {patient.allergyFlags.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-[#FF453A]/20 border border-[#FF453A]/40 text-[#FF453A] text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Allergy:</span>
                <span className="font-extrabold">{patient.allergyFlags.join(", ")}</span>
              </div>
            )}

            {/* Prominent Save & Print Prescription Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#30D158] hover:bg-[#28B84D] text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-[#30D158]/20 transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Issuing...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-black" />
                  <span>Save &amp; Print Document</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Reports / Scans Drawer (Collapsible) */}
      <AnimatePresence>
        {isReportsDrawerOpen && reports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-gray-300 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#2A5CAA]" />
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Patient Scans &amp; Radiographs ({reports.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="text-xs text-[#2A5CAA] hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New Scan</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="group relative border border-gray-200 rounded-xl p-2 bg-gray-50 hover:bg-white transition"
                >
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center text-white"
                  >
                    {r.contentType?.startsWith("image/") ? (
                      <img
                        src={r.url}
                        alt={r.title || "Scan"}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-gray-400" />
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                      {r.kind.toUpperCase()}
                    </span>
                  </a>
                  <p className="text-[11px] font-bold text-gray-800 mt-1.5 truncate">
                    {r.title || r.reportCode || "Clinical Scan"}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* THE WHITE PAPER PRESCRIPTION CANVAS (WYSIWYG Dental Sheet)    */}
      {/* ------------------------------------------------------------- */}
      <main className="bg-white shadow-2xl rounded-sm border border-gray-300 max-w-4xl mx-auto p-8 sm:p-12 text-black font-sans min-h-[1150px] relative transition-all flex flex-col justify-between">
        <div>
          {/* Header / Clinic Letterhead */}
          {clinic.rxPrintLetterhead !== false && (
            <div className="border-b-2 border-black pb-4 mb-5 flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {clinic.logoUrl ? (
                  <img
                    src={clinic.logoUrl}
                    alt={clinic.name}
                    className="w-16 h-16 object-contain shrink-0 rounded-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-xl">
                    🦷
                  </div>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
                    {clinic.name}
                  </h1>
                  <p className="text-xs text-gray-700 font-medium">{clinic.address}</p>
                  <p className="text-xs text-gray-700 font-medium">
                    Phone: {clinic.phone || "—"}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <h2 className="text-base sm:text-lg font-bold text-gray-950">
                  {doctor.doctorTitle} {doctor.name}
                </h2>
                <p className="text-xs text-gray-700">{doctor.doctorDegrees}</p>
                <p className="text-xs text-gray-700">{doctor.doctorSpecialty}</p>
                <p className="text-xs font-mono font-bold text-gray-900 mt-0.5">
                  Reg No: {doctor.doctorRegNo}
                </p>
              </div>
            </div>
          )}

          {/* Patient Information Banner Box */}
          <div className="border border-black p-3.5 rounded-xs mb-6 flex flex-wrap items-center justify-between text-xs bg-gray-50/70 text-gray-950 gap-4">
            <div className="space-y-1">
              <div>
                <span className="font-bold text-gray-700">Patient Name:</span>{" "}
                <span className="font-bold text-gray-950 text-sm ml-1">{patient.name}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Age/Gender:</span>{" "}
                <span className="font-medium ml-1">
                  {patient.approxAge ? `${patient.approxAge} yrs` : "—"} / {patient.gender}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div>
                <span className="font-bold text-gray-700">Card No:</span>{" "}
                <span className="font-mono font-bold ml-1 text-sm tracking-wide">
                  {patient.cardNumber}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Date:</span>{" "}
                <span className="font-medium ml-1">
                  {formatDhakaDate(new Date(), "d MMM yyyy")}
                </span>
              </div>
            </div>

            <div className="text-right">
              <BarcodeSvg
                value={patient.cardNumber}
                width={1.2}
                height={28}
                fontSize={9}
                className="inline-block"
              />
              <span className="block text-[10px] font-mono text-gray-500 font-bold mt-0.5">
                RX BARCODE (PREVIEW)
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 2-COLUMN PRESCRIPTION BODY (FINDINGS & RX MEDICINES)          */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Clinical Findings (4 Cols) */}
            <div className="md:col-span-4 border-r border-gray-200 pr-5 space-y-6">
              {/* 1. CHIEF COMPLAINT */}
              <div>
                <ClinicalAutocompleteInput
                  label="CHIEF COMPLAINT"
                  value={chiefComplaint}
                  onChange={setChiefComplaint}
                  placeholder="Type or search complaints..."
                  suggestions={ccSuggestions}
                  rows={2}
                />
              </div>

              {/* 2. ON EXAMINATION */}
              <div>
                <ClinicalAutocompleteInput
                  label="ON EXAMINATION"
                  value={examination}
                  onChange={setExamination}
                  placeholder="Clinical findings..."
                  suggestions={oeSuggestions}
                  rows={2}
                />
              </div>

              {/* 3. DIAGNOSIS */}
              <div>
                <ClinicalAutocompleteInput
                  label="DIAGNOSIS"
                  value={diagnosis}
                  onChange={setDiagnosis}
                  placeholder="Provisional diagnosis..."
                  suggestions={dxSuggestions}
                  rows={2}
                />
              </div>

              {/* 4. TEETH (FDI) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1E]">
                    TEETH (FDI)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsToothModalOpen(true)}
                    className="text-[11px] font-bold text-[#2A5CAA] hover:text-[#1E4282] hover:bg-[#EBF2FC] px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer border border-[#2A5CAA]/20"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>{toothCodes.length > 0 ? "Edit Teeth" : "Select FDI"}</span>
                  </button>
                </div>

                {toothCodes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    {toothCodes.map((code) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 rounded bg-black text-white font-mono font-bold text-xs"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsToothModalOpen(true)}
                    className="p-2.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-xs text-gray-400 italic cursor-pointer hover:bg-gray-100 hover:text-gray-600 transition"
                  >
                    Click to select affected teeth on FDI chart...
                  </div>
                )}
              </div>

              {/* 5. INVESTIGATIONS ADVISED */}
              <div>
                <ClinicalAutocompleteInput
                  label="INVESTIGATIONS ADVISED"
                  value={investigations}
                  onChange={setInvestigations}
                  placeholder="X-rays, OPG, lab tests..."
                  suggestions={ixSuggestions}
                  rows={2}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: ℞ Medications & Advice (8 Cols) */}
            <div className="md:col-span-8 pl-1 space-y-6">
              {/* Stylized ℞ Mark */}
              <div className="flex items-center justify-between">
                <span className="text-3xl font-serif font-black text-black select-none tracking-tight">
                  ℞
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {selectedItems.length} {selectedItems.length === 1 ? "medicine" : "medicines"} added
                </span>
              </div>

              {/* Fast Medicine Search Input */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search medicine by brand or generic name (e.g. Napa, Amodis, Amoxicillin)..."
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(e) => handleSearchMedicine(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Instant Search Results Dropdown */}
                {isSearchFocused && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-gray-300 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-gray-100">
                    {searchResults.map((med) => {
                      const allergy = checkMedicineAllergy(med, patient.allergyFlags);
                      return (
                        <div
                          key={med.id}
                          onClick={() => addMedicine(med)}
                          className={`p-3 flex items-center justify-between hover:bg-blue-50 transition cursor-pointer ${
                            allergy.level === "block" ? "bg-red-50/60" : ""
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-gray-950">
                                {med.brandName || med.genericName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-gray-200 text-[10px] font-bold uppercase text-gray-700">
                                {med.form}
                              </span>
                              {med.strength && (
                                <span className="text-[11px] text-gray-500 font-mono">
                                  {med.strength}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {med.genericName}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {allergy.level === "block" && (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                                ALLERGY
                              </span>
                            )}
                            <span className="text-xs font-bold text-[#2A5CAA] hover:underline">
                              + Add
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Numbered Prescribed Items (Exactly Matching the Screenshot!) */}
              <div className="space-y-4">
                {selectedItems.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                    <p className="text-xs text-gray-500 font-medium">
                      No medications prescribed yet. Search above to add medicines.
                    </p>
                  </div>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/40 hover:bg-white hover:border-gray-400 transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Clinical Line Header (e.g. 1. Tab. Amodis 400 mg (Metronidazole)) */}
                        <div>
                          <h4 className="text-sm font-extrabold text-gray-950">
                            {idx + 1}. {item.form ? item.form.charAt(0).toUpperCase() + item.form.slice(1) + ". " : ""}
                            {item.brandName || item.genericName}{" "}
                            {item.strength ? `${item.strength} ` : ""}
                            {item.brandName && (
                              <span className="font-normal text-gray-600">
                                ({item.genericName})
                              </span>
                            )}
                          </h4>

                          {/* Bangla Dosage Preview (১+০+১ — খাবার পরে — ৭ দিন) */}
                          <div className="text-xs text-gray-800 font-semibold mt-1 flex items-center gap-2">
                            <span>{item.dosageTextBn || "১+০+১"}</span>
                            <span>—</span>
                            <span>{item.mealTimingTextBn || "খাবার পরে"}</span>
                            <span>—</span>
                            <span>{item.durationTextBn || "৭ দিন"}</span>
                            {item.customInstruction && (
                              <>
                                <span>—</span>
                                <span className="text-blue-700 italic">
                                  {item.customInstruction}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          title="Remove medicine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Inline Interactive Selectors */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-3 mt-2 border-t border-gray-200/60">
                        {/* Dosage Pattern */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">
                            Dosage
                          </label>
                          <select
                            value={item.dosageTextBn}
                            onChange={(e) => updateItem(item.id, { dosageTextBn: e.target.value })}
                            className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg p-1.5 focus:border-black outline-none"
                          >
                            {dosagePatterns.map((dp) => (
                              <option key={dp.id} value={dp.labelBn}>
                                {dp.labelBn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Meal Timing */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">
                            Timing
                          </label>
                          <select
                            value={item.mealTimingTextBn}
                            onChange={(e) => updateItem(item.id, { mealTimingTextBn: e.target.value })}
                            className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg p-1.5 focus:border-black outline-none"
                          >
                            {mealTimings.map((mt) => (
                              <option key={mt.id} value={mt.labelBn}>
                                {mt.labelBn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">
                            Duration
                          </label>
                          <select
                            value={item.durationTextBn}
                            onChange={(e) => updateItem(item.id, { durationTextBn: e.target.value })}
                            className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-lg p-1.5 focus:border-black outline-none"
                          >
                            {durationOptions.map((dur) => (
                              <option key={dur.id} value={dur.labelBn}>
                                {dur.labelBn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Custom Instruction */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">
                            Note (optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. ব্যথা থাকলে"
                            value={item.customInstruction || ""}
                            onChange={(e) => updateItem(item.id, { customInstruction: e.target.value })}
                            className="w-full text-xs bg-white border border-gray-300 rounded-lg p-1.5 focus:border-black outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Divider between medicines and advice */}
              <div className="border-t border-gray-200 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-950">
                    উপদেশ (ADVICE):
                  </h3>
                  <span className="text-xs text-gray-500">
                    {selectedAdvice.length} advice lines
                  </span>
                </div>

                {/* Advice Category Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {adviceGroups.map((group) => {
                    const groupLines = adviceTemplates
                      .filter((a) => a.groupName === group)
                      .map((a) => a.textBn);
                    const isAllSelected = groupLines.every((l) => selectedAdvice.includes(l));
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => toggleAdviceGroup(group)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                          isAllSelected
                            ? "bg-black text-white border-black"
                            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {isAllSelected ? "✓ " : "+ "} {group}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Advice Bullets */}
                {selectedAdvice.length > 0 && (
                  <div className="space-y-1.5 text-xs text-gray-900 leading-relaxed font-medium pt-1">
                    {selectedAdvice.map((line, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2 group">
                        <span>• {line}</span>
                        <button
                          type="button"
                          onClick={() => toggleAdviceLine(line)}
                          className="text-gray-400 hover:text-red-600 p-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Advice Input */}
                <form onSubmit={handleAddCustomAdvice} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Type custom advice line (Bangla / English)..."
                    value={customAdviceInput}
                    onChange={(e) => setCustomAdviceInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg outline-none focus:bg-white focus:border-black"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </form>
              </div>

              {/* Next Follow-up Visit (পরবর্তী সাক্ষাৎ) */}
              <div className="border-t border-gray-200 pt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-950">
                    পরবর্তী সাক্ষাৎ (Next Follow-up):
                  </h3>
                  {nextVisitDate && (
                    <span className="text-xs font-bold text-[#2A5CAA]">
                      {formatDhakaDate(new Date(nextVisitDate), "d MMM yyyy")}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {["+3 days", "+7 days", "+14 days", "+1 month"].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => {
                        const todayDhaka = getDhakaTodayStr();
                        if (dur === "+3 days") setNextVisitDate(addDhakaDays(todayDhaka, 3));
                        if (dur === "+7 days") setNextVisitDate(addDhakaDays(todayDhaka, 7));
                        if (dur === "+14 days") setNextVisitDate(addDhakaDays(todayDhaka, 14));
                        if (dur === "+1 month") setNextVisitDate(addDhakaMonths(todayDhaka, 1));
                      }}
                      className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800 transition cursor-pointer"
                    >
                      {dur}
                    </button>
                  ))}

                  <input
                    type="date"
                    value={nextVisitDate}
                    min={getDhakaTodayStr()}
                    onChange={(e) => setNextVisitDate(e.target.value)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:border-black outline-none"
                  />
                </div>
              </div>

              {/* Private Doctor's Clinical Notes (Not Printed) */}
              <div className="border-t border-gray-200 pt-5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                  Private Clinical Notes (For Doctor&apos;s Record, Not Printed)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal treatment notes, procedure reminders..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:bg-white focus:border-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PRESCRIPTION FOOTER & SIGNATURE BLOCK                         */}
        {/* ------------------------------------------------------------- */}
        <footer className="border-t border-gray-200 pt-8 mt-12 flex flex-col sm:flex-row items-end justify-between gap-4 text-xs text-gray-600">
          <div>
            <span className="font-mono text-gray-500">
              Generated via Oris EMR • {patient.cardNumber}
            </span>
          </div>

          <div className="text-right space-y-0.5">
            <div className="w-48 border-b border-black mb-1.5 ml-auto" />
            <p className="font-bold text-gray-900 text-sm">
              {doctor.doctorTitle} {doctor.name}
            </p>
            <p className="font-mono text-[11px] text-gray-600">
              {doctor.doctorRegNo}
            </p>
          </div>
        </footer>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODALS: POST-SAVE, PROFILE, UPLOAD, ALLERGY, TOOTH            */}
      {/* ------------------------------------------------------------- */}

      {/* 1. Prescription Saved Success Action Modal */}
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
                href={`/app/billing/new?patientId=${patient.id}${
                  appointmentId ? `&appointmentId=${appointmentId}` : ""
                }`}
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
                onClick={() => {
                  setSavedPrescription(null);
                  router.push("/app/prescriptions");
                }}
                className="w-full py-2.5 px-4 rounded-xl text-gray-500 hover:text-gray-800 font-semibold text-xs text-center transition cursor-pointer"
              >
                Close &amp; Go to Prescriptions List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Patient Profile Modal */}
      {isProfileModalOpen && (
        <PatientProfileModal
          patientId={patient.id}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* 3. Upload Radiograph / Report Modal */}
      {isUploadModalOpen && (
        <UploadReportModal
          patientId={patient.id}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploaded={(newReport) => {
            setReports((prev) => [newReport, ...prev]);
            setIsReportsDrawerOpen(true);
            setIsUploadModalOpen(false);
          }}
        />
      )}

      {/* 4. Tooth Selector Modal */}
      {isToothModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-gray-300 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Select Teeth (FDI Notation)
                </h3>
                <p className="text-xs text-gray-500">
                  Full adult &amp; child panoramic dental arch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsToothModalOpen(false)}
                className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ToothSelector
              selectedTeeth={toothCodes}
              onChange={setToothCodes}
            />

            <div className="flex justify-end pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsToothModalOpen(false)}
                className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Done ({toothCodes.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Drug Allergy Conflict Modal */}
      {blockingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#FF453A] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#FF453A]">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-gray-950">
                  Drug Allergy Warning
                </h3>
                <span className="text-xs font-semibold text-[#FF453A]">
                  Critical Clinical Conflict
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-800 leading-relaxed">
              Patient has documented allergy:{" "}
              <strong className="text-[#FF453A]">
                {blockingItem.allergy.matchedFlag}
              </strong>
              . This medicine belongs to drug class:{" "}
              <strong className="text-gray-900 font-mono">
                {blockingItem.medicine.drugClass}
              </strong>
              . Prescribing this may cause adverse allergic reactions.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setBlockingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const med = blockingItem.medicine;
                  setBlockingItem(null);
                  addMedicine(med, true);
                }}
                className="px-4 py-2 rounded-xl bg-[#FF453A] hover:bg-[#D9382F] text-white text-xs font-bold transition shadow-xs"
              >
                Override &amp; Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
