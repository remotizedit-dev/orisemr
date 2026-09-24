"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ToothSelector } from "./ToothSelector";
import { checkMedicineAllergy, type AllergyCheckResult } from "@/lib/clinical-flags";
import { savePrescriptionAction } from "@/app/(tenant)/app/prescriptions/actions";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Armchair,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface PrescriptionBuilderProps {
  patient: {
    id: string;
    name: string;
    cardNumber: string;
    gender: string;
    approxAge: number | null;
    allergyFlags: string[];
    medicalConditions: string[];
  };
  appointmentId?: string;
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
  catalogMedicines,
  dosagePatterns,
  mealTimings,
  durationOptions,
  adviceTemplates,
  quickTexts,
}: PrescriptionBuilderProps) {
  const router = useRouter();

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

  const addMedicine = (med: (typeof catalogMedicines)[0], forceOverride = false) => {
    // Check allergy
    const allergyCheck = checkMedicineAllergy(med, patient.allergyFlags);
    if (allergyCheck.hasConflict && allergyCheck.level === "block" && !forceOverride) {
      setBlockingItem({ medicine: med, allergy: allergyCheck });
      return;
    }

    const newItem: SelectedMedicineItem = {
      id: Math.random().toString(),
      medicineId: med.id,
      brandName: med.brandName,
      genericName: med.genericName,
      strength: med.strength,
      form: med.form,
      drugClass: med.drugClass,
      dosageTextBn: "১+০+১", // standard default
      mealTimingTextBn: "খাবার পরে",
      durationTextBn: "৭ দিন",
      allergyNotice: allergyCheck.hasConflict ? allergyCheck : undefined,
    };

    setSelectedItems([...selectedItems, newItem]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const appendQuickText = (setter: React.Dispatch<React.SetStateAction<string>>, text: string) => {
    setter((prev) => (prev ? `${prev}, ${text}` : text));
  };

  const toggleAdviceGroup = (groupName: string) => {
    const groupLines = adviceTemplates
      .filter((a) => a.groupName === groupName)
      .map((a) => a.textBn);

    const allSelected = groupLines.every((line) => selectedAdvice.includes(line));
    if (allSelected) {
      setSelectedAdvice(selectedAdvice.filter((a) => !groupLines.includes(a)));
    } else {
      const merged = Array.from(new Set([...selectedAdvice, ...groupLines]));
      setSelectedAdvice(merged);
    }
  };

  const toggleAdviceLine = (line: string) => {
    if (selectedAdvice.includes(line)) {
      setSelectedAdvice(selectedAdvice.filter((a) => a !== line));
    } else {
      setSelectedAdvice([...selectedAdvice, line]);
    }
  };

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please add at least one medicine to the prescription");
      return;
    }

    setIsSaving(true);
    try {
      const formattedItems = selectedItems.map((item, idx) => {
        const formPrefix = item.form === "tablet" ? "Tab." : item.form === "capsule" ? "Cap." : item.form === "mouthwash" ? "Mouthwash" : "";
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

  return (
    <div className="space-y-6">
      {/* Allergy Block Confirmation Modal */}
      {blockingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-floating rounded-2xl max-w-md w-full p-6 border border-[#FF453A] space-y-4 animate-in zoom-in-95">
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
                className="px-4 py-2 rounded-xl bg-[#F4F4F5] text-xs font-semibold text-[#1C1C1E] hover:bg-[#E4E4E7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const med = blockingItem.medicine;
                  setBlockingItem(null);
                  addMedicine(med, true); // override confirmed
                  toast.warning("Allergy override confirmed and audited");
                }}
                className="px-4 py-2 rounded-xl bg-[#FF453A] hover:bg-[#e0382e] text-white text-xs font-bold shadow"
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
                Prescription <span className="font-mono font-bold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded">{savedPrescription.rxCode}</span> for <strong>{patient.name}</strong> has been saved.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <Link
                href={`/print/prescription/${savedPrescription.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
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

              <Link
                href={`/app/patients/${patient.id}`}
                className="w-full py-3 px-4 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <User className="w-4.5 h-4.5 text-[#2A5CAA]" />
                <span>Return to Patient Profile</span>
              </Link>

              <Link
                href="/app/prescriptions"
                className="w-full py-3 px-4 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-[#1C1C1E] hover:text-[#2A5CAA] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileText className="w-4.5 h-4.5 text-[#2A5CAA]" />
                <span>View All Prescriptions</span>
              </Link>

              <Link
                href="/app"
                className="w-full py-2.5 px-4 rounded-xl text-center text-[#4B5563] hover:text-[#1C1C1E] font-bold text-sm block transition cursor-pointer"
              >
                ← Go to Clinic Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Prescription Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================================================================== */}
        {/* Left Column (3 cols): Patient Summary, Allergies & Previous Visits  */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Patient Card */}
          <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-3.5 shadow-2xs">
            <div>
              <span className="text-xs font-extrabold uppercase text-[#6B7280] tracking-wider block">
                Patient Header
              </span>
              <h2 className="text-lg font-black text-[#1C1C1E] mt-0.5">
                {patient.name}
              </h2>
              <span className="font-mono text-sm text-[#2A5CAA] bg-[#E8EEF7] px-2.5 py-1 rounded-lg font-bold inline-block mt-1">
                Card: {patient.cardNumber}
              </span>
            </div>

            <div className="text-sm font-semibold text-[#4B5563]">
              <span>
                {patient.approxAge ? `${patient.approxAge} yrs` : "Age —"} •{" "}
                {patient.gender}
              </span>
            </div>

            {/* Allergy Chips in Red */}
            <div>
              <span className="text-xs font-bold text-[#FF453A] uppercase tracking-wider block mb-1.5">
                Allergies:
              </span>
              {patient.allergyFlags.length === 0 ? (
                <span className="text-sm text-[#6B7280] italic">No known allergies</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergyFlags.map((flag) => (
                    <span
                      key={flag}
                      className="px-2.5 py-1 rounded-lg bg-[#FFEBEA] border border-[#FF453A]/40 text-[#FF453A] text-xs font-bold"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Condition Chips in Amber */}
            <div>
              <span className="text-xs font-bold text-[#FF9F0A] uppercase tracking-wider block mb-1.5">
                Medical Conditions:
              </span>
              {patient.medicalConditions.length === 0 ? (
                <span className="text-sm text-[#6B7280] italic">No conditions noted</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {patient.medicalConditions.map((cond) => (
                    <span
                      key={cond}
                      className="px-2.5 py-1 rounded-lg bg-[#FFF7EB] border border-[#FF9F0A]/40 text-[#FF9F0A] text-xs font-bold"
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
        {/* Middle Column (4 cols): Clinical Notes, Quick-Text Chips & Teeth    */}
        {/* ==================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-4 shadow-2xs">
            <h2 className="text-sm font-extrabold uppercase text-[#4B5563] tracking-wider">
              Clinical Findings
            </h2>

            {/* FDI Tooth Chart */}
            <ToothSelector selectedTeeth={toothCodes} onChange={setToothCodes} />

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-bold text-[#1C1C1E] mb-1.5">
                Chief Complaint (C/C)
              </label>
              <textarea
                rows={2}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. Severe toothache on lower right side..."
                className="w-full p-3 rounded-xl border border-[#E4E4E7] bg-white text-sm sm:text-base focus:outline-none focus:border-[#2A5CAA] shadow-2xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickTexts
                  .filter((q) => q.kind === "chief_complaint")
                  .slice(0, 6)
                  .map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => appendQuickText(setChiefComplaint, q.text)}
                      className="px-2.5 py-1 rounded-lg bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-semibold text-[#1C1C1E] hover:text-[#2A5CAA] transition cursor-pointer"
                    >
                      + {q.text}
                    </button>
                  ))}
              </div>
            </div>

            {/* On Examination */}
            <div>
              <label className="block text-sm font-bold text-[#1C1C1E] mb-1.5">
                On Examination (O/E)
              </label>
              <textarea
                rows={2}
                value={examination}
                onChange={(e) => setExamination(e.target.value)}
                placeholder="e.g. Deep caries, tender on percussion..."
                className="w-full p-3 rounded-xl border border-[#E4E4E7] bg-white text-sm sm:text-base focus:outline-none focus:border-[#2A5CAA] shadow-2xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickTexts
                  .filter((q) => q.kind === "examination")
                  .slice(0, 6)
                  .map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => appendQuickText(setExamination, q.text)}
                      className="px-2.5 py-1 rounded-lg bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-semibold text-[#1C1C1E] hover:text-[#2A5CAA] transition cursor-pointer"
                    >
                      + {q.text}
                    </button>
                  ))}
              </div>
            </div>

            {/* Diagnosis */}
            <div>
              <label className="block text-sm font-bold text-[#1C1C1E] mb-1.5">
                Diagnosis
              </label>
              <textarea
                rows={2}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Irreversible pulpitis #46"
                className="w-full p-3 rounded-xl border border-[#E4E4E7] bg-white text-sm sm:text-base focus:outline-none focus:border-[#2A5CAA] shadow-2xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickTexts
                  .filter((q) => q.kind === "diagnosis")
                  .slice(0, 6)
                  .map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => appendQuickText(setDiagnosis, q.text)}
                      className="px-2.5 py-1 rounded-lg bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-semibold text-[#1C1C1E] hover:text-[#2A5CAA] transition cursor-pointer"
                    >
                      + {q.text}
                    </button>
                  ))}
              </div>
            </div>

            {/* Investigations */}
            <div>
              <label className="block text-sm font-bold text-[#1C1C1E] mb-1.5">
                Investigations Advised
              </label>
              <input
                type="text"
                value={investigations}
                onChange={(e) => setInvestigations(e.target.value)}
                placeholder="e.g. IOPA X-ray, OPG"
                className="w-full p-3 rounded-xl border border-[#E4E4E7] bg-white text-sm sm:text-base focus:outline-none focus:border-[#2A5CAA] shadow-2xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickTexts
                  .filter((q) => q.kind === "investigation")
                  .slice(0, 5)
                  .map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => appendQuickText(setInvestigations, q.text)}
                      className="px-2.5 py-1 rounded-lg bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-semibold text-[#1C1C1E] hover:text-[#2A5CAA] transition cursor-pointer"
                    >
                      + {q.text}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Right Column (5 cols): Fast Rx Items, Bangla Chips & Advice Bullets */}
        {/* ==================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E4E4E7]">
              <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1E] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2A5CAA]" />
                <span>Prescription (Rx)</span>
              </h2>
              <span className="text-xs font-bold bg-[#E8EEF7] text-[#2A5CAA] px-3 py-1 rounded-full font-mono">
                {selectedItems.length} items
              </span>
            </div>

            {/* Search Medicine Input */}
            <div className="relative">
              <div className="flex items-center rounded-2xl border-2 border-[#2A5CAA]/40 focus-within:border-[#2A5CAA] bg-white px-3.5 py-2.5 shadow-2xs transition">
                <Search className="w-5 h-5 text-[#2A5CAA] mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchMedicine(e.target.value)}
                  placeholder="Type medicine name (e.g. Napa, Moxacil, Rolac)..."
                  className="w-full bg-transparent text-base focus:outline-none placeholder:text-sm placeholder:text-[#6B7280] font-medium"
                />
              </div>

              {/* Search Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 glass-dropdown rounded-2xl border border-[#E4E4E7] shadow-xl overflow-hidden divide-y divide-[#E4E4E7] max-h-72 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addMedicine(m)}
                      className="w-full px-4 py-3 text-left hover:bg-[#E8EEF7] flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <span className="font-black text-base text-[#1C1C1E] block">
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

            {/* Selected Rx Items List */}
            <div className="space-y-4">
              {selectedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="clinical-card p-4 rounded-2xl border border-[#E4E4E7] space-y-3 bg-white shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-black text-base text-[#1C1C1E] block">
                        {idx + 1}. {item.brandName ? `${item.brandName} ${item.strength || ""}` : item.genericName}
                      </span>
                      {item.brandName && (
                        <span className="text-xs font-semibold text-[#6B7280] block mt-0.5">
                          ({item.genericName})
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
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {item.allergyNotice && (
                    <div className="p-2.5 rounded-xl bg-[#FFEBEA] border border-[#FF453A]/30 text-xs text-[#FF453A] flex items-center gap-2 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{item.allergyNotice.message}</span>
                    </div>
                  )}

                  {/* One-Click Bangla Chips */}
                  <div className="space-y-2.5 pt-1.5 border-t border-[#E4E4E7]">
                    {/* Dosage Patterns */}
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
                          className={`px-3 py-1.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                            item.dosageTextBn === dp.labelBn
                              ? "bg-[#2A5CAA] text-white shadow-xs"
                              : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                          }`}
                        >
                          {dp.labelBn}
                        </button>
                      ))}
                    </div>

                    {/* Meal Timings */}
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
                          className={`px-3 py-1.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                            item.mealTimingTextBn === mt.labelBn
                              ? "bg-[#2A5CAA] text-white shadow-xs"
                              : "bg-[#F4F4F5] text-[#1C1C1E] hover:bg-[#E8EEF7]"
                          }`}
                        >
                          {mt.labelBn}
                        </button>
                      ))}
                    </div>

                    {/* Duration Options */}
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
                          className={`px-3 py-1.5 rounded-xl text-sm font-bold transition cursor-pointer ${
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

            {/* Bangla Advice Templates (Grouped) */}
            <div className="space-y-3 pt-3.5 border-t border-[#E4E4E7]">
              <span className="text-xs font-black uppercase text-[#4B5563] tracking-wider block">
                পরামর্শ (Bangla Advice)
              </span>
              <div className="flex flex-wrap gap-2">
                {adviceGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleAdviceGroup(group)}
                    className="px-3 py-1.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-bold text-[#1C1C1E] hover:text-[#2A5CAA] transition cursor-pointer shadow-2xs"
                  >
                    + {group}
                  </button>
                ))}
              </div>

              {selectedAdvice.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#F4F4F5] space-y-2 text-sm text-[#1C1C1E] font-medium">
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
            </div>

            {/* Next Visit Date Quick Picks */}
            <div className="pt-3.5 border-t border-[#E4E4E7] space-y-2.5">
              <span className="text-sm font-bold text-[#1C1C1E] block">
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
                    className="px-3 py-1.5 rounded-xl bg-[#F4F4F5] hover:bg-[#E8EEF7] text-xs font-bold text-[#1C1C1E] hover:text-[#2A5CAA] cursor-pointer transition"
                  >
                    {dur}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E4E4E7] bg-white text-sm font-mono font-bold focus:outline-none focus:border-[#2A5CAA]"
              />
            </div>

            {/* Save & Print Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 px-5 rounded-2xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-[#2A5CAA]/25 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Prescription...</span>
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
    </div>
  );
}
