"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  FileText,
  Plus,
  Search,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  createMedicineAction,
  updateMedicineAction,
  deleteMedicineAction,
  createAdviceTemplateAction,
  updateAdviceTemplateAction,
  deleteAdviceTemplateAction,
} from "@/app/(tenant)/app/settings/actions";

const MEDICINE_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "suspension",
  "drops",
  "gel",
  "paste",
  "ointment",
  "mouthwash",
  "toothpaste",
  "injection",
  "other",
] as const;

interface Medicine {
  id: string;
  brandName: string | null;
  genericName: string;
  strength: string | null;
  form: string;
  drugClass: string | null;
  isActive: boolean;
}

interface AdviceTemplate {
  id: string;
  groupName: string;
  textBn: string;
  isActive: boolean;
}

interface Props {
  initialMedicines: Medicine[];
  initialAdvice: AdviceTemplate[];
}

export default function PrescriptionsCatalogClient({
  initialMedicines,
  initialAdvice,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"medicines" | "advice">("medicines");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAdviceGroup, setSelectedAdviceGroup] = useState<string>("all");

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [deletingMedId, setDeletingMedId] = useState<string | null>(null);

  const [showAddAdviceModal, setShowAddAdviceModal] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<AdviceTemplate | null>(null);
  const [deletingAdviceId, setDeletingAdviceId] = useState<string | null>(null);

  // Form states - Medicine
  const [medGeneric, setMedGeneric] = useState("");
  const [medBrand, setMedBrand] = useState("");
  const [medForm, setMedForm] = useState<string>("tablet");
  const [medStrength, setMedStrength] = useState("");
  const [medClass, setMedClass] = useState("");
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);

  // Form states - Advice
  const [adviceGroup, setAdviceGroup] = useState("");
  const [adviceText, setAdviceText] = useState("");
  const [isSubmittingAdvice, setIsSubmittingAdvice] = useState(false);

  // Advice Groups
  const adviceGroups = Array.from(
    new Set(initialAdvice.map((a) => a.groupName).filter(Boolean))
  ).sort();

  // Filtered lists
  const filteredMedicines = initialMedicines.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.genericName.toLowerCase().includes(q) ||
      (m.brandName && m.brandName.toLowerCase().includes(q)) ||
      (m.drugClass && m.drugClass.toLowerCase().includes(q))
    );
  });

  const filteredAdvice = initialAdvice.filter((a) => {
    if (selectedAdviceGroup !== "all" && a.groupName !== selectedAdviceGroup) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.textBn.toLowerCase().includes(q) ||
      a.groupName.toLowerCase().includes(q)
    );
  });

  // Handlers - Medicine
  function openAddMed() {
    setMedGeneric("");
    setMedBrand("");
    setMedForm("tablet");
    setMedStrength("");
    setMedClass("");
    setShowAddMedModal(true);
  }

  function openEditMed(m: Medicine) {
    setEditingMed(m);
    setMedGeneric(m.genericName);
    setMedBrand(m.brandName || "");
    setMedForm(m.form);
    setMedStrength(m.strength || "");
    setMedClass(m.drugClass || "");
  }

  async function handleSaveMedicine(e: React.FormEvent) {
    e.preventDefault();
    if (!medGeneric.trim()) {
      toast.error("Generic name is required");
      return;
    }

    setIsSubmittingMed(true);
    try {
      if (editingMed) {
        await updateMedicineAction({
          id: editingMed.id,
          genericName: medGeneric.trim(),
          brandName: medBrand.trim() || undefined,
          form: medForm as any,
          strength: medStrength.trim() || undefined,
          drugClass: medClass.trim() || undefined,
        });
        toast.success(`Updated ${medBrand || medGeneric}`);
        setEditingMed(null);
      } else {
        await createMedicineAction({
          genericName: medGeneric.trim(),
          brandName: medBrand.trim() || undefined,
          form: medForm as any,
          strength: medStrength.trim() || undefined,
          drugClass: medClass.trim() || undefined,
        });
        toast.success(`Added ${medBrand || medGeneric}`);
        setShowAddMedModal(false);
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save medicine");
    } finally {
      setIsSubmittingMed(false);
    }
  }

  async function handleDeleteMed(m: Medicine) {
    if (
      !confirm(
        `Are you sure you want to delete ${m.brandName ? `${m.brandName} (${m.genericName})` : m.genericName}?`
      )
    ) {
      return;
    }

    setDeletingMedId(m.id);
    try {
      await deleteMedicineAction(m.id);
      toast.success("Medicine deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete medicine");
    } finally {
      setDeletingMedId(null);
    }
  }

  // Handlers - Advice
  function openAddAdvice() {
    setAdviceGroup(adviceGroups[0] || "General Dental Care");
    setAdviceText("");
    setShowAddAdviceModal(true);
  }

  function openEditAdvice(a: AdviceTemplate) {
    setEditingAdvice(a);
    setAdviceGroup(a.groupName);
    setAdviceText(a.textBn);
  }

  async function handleSaveAdvice(e: React.FormEvent) {
    e.preventDefault();
    if (!adviceText.trim()) {
      toast.error("Advice text is required");
      return;
    }

    setIsSubmittingAdvice(true);
    try {
      if (editingAdvice) {
        await updateAdviceTemplateAction({
          id: editingAdvice.id,
          groupName: adviceGroup.trim() || "General Dental Care",
          textBn: adviceText.trim(),
        });
        toast.success("Updated advice template");
        setEditingAdvice(null);
      } else {
        await createAdviceTemplateAction({
          groupName: adviceGroup.trim() || "General Dental Care",
          textBn: adviceText.trim(),
        });
        toast.success("Added advice template");
        setShowAddAdviceModal(false);
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save advice");
    } finally {
      setIsSubmittingAdvice(false);
    }
  }

  async function handleDeleteAdvice(a: AdviceTemplate) {
    if (!confirm("Are you sure you want to delete this advice template?")) {
      return;
    }

    setDeletingAdviceId(a.id);
    try {
      await deleteAdviceTemplateAction(a.id);
      toast.success("Advice template deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete advice template");
    } finally {
      setDeletingAdviceId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-[#E4E4E7]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("medicines");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "medicines"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-white text-[#6B7280] hover:text-[#1C1C1E] border border-[#E4E4E7]"
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Medicines Catalog ({initialMedicines.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("advice");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "advice"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-white text-[#6B7280] hover:text-[#1C1C1E] border border-[#E4E4E7]"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pre-Advice Templates ({initialAdvice.length})</span>
          </button>
        </div>

        {activeTab === "medicines" ? (
          <button
            type="button"
            onClick={openAddMed}
            className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openAddAdvice}
            className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Advice Template</span>
          </button>
        )}
      </div>

      {/* TAB 1: MEDICINES */}
      {activeTab === "medicines" && (
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Search generic, brand, or drug class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
              />
            </div>
            <span className="text-xs text-[#6B7280]">
              Showing {filteredMedicines.length} of {initialMedicines.length} medicines
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3 px-4">Brand Name</th>
                  <th className="py-3 px-4">Generic Name</th>
                  <th className="py-3 px-4">Form</th>
                  <th className="py-3 px-4">Strength</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                      No medicines found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((m) => (
                    <tr key={m.id} className="hover:bg-white/70 transition">
                      <td className="py-3 px-4 font-bold text-[#1C1C1E]">
                        {m.brandName || "—"}
                      </td>
                      <td className="py-3 px-4 text-[#2A5CAA] font-medium">
                        {m.genericName}
                      </td>
                      <td className="py-3 px-4 capitalize font-mono text-[11px]">
                        {m.form}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                        {m.strength || "—"}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">
                        {m.drugClass || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditMed(m)}
                            className="p-1.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#1C1C1E] transition cursor-pointer"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMed(m)}
                            disabled={deletingMedId === m.id}
                            className="p-1.5 rounded-lg border border-[#FF453A]/20 bg-white hover:bg-[#FF453A]/10 text-[#FF453A] transition cursor-pointer"
                            title="Delete Medicine"
                          >
                            {deletingMedId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRE-ADVICE TEMPLATES */}
      {activeTab === "advice" && (
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Search advice text or group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
              />
            </div>

            {/* Filter by group */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              <button
                onClick={() => setSelectedAdviceGroup("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedAdviceGroup === "all"
                    ? "bg-[#2A5CAA] text-white shadow-xs"
                    : "bg-white text-[#6B7280] hover:bg-[#F4F4F5] border border-[#E4E4E7]"
                }`}
              >
                All Groups
              </button>
              {adviceGroups.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedAdviceGroup(g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedAdviceGroup === g
                      ? "bg-[#2A5CAA] text-white shadow-xs"
                      : "bg-white text-[#6B7280] hover:bg-[#F4F4F5] border border-[#E4E4E7]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3 px-4 w-48">Group Name</th>
                  <th className="py-3 px-4">Clinical Advice (Pre-Op / Post-Op)</th>
                  <th className="py-3 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {filteredAdvice.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#6B7280]">
                      No advice templates found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredAdvice.map((a) => (
                    <tr key={a.id} className="hover:bg-white/70 transition">
                      <td className="py-3 px-4 font-bold text-[#2A5CAA] align-top">
                        {a.groupName}
                      </td>
                      <td className="py-3 px-4 text-[#1C1C1E] leading-relaxed align-top">
                        {a.textBn}
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditAdvice(a)}
                            className="p-1.5 rounded-lg border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#1C1C1E] transition cursor-pointer"
                            title="Edit Advice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAdvice(a)}
                            disabled={deletingAdviceId === a.id}
                            className="p-1.5 rounded-lg border border-[#FF453A]/20 bg-white hover:bg-[#FF453A]/10 text-[#FF453A] transition cursor-pointer"
                            title="Delete Advice"
                          >
                            {deletingAdviceId === a.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MEDICINE MODAL (Add / Edit) */}
      {(showAddMedModal || editingMed) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  {editingMed ? "Edit Medicine" : "Add Medicine"}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Configure medicine formula for chamber prescription catalog.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddMedModal(false);
                  setEditingMed(null);
                }}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Generic Name: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin, Paracetamol"
                  value={medGeneric}
                  onChange={(e) => setMedGeneric(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Brand Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Moxacil, Napa Extra"
                  value={medBrand}
                  onChange={(e) => setMedBrand(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Dosage Form:
                  </label>
                  <select
                    value={medForm}
                    onChange={(e) => setMedForm(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white capitalize"
                  >
                    {MEDICINE_FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Strength:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 10mg"
                    value={medStrength}
                    onChange={(e) => setMedStrength(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Drug Class:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Antibiotic, NSAID, Antiseptic"
                  value={medClass}
                  onChange={(e) => setMedClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMedModal(false);
                    setEditingMed(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMed}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isSubmittingMed && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingMed ? "Save Changes" : "Add Medicine"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADVICE MODAL (Add / Edit) */}
      {(showAddAdviceModal || editingAdvice) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  {editingAdvice ? "Edit Advice Template" : "Add Advice Template"}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Pre-advice instruction for dental treatment prescriptions.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddAdviceModal(false);
                  setEditingAdvice(null);
                }}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Category / Group Name: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post Extraction Care, Scaling & Polishing, Root Canal"
                  value={adviceGroup}
                  onChange={(e) => setAdviceGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Pre-Advice Instruction: *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. গজ ১ ঘণ্টা শক্ত করে চেপে ধরে রাখুন। শক্ত বা গরম খাবার খাবেন না..."
                  value={adviceText}
                  onChange={(e) => setAdviceText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAdviceModal(false);
                    setEditingAdvice(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdvice}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isSubmittingAdvice && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAdvice ? "Save Changes" : "Add Template"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
