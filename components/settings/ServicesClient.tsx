"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Save,
  Check,
  X,
  Loader2,
  Stethoscope,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBdt } from "@/lib/utils";
import {
  updateServiceItemAction,
  createServiceItemAction,
  deleteServiceItemAction,
} from "@/app/(tenant)/app/settings/actions";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add Procedure Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addCustomCategory, setAddCustomCategory] = useState("");
  const [addPrice, setAddPrice] = useState<number>(1000);
  const [addDuration, setAddDuration] = useState<number>(30);
  const [addBookableOnline, setAddBookableOnline] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const categories = Array.from(
    new Set(initialServices.map((s) => s.category).filter(Boolean))
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

  async function handleDelete(service: ServiceItem) {
    if (
      !confirm(
        `Are you sure you want to delete procedure "${service.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(service.id);
      await deleteServiceItemAction(service.id);
      toast.success(`Deleted ${service.name}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete procedure");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error("Procedure name is required");
      return;
    }

    const finalCat =
      addCategory === "__new__"
        ? addCustomCategory.trim() || "General Dentistry"
        : addCategory || (categories[0] ?? "General Dentistry");

    setIsCreating(true);
    try {
      await createServiceItemAction({
        name: addName.trim(),
        categoryName: finalCat,
        priceBdt: Number(addPrice) || 0,
        durationMinutes: Number(addDuration) || 30,
        bookableOnline: addBookableOnline,
      });

      toast.success(`Added procedure "${addName}"`);
      setShowAddModal(false);
      setAddName("");
      setAddPrice(1000);
      setAddDuration(30);
      setAddCustomCategory("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create procedure");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-[#E4E4E7] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#E4E4E7]">
          <div>
            <h3 className="text-sm font-bold text-[#1C1C1E] uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#2A5CAA]" />
              Dental Procedures &amp; Fee Schedule
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              Customize prices (in whole Taka BDT), typical treatment durations, and procedure availability for your chamber.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAddCategory(categories[0] || "General Dentistry");
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Procedure</span>
          </button>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(service)}
                          disabled={savingId === service.id}
                          className="px-3 py-1.5 rounded-lg bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-semibold transition disabled:opacity-50 inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Save changes"
                        >
                          {savingId === service.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          <span>Save</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(service)}
                          disabled={deletingId === service.id}
                          className="p-1.5 rounded-lg border border-[#FF453A]/20 bg-white hover:bg-[#FF453A]/10 text-[#FF453A] transition disabled:opacity-50 cursor-pointer"
                          title="Delete procedure"
                        >
                          {deletingId === service.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
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

      {/* ADD PROCEDURE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Add Dental Procedure
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Add a procedure to your chamber billing &amp; booking catalog.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Procedure Name: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Composite Restoration (Class II)"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Category:
                </label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__new__">+ Create New Category...</option>
                </select>
              </div>

              {addCategory === "__new__" && (
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    New Category Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implantology, Pediatric Dentistry"
                    value={addCustomCategory}
                    onChange={(e) => setAddCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Fee (৳ BDT): *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    required
                    value={addPrice}
                    onChange={(e) => setAddPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] font-bold text-[#2A5CAA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Duration (Minutes): *
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    required
                    value={addDuration}
                    onChange={(e) => setAddDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bookableOnline"
                  checked={addBookableOnline}
                  onChange={(e) => setAddBookableOnline(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E4E4E7] text-[#2A5CAA] cursor-pointer"
                />
                <label
                  htmlFor="bookableOnline"
                  className="text-xs text-[#1C1C1E] cursor-pointer font-medium"
                >
                  Available for public online booking
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Procedure</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
