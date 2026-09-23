"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { updateWorkingHoursAction } from "@/app/(tenant)/app/settings/actions";

interface Shift {
  weekday: number;
  startTime: string;
  endTime: string;
}

interface Props {
  initialShifts: Shift[];
}

const WEEKDAYS = [
  { id: 6, name: "Saturday (শনিবার)" },
  { id: 0, name: "Sunday (রবিবার)" },
  { id: 1, name: "Monday (সোমবার)" },
  { id: 2, name: "Tuesday (মঙ্গলবার)" },
  { id: 3, name: "Wednesday (বুধবার)" },
  { id: 4, name: "Thursday (বৃহস্পতিবার)" },
  { id: 5, name: "Friday (শুক্রবার)" },
];

export default function WorkingHoursClient({ initialShifts }: Props) {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);
  const [isSaving, setIsSaving] = useState(false);

  function addShift(weekday: number) {
    setShifts((prev) => [
      ...prev,
      {
        weekday,
        startTime: "17:00",
        endTime: "21:00",
      },
    ]);
  }

  function removeShift(index: number) {
    setShifts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateShift(index: number, patch: Partial<Shift>) {
    setShifts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      await updateWorkingHoursAction(shifts);
      toast.success("Working shifts updated successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update working hours");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-6">
        <div>
          <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
            Chamber Weekly Working Hours &amp; Split Shifts
          </h3>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure clinic opening windows. You can define multiple split shifts per day (e.g. Morning 10:00 - 13:00, Evening 17:00 - 21:00).
          </p>
        </div>

        <div className="space-y-4 divide-y divide-[#E4E4E7]">
          {WEEKDAYS.map((day) => {
            const dayShifts = shifts
              .map((s, idx) => ({ ...s, originalIndex: idx }))
              .filter((s) => s.weekday === day.id);

            return (
              <div key={day.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1C1C1E]">
                      {day.name}
                    </span>
                    {dayShifts.length === 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFEBEA] text-[#FF453A] uppercase">
                        Closed / Holiday
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addShift(day.id)}
                    className="text-xs font-semibold text-[#2A5CAA] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shift Window</span>
                  </button>
                </div>

                {dayShifts.length > 0 && (
                  <div className="space-y-2">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.originalIndex}
                        className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#E4E4E7] max-w-lg"
                      >
                        <Clock className="w-4 h-4 text-[#6B7280] shrink-0" />
                        <div className="flex items-center gap-2 text-xs">
                          <input
                            type="time"
                            value={shift.startTime}
                            onChange={(e) =>
                              updateShift(shift.originalIndex, {
                                startTime: e.target.value,
                              })
                            }
                            className="px-2 py-1 border border-[#E4E4E7] rounded-lg outline-none font-semibold text-[#1C1C1E]"
                          />
                          <span className="text-[#6B7280]">to</span>
                          <input
                            type="time"
                            value={shift.endTime}
                            onChange={(e) =>
                              updateShift(shift.originalIndex, {
                                endTime: e.target.value,
                              })
                            }
                            className="px-2 py-1 border border-[#E4E4E7] rounded-lg outline-none font-semibold text-[#1C1C1E]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeShift(shift.originalIndex)}
                          className="p-1 rounded-lg text-[#6B7280] hover:text-[#FF453A] transition ml-auto"
                          title="Remove Shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
          <span>Save Working Hours</span>
        </button>
      </div>
    </div>
  );
}
