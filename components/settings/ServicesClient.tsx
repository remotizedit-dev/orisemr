"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Save, Check, X, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { formatBdt } from "@/lib/utils";
import { updateServiceItemAction } from "@/app/(tenant)/app/settings/actions";

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  priceBdt: number;
  durationMinutes: number;
  isActive: boolean;
}

interface Props {
  initialServices: ServiceItem[];
}

export default function ServicesClient({ initialServices }: Props) {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>(initialServices);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const categories = Array.from(
    new Set(initialServices.map((s) => s.category))
  ).sort();

  const filteredServices = services.filter((s) => {
    if (selectedCategory !== "all" && s.category !== selectedCategory) {
      return false;
    }
    if (
      searchQuery &&
      !s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  function updateLocal(id: string, patch: Partial<ServiceItem>) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  async function handleSaveRow(service: ServiceItem) {
    try {
      setSavingId(service.id);
      await updateServiceItemAction(
        service.id,
        service.priceBdt,
        service.durationMinutes,
        service.isActive
      );
      toast.success(`Updated ${service.name}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update service");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider">
            Dental Procedures &amp; Fee Schedule
          </h3>
          <p className="text-xs text-[#6B7280] mt-1">
            Customize prices (in whole Taka BDT), typical treatment durations, and procedure availability for your chamber.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Search procedures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-[#2A5CAA] text-white shadow-xs"
                  : "bg-white text-[#6B7280] hover:bg-[#F4F4F5] border border-[#E4E4E7]"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-[#2A5CAA] text-white shadow-xs"
                    : "bg-white text-[#6B7280] hover:bg-[#F4F4F5] border border-[#E4E4E7]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Services Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-white/50 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Procedure Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Duration (Mins)</th>
                <th className="py-3 px-4">Price (৳ BDT)</th>
                <th className="py-3 px-4">Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                    No procedures found matching search filter.
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-white/70 transition"
                  >
                    <td className="py-3 px-4 font-bold text-[#1C1C1E]">
                      {service.name}
                    </td>

                    <td className="py-3 px-4 text-[#6B7280] font-medium">
                      {service.category}
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={service.durationMinutes}
                        onChange={(e) =>
                          updateLocal(service.id, {
                            durationMinutes: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 text-xs border border-[#E4E4E7] rounded-lg outline-none bg-white text-center font-semibold"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={service.priceBdt}
                        onChange={(e) =>
                          updateLocal(service.id, {
                            priceBdt: Number(e.target.value),
                          })
                        }
                        className="w-28 px-2 py-1 text-xs border border-[#E4E4E7] rounded-lg outline-none bg-white font-bold text-[#2A5CAA]"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={service.isActive}
                        onChange={(e) =>
                          updateLocal(service.id, {
                            isActive: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA] cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSaveRow(service)}
                        disabled={savingId === service.id}
                        className="px-3 py-1.5 rounded-lg bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-semibold transition disabled:opacity-50 inline-flex items-center gap-1 shadow-2xs"
                      >
                        {savingId === service.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
