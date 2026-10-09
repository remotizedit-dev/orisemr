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
  AlertCircle,
  Stethoscope,
  Activity,
  ClipboardList,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  createMedicineAction,
  updateMedicineAction,
  deleteMedicineAction,
  createAdviceTemplateAction,
  updateAdviceTemplateAction,
  deleteAdviceTemplateAction,
  createQuickTextAction,
  updateQuickTextAction,
  deleteQuickTextAction,
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

export interface Medicine {
  id: string;
  brandName: string | null;
  genericName: string;
  strength: string | null;
  form: string;
  drugClass: string | null;
  isActive: boolean;
}

export interface AdviceTemplate {
  id: string;
  groupName: string;
  textBn: string;
  isActive: boolean;
}

export interface QuickTextItem {
  id: string;
  kind: "chief_complaint" | "examination" | "diagnosis" | "investigation";
  text: string;
  source: string;
  isActive: boolean;
  sortOrder: number;
}

export type CatalogTab =
  | "medicines"
  | "advice"
  | "chief_complaint"
  | "examination"
  | "diagnosis"
  | "investigation";

interface Props {
  initialMedicines: Medicine[];
  initialAdvice: AdviceTemplate[];
  initialQuickTexts?: QuickTextItem[];
}

export default function PrescriptionsCatalogClient({
  initialMedicines,
  initialAdvice,
  initialQuickTexts = [],
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CatalogTab>("medicines");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAdviceGroup, setSelectedAdviceGroup] = useState<string>("all");

  // Modals - Medicine
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [deletingMedId, setDeletingMedId] = useState<string | null>(null);

  // Modals - Advice
  const [showAddAdviceModal, setShowAddAdviceModal] = useState(false);
  const [editingAdvice, setEditingAdvice] = useState<AdviceTemplate | null>(null);
  const [deletingAdviceId, setDeletingAdviceId] = useState<string | null>(null);

  // Modals - Quick Texts (Chief complaints, examination, diagnosis, investigations)
  const [showAddQuickTextModal, setShowAddQuickTextModal] = useState(false);
  const [editingQuickText, setEditingQuickText] = useState<QuickTextItem | null>(null);
  const [deletingQuickTextId, setDeletingQuickTextId] = useState<string | null>(null);
  const [quickTextContent, setQuickTextContent] = useState("");
  const [isSubmittingQuickText, setIsSubmittingQuickText] = useState(false);

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
    const matchesGroup =
      selectedAdviceGroup === "all" || a.groupName === selectedAdviceGroup;
    if (!matchesGroup) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.textBn.toLowerCase().includes(q) || a.groupName.toLowerCase().includes(q)
    );
  });

  const currentKindQuickTexts = initialQuickTexts.filter((q) => {
    if (activeTab === "medicines" || activeTab === "advice") return false;
    if (q.kind !== activeTab) return false;
    if (!searchQuery) return true;
    return q.text.toLowerCase().includes(searchQuery.toLowerCase());
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
        toast.success("Updated medicine successfully");
        setEditingMed(null);
      } else {
        await createMedicineAction({
          genericName: medGeneric.trim(),
          brandName: medBrand.trim() || undefined,
          form: medForm as any,
          strength: medStrength.trim() || undefined,
          drugClass: medClass.trim() || undefined,
        });
        toast.success("Added new medicine successfully");
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
    if (!confirm(`Are you sure you want to delete ${m.brandName || m.genericName}?`)) {
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

  // Handlers - Quick Texts (Chief complaints, examination, diagnosis, investigations)
  function openAddQuickText() {
    setQuickTextContent("");
    setShowAddQuickTextModal(true);
  }

  function openEditQuickText(item: QuickTextItem) {
    setEditingQuickText(item);
    setQuickTextContent(item.text);
  }

  async function handleSaveQuickText(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTextContent.trim()) {
      toast.error("Template text is required");
      return;
    }
    if (activeTab === "medicines" || activeTab === "advice") return;

    setIsSubmittingQuickText(true);
    try {
      if (editingQuickText) {
        await updateQuickTextAction({
          id: editingQuickText.id,
          text: quickTextContent.trim(),
        });
        toast.success("Template updated successfully");
        setEditingQuickText(null);
      } else {
        await createQuickTextAction({
          kind: activeTab,
          text: quickTextContent.trim(),
        });
        toast.success("Template added successfully");
        setShowAddQuickTextModal(false);
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setIsSubmittingQuickText(false);
    }
  }

  async function handleToggleQuickTextActive(item: QuickTextItem) {
    try {
      await updateQuickTextAction({
        id: item.id,
        isActive: !item.isActive,
      });
      toast.success(item.isActive ? "Template deactivated" : "Template activated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  }

  async function handleDeleteQuickText(item: QuickTextItem) {
    if (!confirm(`Are you sure you want to delete "${item.text}"?`)) {
      return;
    }

    setDeletingQuickTextId(item.id);
    try {
      await deleteQuickTextAction(item.id);
      toast.success("Template deleted successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    } finally {
      setDeletingQuickTextId(null);
    }
  }

  const getTabLabel = (tab: CatalogTab) => {
    switch (tab) {
      case "medicines":
        return `Medicines (${initialMedicines.length})`;
      case "advice":
        return `Advice Templates (${initialAdvice.length})`;
      case "chief_complaint":
        return `Chief Complaints (${initialQuickTexts.filter((q) => q.kind === "chief_complaint").length})`;
      case "examination":
        return `On Examination (${initialQuickTexts.filter((q) => q.kind === "examination").length})`;
      case "diagnosis":
        return `Diagnosis (${initialQuickTexts.filter((q) => q.kind === "diagnosis").length})`;
      case "investigation":
        return `Investigations (${initialQuickTexts.filter((q) => q.kind === "investigation").length})`;
    }
  };

  const getQuickTextCategoryName = () => {
    switch (activeTab) {
      case "chief_complaint":
        return "Chief Complaint";
      case "examination":
        return "Examination Finding";
      case "diagnosis":
        return "Diagnosis";
      case "investigation":
        return "Investigation Advised";
      default:
        return "Clinical Template";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs Navigation Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7] bg-white shadow-2xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Horizontal Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab("medicines");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "medicines"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-[#F4F4F5] text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7]"
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>{getTabLabel("medicines")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("advice");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "advice"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-[#F4F4F5] text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{getTabLabel("advice")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("chief_complaint");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "chief_complaint"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-[#F4F4F5] text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7]"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{getTabLabel("chief_complaint")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("examination");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "examination"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-[#F4F4F5] text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7]"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{getTabLabel("examination")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("diagnosis");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "diagnosis"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-[#F4F4F5] text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{getTabLabel("diagnosis")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("investigation");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "investigation"
                ? "bg-[#2A5CAA] text-white shadow-xs"
                : "bg-[#F4F4F5] text-[#4B5563] hover:text-[#1C1C1E] hover:bg-[#E4E4E7]"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>{getTabLabel("investigation")}</span>
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === "medicines" && (
            <button
              type="button"
              onClick={openAddMed}
              className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
            </button>
          )}

          {activeTab === "advice" && (
            <button
              type="button"
              onClick={openAddAdvice}
              className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Advice Template</span>
            </button>
          )}

          {activeTab !== "medicines" && activeTab !== "advice" && (
            <button
              type="button"
              onClick={openAddQuickText}
              className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add {getQuickTextCategoryName()}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: MEDICINES */}
      {activeTab === "medicines" && (
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4 bg-white shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Search generic, brand, or drug class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F4F5] border border-transparent rounded-xl outline-none focus:bg-white focus:border-[#2A5CAA]"
              />
            </div>
            <div className="text-xs font-medium text-[#6B7280]">
              Showing {filteredMedicines.length} of {initialMedicines.length} medicines
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E4E4E7] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-[#F8FAFC] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3 px-4">Generic Name</th>
                  <th className="py-3 px-4">Brand / Trade Name</th>
                  <th className="py-3 px-4">Form</th>
                  <th className="py-3 px-4">Strength</th>
                  <th className="py-3 px-4">Drug Class</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                      No medicines found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3 px-4 font-bold text-[#1C1C1E]">
                        {m.genericName}
                      </td>
                      <td className="py-3 px-4 text-[#2A5CAA] font-semibold">
                        {m.brandName || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#EBF2FC] text-[#2A5CAA] font-semibold text-[10px] uppercase">
                          {m.form}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] font-mono">
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
                            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#2A5CAA] hover:bg-[#EBF2FC] transition"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMed(m)}
                            disabled={deletingMedId === m.id}
                            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition disabled:opacity-50"
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

      {/* TAB 2: ADVICE TEMPLATES */}
      {activeTab === "advice" && (
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4 bg-white shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A1A1AA]" />
                <input
                  type="text"
                  placeholder="Search advice text or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F4F5] border border-transparent rounded-xl outline-none focus:bg-white focus:border-[#2A5CAA]"
                />
              </div>

              <select
                value={selectedAdviceGroup}
                onChange={(e) => setSelectedAdviceGroup(e.target.value)}
                className="px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none bg-white font-medium text-[#1C1C1E]"
              >
                <option value="all">All Categories</option>
                {adviceGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-medium text-[#6B7280]">
              Showing {filteredAdvice.length} of {initialAdvice.length} templates
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAdvice.length === 0 ? (
              <div className="col-span-full py-12 text-center text-[#6B7280]">
                No advice templates found matching your criteria.
              </div>
            ) : (
              filteredAdvice.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-[#E4E4E7] bg-[#F8FAFC] flex flex-col justify-between gap-3 hover:border-[#2A5CAA]/40 transition group"
                >
                  <div className="space-y-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E4E4E7] text-[10px] font-bold text-[#2A5CAA] inline-block uppercase">
                      {a.groupName}
                    </span>
                    <p className="text-xs text-[#1C1C1E] leading-relaxed font-medium">
                      {a.textBn}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#E4E4E7]/60">
                    <button
                      type="button"
                      onClick={() => openEditAdvice(a)}
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#2A5CAA] hover:bg-white transition"
                      title="Edit Advice"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAdvice(a)}
                      disabled={deletingAdviceId === a.id}
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#FF453A] hover:bg-white transition disabled:opacity-50"
                      title="Delete Advice"
                    >
                      {deletingAdviceId === a.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TABS 3, 4, 5, 6: CLINICAL TEMPLATES (Chief Complaints, Findings, Diagnosis, Investigations) */}
      {activeTab !== "medicines" && activeTab !== "advice" && (
        <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4 bg-white shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder={`Search ${getQuickTextCategoryName().toLowerCase()} templates...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F4F5] border border-transparent rounded-xl outline-none focus:bg-white focus:border-[#2A5CAA]"
              />
            </div>

            <div className="text-xs font-medium text-[#6B7280]">
              Showing {currentKindQuickTexts.length} presets
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E4E4E7] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-[#F8FAFC] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3 px-4">Template Text / Clinical Finding</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {currentKindQuickTexts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#6B7280]">
                      No {getQuickTextCategoryName().toLowerCase()} templates found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  currentKindQuickTexts.map((qt) => (
                    <tr key={qt.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="py-3 px-4 font-semibold text-[#1C1C1E] text-xs">
                        {qt.text}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            qt.source === "master"
                              ? "bg-[#EBF2FC] text-[#2A5CAA]"
                              : "bg-[#F3E8FF] text-[#7E22CE]"
                          }`}
                        >
                          {qt.source === "master" ? "Default Standard" : "Custom Clinic"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleQuickTextActive(qt)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            qt.isActive
                              ? "bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]"
                              : "bg-[#F4F4F5] text-[#9CA3AF] hover:bg-[#E4E4E7]"
                          }`}
                        >
                          {qt.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-[#9CA3AF]" />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditQuickText(qt)}
                            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#2A5CAA] hover:bg-[#EBF2FC] transition cursor-pointer"
                            title="Edit Template"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuickText(qt)}
                            disabled={deletingQuickTextId === qt.id}
                            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition disabled:opacity-50 cursor-pointer"
                            title="Delete Template"
                          >
                            {deletingQuickTextId === qt.id ? (
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

      {/* MODAL: ADD / EDIT MEDICINE */}
      {(showAddMedModal || editingMed) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#E4E4E7]">
            <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  {editingMed ? "Edit Medicine" : "Add Medicine to Chamber Catalog"}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Configure medicine details for quick prescription searching.
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Generic Name: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin"
                    value={medGeneric}
                    onChange={(e) => setMedGeneric(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Brand Name (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Moxacil, Fimoxyl"
                    value={medBrand}
                    onChange={(e) => setMedBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Dosage Form: *
                  </label>
                  <select
                    value={medForm}
                    onChange={(e) => setMedForm(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none bg-white focus:border-[#2A5CAA]"
                  >
                    {MEDICINE_FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f.toUpperCase()}
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
                    placeholder="e.g. 500 mg, 0.2% w/v"
                    value={medStrength}
                    onChange={(e) => setMedStrength(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Drug Class (for Allergy Checking):
                </label>
                <input
                  type="text"
                  placeholder="e.g. penicillin, nsaid, macrolide"
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

      {/* MODAL: ADD / EDIT ADVICE */}
      {(showAddAdviceModal || editingAdvice) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#E4E4E7]">
            <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  {editingAdvice ? "Edit Advice Template" : "Add Pre-Advice Template"}
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

      {/* MODAL: ADD / EDIT CLINICAL QUICK TEXT TEMPLATE */}
      {(showAddQuickTextModal || editingQuickText) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#E4E4E7]">
            <div className="p-5 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  {editingQuickText
                    ? `Edit ${getQuickTextCategoryName()}`
                    : `Add ${getQuickTextCategoryName()}`}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  This preset will be instantly selectable when creating prescriptions.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddQuickTextModal(false);
                  setEditingQuickText(null);
                }}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickText} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  {getQuickTextCategoryName()} Text: *
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${
                    activeTab === "chief_complaint"
                      ? "Severe toothache at night, Food lodgement"
                      : activeTab === "examination"
                      ? "Deep caries on 46, Calculus and stains"
                      : activeTab === "diagnosis"
                      ? "Acute apical periodontitis, Dental caries"
                      : "IOPA X-ray, Bitewing X-ray, OPG"
                  }`}
                  value={quickTextContent}
                  onChange={(e) => setQuickTextContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddQuickTextModal(false);
                    setEditingQuickText(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickText}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isSubmittingQuickText && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingQuickText ? "Save Changes" : "Add Preset"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
