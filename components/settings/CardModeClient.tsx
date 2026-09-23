"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Printer, Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updatePatientCardModeAction } from "@/app/(tenant)/app/settings/actions";

interface Props {
  initialMode: "PRE_PRINTED" | "AUTO_GENERATE";
  minLen: number;
  maxLen: number;
}

export default function CardModeClient({
  initialMode,
  minLen,
  maxLen,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"PRE_PRINTED" | "AUTO_GENERATE">(
    initialMode
  );
  const [minL, setMinL] = useState(minLen);
  const [maxL, setMaxL] = useState(maxLen);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setMinL(minLen);
    setMaxL(maxLen);
  }, [initialMode, minLen, maxLen]);

  const modes = [
    {
      id: "PRE_PRINTED",
      title: "Pre-Printed Cards (Batch Printed)",
      desc: "Reception has a stack of pre-printed PVC cards with sequential barcodes from a local print shop. When registering a new patient, staff grabs the next card from the drawer and scans it with a USB barcode scanner into the form.",
      icon: CreditCard,
      badge: "Most Common in BD",
    },
    {
      id: "AUTO_GENERATE",
      title: "Auto-Generated (On-Demand & Digital)",
      desc: "System auto-generates sequential card numbers (e.g. 1000000001). Reception prints the card immediately on a desktop card/thermal printer after registering the patient, or uses it paperless.",
      icon: Printer,
      badge: "Auto Counter",
    },
  ];

  async function handleSave() {
    try {
      setIsSaving(true);
      await updatePatientCardModeAction(mode, minL, maxL);
      toast.success("Patient card mode updated successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update card mode");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-6">
        <div>
          <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
            Patient Barcode Card Operating Mode
          </h3>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure how patient physical cards are issued and verified at the front desk.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modes.map((m) => {
            const isSelected = mode === m.id;
            const Icon = m.icon;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`p-5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#EBF2FC] border-[#2A5CAA] shadow-sm"
                    : "bg-white border-[#E4E4E7] hover:border-[#2A5CAA]/40"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isSelected
                          ? "bg-[#2A5CAA] text-white"
                          : "bg-[#F4F4F5] text-[#6B7280]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E4E4E7] text-[#6B7280]">
                      {m.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-[#1C1C1E]">
                      {m.title}
                    </h4>
                    <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2A5CAA]">
                    {isSelected ? "Active Mode" : "Select"}
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#2A5CAA] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Validation rules */}
        <div className="pt-4 border-t border-[#E4E4E7] space-y-4">
          <h4 className="text-xs font-bold text-[#1C1C1E] uppercase tracking-wider">
            Barcode Length Validation Rules
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6B7280]">
                Minimum Barcode Length
              </label>
              <input
                type="number"
                min={6}
                max={20}
                value={minL}
                onChange={(e) => setMinL(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6B7280]">
                Maximum Barcode Length
              </label>
              <input
                type="number"
                min={6}
                max={30}
                value={maxL}
                onChange={(e) => setMaxL(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Card Mode</span>
        </button>
      </div>
    </div>
  );
}
