"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  addStaffAction,
  updateStaffAction,
  deleteStaffAction,
} from "@/app/(tenant)/app/settings/actions";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: Date;
}

interface Props {
  initialStaff: StaffMember[];
}

export default function StaffClient({ initialStaff }: Props) {
  const router = useRouter();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Add staff form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("Staff12345!");
  const [addPhone, setAddPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit staff form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "disabled">("active");

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditPhone(staff.phone || "");
    setEditStatus(staff.status as "active" | "disabled");
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      toast.error("Please enter a valid name and email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addStaffAction({
        name: addName.trim(),
        email: addEmail.trim(),
        password: addPassword || "Staff12345!",
        phone: addPhone.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Staff user "${addName}" created successfully!`);
        setShowAddModal(false);
        setAddName("");
        setAddEmail("");
        setAddPassword("Staff12345!");
        setAddPhone("");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await updateStaffAction({
        id: editingStaff.id,
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        status: editStatus,
      });

      if (res.success) {
        toast.success("Staff profile updated!");
        setEditingStaff(null);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (
      !confirm(
        `Are you sure you want to disable staff account "${staff.name}"? They will lose access to the chamber.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteStaffAction(staff.id);
      if (res.success) {
        toast.success("Staff member disabled successfully");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to disable staff member");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#1C1C1E]">
            Staff &amp; Receptionists ({initialStaff.length})
          </h2>
          <p className="text-xs text-[#6B7280]">
            Manage front-desk staff, receptionists, and assistants who manage patient queues and appointments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialStaff.length === 0 ? (
          <div className="col-span-full glass-panel p-12 text-center rounded-2xl border border-[#E4E4E7] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] text-[#8E8E93] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1C1C1E]">
              No staff members yet
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Add your receptionists and clinic front-desk operators so they can check in patients and book appointments.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-semibold text-xs transition cursor-pointer"
              >
                Add First Staff Member
              </button>
            </div>
          </div>
        ) : (
          initialStaff.map((staff) => (
            <div
              key={staff.id}
              className={`glass-panel p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                staff.status === "disabled"
                  ? "opacity-60 bg-gray-50 border-gray-200"
                  : "border-[#E4E4E7] hover:border-[#2A5CAA]/40"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF2FC] text-[#2A5CAA] font-bold text-sm flex items-center justify-center border border-[#2A5CAA]/20">
                      {staff.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1C1C1E] line-clamp-1">
                        {staff.name}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-full">
                        {staff.role}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      staff.status === "active"
                        ? "bg-[#30D158]/15 text-[#30D158]"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {staff.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#6B7280] pt-2 border-t border-[#E4E4E7]/60">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  {staff.phone && (
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                      <span>{staff.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[#E4E4E7]/60">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(staff)}
                  className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#2A5CAA] hover:bg-[#EBF2FC] transition cursor-pointer"
                  title="Edit Staff Member"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteStaff(staff)}
                  className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#FF453A] hover:bg-[#FFEBEA] transition cursor-pointer"
                  title="Disable Staff Member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E4E4E7] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2A5CAA]" />
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Add Staff Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Akter"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="reception@chamber.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Initial Password *
                </label>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl font-mono outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="01712-345678"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-xs font-semibold text-[#1C1C1E] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E4E4E7] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#2A5CAA]" />
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Edit Staff Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "active" | "disabled")}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                >
                  <option value="active">Active (Access allowed)</option>
                  <option value="disabled">Disabled (Access revoked)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl bg-[#F4F4F5] hover:bg-[#E4E4E7] text-xs font-semibold text-[#1C1C1E] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
