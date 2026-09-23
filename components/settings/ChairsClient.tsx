"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Armchair, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createChairAction,
  toggleChairAction,
} from "@/app/(tenant)/app/settings/actions";

interface Chair {
  id: string;
  name: string;
  isActive: boolean;
}

interface Props {
  initialChairs: Chair[];
}

export default function ChairsClient({ initialChairs }: Props) {
  const router = useRouter();
  const [chairs, setChairs] = useState<Chair[]>(initialChairs);

  useEffect(() => {
    setChairs(initialChairs);
  }, [initialChairs]);
  const [newChairName, setNewChairName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
              Dental Chairs &amp; Operatories
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              Add dental units for your chamber. Chairs can be assigned during appointment booking and queue seating.
            </p>
          </div>

          {/* Add chair form */}
          <form
            onSubmit={handleAddChair}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <input
              type="text"
              placeholder="e.g. Chair 2 (Pediatric)"
              value={newChairName}
              onChange={(e) => setNewChairName(e.target.value)}
              className="px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white w-full sm:w-56"
            />
            <button
              type="submit"
              disabled={isAdding || !newChairName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2A5CAA] hover:bg-[#1E4282] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0"
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add Chair</span>
            </button>
          </form>
        </div>

        {/* Chairs list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {chairs.map((chair) => (
            <div
              key={chair.id}
              className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                chair.isActive
                  ? "bg-white border-[#E4E4E7]"
                  : "bg-[#F4F4F5]/60 border-[#E4E4E7] opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#EBF2FC] text-[#2A5CAA]">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#1C1C1E] block">
                    {chair.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      chair.isActive ? "text-[#30D158]" : "text-[#6B7280]"
                    }`}
                  >
                    {chair.isActive ? "Active Unit" : "Disabled"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(chair)}
                disabled={loadingId === chair.id}
                className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
