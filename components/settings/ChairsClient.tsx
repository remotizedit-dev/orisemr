"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Armchair, Check, X, Loader2, Power, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  createChairAction,
  toggleChairAction,
  toggleEnableChairManagementAction,
} from "@/app/(tenant)/app/settings/actions";

interface Chair {
  id: string;
  name: string;
  isActive: boolean;
}

interface Props {
  initialChairs: Chair[];
  initialEnableChairManagement?: boolean;
}

export default function ChairsClient({
  initialChairs,
  initialEnableChairManagement = true,
}: Props) {
  const router = useRouter();
  const [chairs, setChairs] = useState<Chair[]>(initialChairs);
  const [enableChairManagement, setEnableChairManagement] = useState<boolean>(initialEnableChairManagement);
  const [isTogglingMaster, setIsTogglingMaster] = useState(false);

  useEffect(() => {
    setChairs(initialChairs);
  }, [initialChairs]);

  useEffect(() => {
    setEnableChairManagement(initialEnableChairManagement);
  }, [initialEnableChairManagement]);

  const [newChairName, setNewChairName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggleMaster() {
    const nextState = !enableChairManagement;
    try {
      setIsTogglingMaster(true);
      await toggleEnableChairManagementAction(nextState);
      setEnableChairManagement(nextState);
      toast.success(
        nextState
          ? "Dental Chair Tracking enabled! Multi-chair operatory management is active."
          : "Dental Chair Tracking disabled! Clinic is now in Simple Chamber Mode (Direct Doctor Treatment)."
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update chair tracking setting");
    } finally {
      setIsTogglingMaster(false);
    }
  }

  async function handleAddChair(e: React.FormEvent) {
    e.preventDefault();
    if (!newChairName.trim()) return;

    try {
      setIsAdding(true);
      await createChairAction(newChairName.trim());
      toast.success(`Dental chair "${newChairName.trim()}" added!`);
      setNewChairName("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add chair");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggle(chair: Chair) {
    try {
      setLoadingId(chair.id);
      await toggleChairAction(chair.id, !chair.isActive);
      toast.success(
        `Chair ${chair.name} marked as ${!chair.isActive ? "Active" : "Inactive"}`
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update chair status");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle Banner: Enable / Disable Chair Management */}
      <div
        className={`glass-panel p-6 rounded-3xl border transition shadow-xs ${
          enableChairManagement
            ? "bg-white border-[#E4E4E7]"
            : "bg-gradient-to-r from-[#2A5CAA]/5 via-[#2A5CAA]/10 to-transparent border-[#2A5CAA]/30"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                enableChairManagement
                  ? "bg-[#EBF2FC] text-[#2A5CAA]"
                  : "bg-[#2A5CAA] text-white"
              }`}
            >
              <Armchair className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-[#1C1C1E]">
                  Dental Chair Tracking
                </h2>
                <span
                  className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    enableChairManagement
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-[#2A5CAA]/15 text-[#2A5CAA]"
                  }`}
                >
                  {enableChairManagement ? "Multi-Chair Mode Active" : "Disabled (Simple Chamber Mode)"}
                </span>
              </div>
              <p className="text-xs text-[#4B5563] max-w-2xl leading-relaxed">
                {enableChairManagement ? (
                  <>
                    Tracking individual dental chairs is currently <strong>Enabled</strong>. Useful if your clinic has multiple dental units (Chair 1, Chair 2, Surgery Chair) and you want to track which chair a patient is sitting in.
                  </>
                ) : (
                  <>
                    Chair tracking is currently <strong>Disabled</strong>. Your clinic operates in <strong>Simple Chamber Mode</strong>: patients in the live queue move straight to <strong>&ldquo;In Treatment / With Doctor&rdquo;</strong> without any chair assignment, chair blockers, or extra clicks.
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleMaster}
            disabled={isTogglingMaster}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer shadow-xs disabled:opacity-50 ${
              enableChairManagement
                ? "bg-[#F4F4F5] hover:bg-rose-50 text-[#4B5563] hover:text-[#DC2626] border border-[#E4E4E7]"
                : "bg-[#2A5CAA] hover:bg-[#1E4282] text-white"
            }`}
          >
            {isTogglingMaster ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            <span>
              {enableChairManagement
                ? "Disable Chair Logic (Switch to Simple Mode)"
                : "Enable Multi-Chair Operatories"}
            </span>
          </button>
        </div>
      </div>

      {/* Chairs List & Operatories Management */}
      <div
        className={`glass-panel p-6 rounded-3xl border border-[#E4E4E7] space-y-4 shadow-2xs transition ${
          !enableChairManagement ? "opacity-60 bg-[#FAFAFA]" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
              <span>Chamber Dental Units</span>
              {!enableChairManagement && (
                <span className="text-[10px] text-[#6B7280] font-normal normal-case">
                  (Hidden from queue while Chair Tracking is disabled)
                </span>
              )}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Configure physical dental units and operatory names for your chamber.
            </p>
          </div>

          {/* Add chair form */}
          {enableChairManagement && (
            <form
              onSubmit={handleAddChair}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <input
                type="text"
                placeholder="e.g. Chair 2 (Pediatric)"
                value={newChairName}
                onChange={(e) => setNewChairName(e.target.value)}
                className="px-3.5 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-hidden focus:border-[#2A5CAA] bg-white w-full sm:w-56 font-medium"
              />
              <button
                type="submit"
                disabled={isAdding || !newChairName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2A5CAA] hover:bg-[#1E4282] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Add Chair</span>
              </button>
            </form>
          )}
        </div>

        {/* Chairs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {chairs.map((chair) => (
            <div
              key={chair.id}
              className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                chair.isActive
                  ? "bg-white border-[#E4E4E7] shadow-2xs"
                  : "bg-[#F4F4F5]/60 border-[#E4E4E7] opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#EBF2FC] text-[#2A5CAA]">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#1C1C1E] block">
                    {chair.name}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase ${
                      chair.isActive ? "text-[#30D158]" : "text-[#6B7280]"
                    }`}
                  >
                    {chair.isActive ? "Active Unit" : "Disabled"}
                  </span>
                </div>
              </div>

              {enableChairManagement && (
                <button
                  type="button"
                  onClick={() => handleToggle(chair)}
                  disabled={loadingId === chair.id}
                  className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    chair.isActive
                      ? "text-[#FF453A] border-[#FF453A]/20 hover:bg-[#FFEBEA]"
                      : "text-[#30D158] border-[#30D158]/20 hover:bg-[#E8F8EE]"
                  }`}
                  title={chair.isActive ? "Deactivate" : "Activate"}
                >
                  {loadingId === chair.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : chair.isActive ? (
                    <X className="w-3.5 h-3.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
