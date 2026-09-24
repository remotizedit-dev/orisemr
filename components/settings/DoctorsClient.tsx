"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Plus,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Stethoscope,
  Sparkles,
  Phone,
  Mail,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDoctorAction,
  updateDoctorAction,
  updateDoctorSchedulesAction,
  deleteDoctorAction,
} from "@/app/(tenant)/app/settings/actions";

const WEEKDAYS = [
  { index: 0, label: "Sunday", short: "Sun" },
  { index: 1, label: "Monday", short: "Mon" },
  { index: 2, label: "Tuesday", short: "Tue" },
  { index: 3, label: "Wednesday", short: "Wed" },
  { index: 4, label: "Thursday", short: "Thu" },
  { index: 5, label: "Friday", short: "Fri" },
  { index: 6, label: "Saturday", short: "Sat" },
];

const PRESET_COLORS = [
  "#2A5CAA", // Deep Blue
  "#007AFF", // System Blue
  "#34C759", // Emerald Green
  "#AF52DE", // Purple
  "#FF9500", // Warm Amber
  "#FF2D55", // Coral Rose
  "#5856D6", // Indigo
  "#00C7BE", // Teal
];

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isDoctor: boolean;
  status: string;
  doctorTitle: string | null;
  doctorDegrees: string | null;
  doctorSpecialty: string | null;
  doctorRegNo: string | null;
  calendarColor: string | null;
  createdAt: Date;
}

interface DoctorSchedule {
  id: string;
  doctorId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface ClinicHour {
  weekday: number;
  startTime: string;
  endTime: string;
}

interface Props {
  initialDoctors: Doctor[];
  initialSchedules: DoctorSchedule[];
  clinicHours: ClinicHour[];
}

export default function DoctorsClient({
  initialDoctors,
  initialSchedules,
  clinicHours,
}: Props) {
  const router = useRouter();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [schedulingDoctor, setSchedulingDoctor] = useState<Doctor | null>(null);

  // Add doctor form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("Doctor12345!");
  const [addTitle, setAddTitle] = useState("Dr.");
  const [addSpecialty, setAddSpecialty] = useState("General Dental Surgeon");
  const [addDegrees, setAddDegrees] = useState("BDS");
  const [addRegNo, setAddRegNo] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addColor, setAddColor] = useState(PRESET_COLORS[0]);
  const [isAdding, setIsAdding] = useState(false);

  // Edit doctor form state
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editDegrees, setEditDegrees] = useState("");
  const [editRegNo, setEditRegNo] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Scheduling state: map of weekday -> { enabled: boolean, startTime: string, endTime: string }
  const [shifts, setShifts] = useState<{
    [key: number]: { enabled: boolean; startTime: string; endTime: string };
  }>({});
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  function openAddModal() {
    setAddName("");
    setAddEmail("");
    setAddPassword("Doctor12345!");
    setAddTitle("Dr.");
    setAddSpecialty("General Dental Surgeon");
    setAddDegrees("BDS");
    setAddRegNo("");
    setAddPhone("");
    setAddColor(PRESET_COLORS[initialDoctors.length % PRESET_COLORS.length]);
    setShowAddModal(true);
  }

  function openEditModal(doc: Doctor) {
    setEditingDoctor(doc);
    setEditName(doc.name);
    setEditTitle(doc.doctorTitle || "Dr.");
    setEditSpecialty(doc.doctorSpecialty || "");
    setEditDegrees(doc.doctorDegrees || "");
    setEditRegNo(doc.doctorRegNo || "");
    setEditPhone(doc.phone || "");
    setEditColor(doc.calendarColor || "#2A5CAA");
  }

  function openScheduleModal(doc: Doctor) {
    setSchedulingDoctor(doc);
    const doctorShifts = initialSchedules.filter((s) => s.doctorId === doc.id);

    const shiftMap: {
      [key: number]: { enabled: boolean; startTime: string; endTime: string };
    } = {};

    WEEKDAYS.forEach(({ index }) => {
      const match = doctorShifts.find((s) => s.weekday === index);
      const clinicDefault = clinicHours.find((h) => h.weekday === index);

      if (match) {
        shiftMap[index] = {
          enabled: true,
          startTime: match.startTime.slice(0, 5),
          endTime: match.endTime.slice(0, 5),
        };
      } else if (clinicDefault) {
        // Default to clinic working hours if not set
        shiftMap[index] = {
          enabled: false,
          startTime: clinicDefault.startTime.slice(0, 5),
          endTime: clinicDefault.endTime.slice(0, 5),
        };
      } else {
        shiftMap[index] = {
          enabled: false,
          startTime: "10:00",
          endTime: "18:00",
        };
      }
    });

    setShifts(shiftMap);
  }

  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      toast.error("Doctor name and email are required");
      return;
    }

    setIsAdding(true);
    try {
      await addDoctorAction({
        name: addName.trim(),
        email: addEmail.trim(),
        password: addPassword || undefined,
        doctorTitle: addTitle.trim(),
        doctorSpecialty: addSpecialty.trim(),
        doctorDegrees: addDegrees.trim(),
        doctorRegNo: addRegNo.trim(),
        phone: addPhone.trim(),
        calendarColor: addColor,
      });

      toast.success(`Doctor ${addName} added successfully!`);
      setShowAddModal(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add doctor");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUpdateDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDoctor) return;

    setIsUpdating(true);
    try {
      await updateDoctorAction({
        id: editingDoctor.id,
        name: editName.trim(),
        doctorTitle: editTitle.trim(),
        doctorSpecialty: editSpecialty.trim(),
        doctorDegrees: editDegrees.trim(),
        doctorRegNo: editRegNo.trim(),
        phone: editPhone.trim(),
        calendarColor: editColor,
      });

      toast.success(`Updated ${editName}`);
      setEditingDoctor(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update doctor details");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSaveSchedule() {
    if (!schedulingDoctor) return;

    setIsSavingSchedule(true);
    try {
      const schedulePayload = Object.entries(shifts)
        .filter(([_, config]) => config.enabled)
        .map(([weekdayStr, config]) => ({
          weekday: parseInt(weekdayStr, 10),
          startTime: config.startTime,
          endTime: config.endTime,
        }));

      await updateDoctorSchedulesAction(schedulingDoctor.id, schedulePayload);

      toast.success(`Updated slot schedule for ${schedulingDoctor.name}`);
      setSchedulingDoctor(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save doctor schedule");
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleDeleteDoctor(doc: Doctor) {
    if (
      !confirm(
        `Are you sure you want to remove ${doc.doctorTitle || "Dr."} ${doc.name}? They will be marked inactive.`
      )
    ) {
      return;
    }

    try {
      await deleteDoctorAction(doc.id);
      toast.success(`Doctor ${doc.name} removed`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove doctor");
    }
  }

  function applyClinicHoursToAll() {
    const updated = { ...shifts };
    WEEKDAYS.forEach(({ index }) => {
      const clinicDefault = clinicHours.find((h) => h.weekday === index);
      if (clinicDefault) {
        updated[index] = {
          enabled: true,
          startTime: clinicDefault.startTime.slice(0, 5),
          endTime: clinicDefault.endTime.slice(0, 5),
        };
      }
    });
    setShifts(updated);
    toast.info("Applied clinic default operating hours to active days");
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-[#E4E4E7]">
        <div>
          <h2 className="text-base font-bold text-[#1C1C1E] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#2A5CAA]" />
            Chamber Doctors &amp; Individual Slot Schedules
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Manage your clinic's dental surgeons, assigned appointment colors, BMDC credentials, and custom shift working hours.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Doctors List */}
      <div className="grid grid-cols-1 gap-4">
        {initialDoctors.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-[#E4E4E7] text-center space-y-3">
            <Stethoscope className="w-10 h-10 text-[#6B7280] mx-auto" />
            <h3 className="text-sm font-bold text-[#1C1C1E]">No Doctors Registered</h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Add your dental surgeons and consultants to begin booking patient appointments and managing their clinical rosters.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-[#2A5CAA] text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Doctor
            </button>
          </div>
        ) : (
          initialDoctors.map((doc) => {
            const docSchedules = initialSchedules.filter((s) => s.doctorId === doc.id);
            const activeDays = docSchedules.map((s) => s.weekday);

            return (
              <div
                key={doc.id}
                className="glass-panel p-5 rounded-2xl border border-[#E4E4E7] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:shadow-xs transition"
              >
                {/* Doctor Bio */}
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: doc.calendarColor || "#2A5CAA" }}
                  >
                    {doc.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-[#1C1C1E] tracking-tight">
                        {doc.doctorTitle || "Dr."} {doc.name}
                      </span>
                      {doc.doctorDegrees && (
                        <span className="text-[11px] font-semibold text-[#2A5CAA] bg-[#E8EEF7] px-2 py-0.5 rounded-full">
                          {doc.doctorDegrees}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          doc.status === "active"
                            ? "bg-[#30D158]/15 text-[#248A3D]"
                            : "bg-[#8E8E93]/15 text-[#636366]"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B7280] font-medium">
                      {doc.doctorSpecialty || "Dental Surgeon"}
                      {doc.doctorRegNo && ` • BMDC: ${doc.doctorRegNo}`}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-[#6B7280] flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#A1A1AA]" />
                        {doc.email}
                      </span>
                      {doc.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-[#A1A1AA]" />
                          {doc.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule Status & Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E4E4E7]">
                  {/* Active Days Badge Strip */}
                  <div className="flex items-center gap-1">
                    {WEEKDAYS.map(({ index, short }) => {
                      const isWorking = activeDays.includes(index);
                      return (
                        <span
                          key={index}
                          className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition ${
                            isWorking
                              ? "bg-[#2A5CAA] text-white shadow-2xs"
                              : "bg-[#F4F4F5] text-[#A1A1AA] border border-[#E4E4E7]/60"
                          }`}
                          title={
                            isWorking
                              ? `${WEEKDAYS[index].label}: Active Shift`
                              : `${WEEKDAYS[index].label}: Off Duty`
                          }
                        >
                          {short[0]}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openScheduleModal(doc)}
                      className="px-3 py-1.5 rounded-xl border border-[#2A5CAA]/30 bg-[#E8EEF7] hover:bg-[#d8e6fa] text-[#2A5CAA] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Configure Shifts</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(doc)}
                      className="p-1.5 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-[#6B7280] hover:text-[#1C1C1E] transition cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDoctor(doc)}
                      className="p-1.5 rounded-xl border border-[#FF453A]/20 bg-white hover:bg-[#FF453A]/10 text-[#FF453A] transition cursor-pointer"
                      title="Deactivate Doctor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD DOCTOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Add Dental Surgeon
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Create doctor credentials and assign calendar identity.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Title:
                  </label>
                  <select
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white font-medium"
                  >
                    <option value="Dr.">Dr.</option>
                    <option value="Prof. Dr.">Prof. Dr.</option>
                    <option value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</option>
                    <option value="Asst. Prof. Dr.">Asst. Prof. Dr.</option>
                    <option value="Consultant Dr.">Consultant Dr.</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Full Name: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sabrina Khan"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Login Email: *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@chamber.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Initial Password:
                  </label>
                  <input
                    type="text"
                    placeholder="Min 8 characters"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Specialty / Department:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Orthodontics, Oral Surgery"
                    value={addSpecialty}
                    onChange={(e) => setAddSpecialty(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Degrees / Qualifications:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BDS, FCPS, MS"
                    value={addDegrees}
                    onChange={(e) => setAddDegrees(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    BMDC Reg. No:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. D-12345"
                    value={addRegNo}
                    onChange={(e) => setAddRegNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Contact Phone:
                  </label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-2">
                  Calendar Appointment Color:
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAddColor(color)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                        addColor === color
                          ? "ring-2 ring-offset-2 ring-[#2A5CAA] scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {addColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
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
                  disabled={isAdding}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Doctor Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCTOR PROFILE MODAL */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E]">
                  Edit Doctor Profile
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Update clinical details and calendar badge color.
                </p>
              </div>
              <button
                onClick={() => setEditingDoctor(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Title:
                  </label>
                  <select
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] bg-white font-medium"
                  >
                    <option value="Dr.">Dr.</option>
                    <option value="Prof. Dr.">Prof. Dr.</option>
                    <option value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</option>
                    <option value="Asst. Prof. Dr.">Asst. Prof. Dr.</option>
                    <option value="Consultant Dr.">Consultant Dr.</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Full Name: *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Specialty / Department:
                  </label>
                  <input
                    type="text"
                    value={editSpecialty}
                    onChange={(e) => setEditSpecialty(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Degrees / Qualifications:
                  </label>
                  <input
                    type="text"
                    value={editDegrees}
                    onChange={(e) => setEditDegrees(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    BMDC Reg. No:
                  </label>
                  <input
                    type="text"
                    value={editRegNo}
                    onChange={(e) => setEditRegNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
                    Phone:
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1C1E] mb-2">
                  Calendar Appointment Color:
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditColor(color)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                        editColor === color
                          ? "ring-2 ring-offset-2 ring-[#2A5CAA] scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {editColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR SCHEDULE & SLOT TIMES MODAL */}
      {schedulingDoctor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1C1E] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2A5CAA]" />
                  Slot Schedule: {schedulingDoctor.doctorTitle || "Dr."} {schedulingDoctor.name}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Configure shift time windows for online booking and queue scheduling.
                </p>
              </div>
              <button
                onClick={() => setSchedulingDoctor(null)}
                className="p-1 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B7280]">
                  Weekly Working Windows
                </span>
                <button
                  type="button"
                  onClick={applyClinicHoursToAll}
                  className="text-xs font-bold text-[#2A5CAA] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Apply Chamber Hours Preset
                </button>
              </div>

              {/* Day-by-day table */}
              <div className="space-y-2 border border-[#E4E4E7] rounded-2xl p-3 bg-[#FBFBFC]">
                {WEEKDAYS.map(({ index, label }) => {
                  const shift = shifts[index] || {
                    enabled: false,
                    startTime: "10:00",
                    endTime: "18:00",
                  };

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        shift.enabled
                          ? "bg-white border-[#2A5CAA]/30 shadow-2xs"
                          : "bg-white/50 border-[#E4E4E7]/60 opacity-60"
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer w-32">
                        <input
                          type="checkbox"
                          checked={shift.enabled}
                          onChange={(e) =>
                            setShifts((prev) => ({
                              ...prev,
                              [index]: { ...shift, enabled: e.target.checked },
                            }))
                          }
                          className="w-4 h-4 rounded text-[#2A5CAA] focus:ring-[#2A5CAA]"
                        />
                        <span className={`text-xs font-bold ${shift.enabled ? "text-[#1C1C1E]" : "text-[#8E8E93]"}`}>
                          {label}
                        </span>
                      </label>

                      {shift.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={shift.startTime}
                            onChange={(e) =>
                              setShifts((prev) => ({
                                ...prev,
                                [index]: { ...shift, startTime: e.target.value },
                              }))
                            }
                            className="px-2.5 py-1 text-xs border border-[#E4E4E7] rounded-lg bg-white font-mono font-semibold text-[#1C1C1E] outline-none focus:border-[#2A5CAA]"
                          />
                          <span className="text-xs text-[#8E8E93]">to</span>
                          <input
                            type="time"
                            value={shift.endTime}
                            onChange={(e) =>
                              setShifts((prev) => ({
                                ...prev,
                                [index]: { ...shift, endTime: e.target.value },
                              }))
                            }
                            className="px-2.5 py-1 text-xs border border-[#E4E4E7] rounded-lg bg-white font-mono font-semibold text-[#1C1C1E] outline-none focus:border-[#2A5CAA]"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#8E8E93] italic pr-2">
                          Off Duty
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setSchedulingDoctor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1C1C1E]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                  className="px-5 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {isSavingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Shift Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
