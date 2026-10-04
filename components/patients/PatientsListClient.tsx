"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatBdPhone } from "@/lib/utils";
import {
  AlertCircle,
  Search,
  UserPlus,
  Users,
  ArrowRight,
  Pencil,
  Trash2,
  Stethoscope,
  ArrowRightLeft,
} from "lucide-react";
import { EditPatientModal } from "./EditPatientModal";
import { DeletePatientModal } from "./DeletePatientModal";
import { SwitchDoctorModal } from "./SwitchDoctorModal";
import PaginationControls from "@/components/ui/PaginationControls";

export interface PatientRow {
  id: string;
  name: string;
  phone: string;
  cardNumber: string;
  gender: string;
  approxAge: number | null;
  allergyFlags: string[];
  medicalConditions: string[];
  createdAt: string;
  assignedDoctorId?: string | null;
  assignedDoctorName?: string | null;
  isMyPatient?: boolean;
}

interface DoctorOption {
  id: string;
  name: string;
}

interface PatientsListClientProps {
  initialPatients: PatientRow[];
  isPureDoctor?: boolean;
  currentDoctorName?: string;
  doctors?: DoctorOption[];
}

export default function PatientsListClient({
  initialPatients,
  isPureDoctor = false,
  currentDoctorName,
  doctors = [],
}: PatientsListClientProps) {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>(initialPatients);
  const [viewScope, setViewScope] = useState<"my" | "all">("my");
  const [search, setSearch] = useState("");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [switchingPatient, setSwitchingPatient] = useState<PatientRow | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<{
    id: string;
    name: string;
    cardNumber: string;
  } | null>(null);

  const filteredPatients = patients.filter((p) => {
    // 0. Doctor view scope filter (My Chamber vs All Clinic)
    if (isPureDoctor && viewScope === "my" && !p.isMyPatient) {
      return false;
    }

    // 1. Doctor filter (for admin/staff view)
    if (!isPureDoctor && selectedDoctorFilter !== "all") {
      if (selectedDoctorFilter === "unassigned") {
        if (p.assignedDoctorId) return false;
      } else if (p.assignedDoctorId !== selectedDoctorFilter) {
        return false;
      }
    }

    // 2. Text search
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.cardNumber.toLowerCase().includes(q) ||
      (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(q)) ||
      p.allergyFlags.some((f) => f.toLowerCase().includes(q)) ||
      p.medicalConditions.some((c) => c.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedPatients = filteredPatients.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function handleSearchChange(val: string) {
    setSearch(val);
    setCurrentPage(1);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Doctor View Tab Toggle */}
      {isPureDoctor && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-white border border-[#E4E4E7] shadow-2xs">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F4F4F5]">
            <button
              type="button"
              onClick={() => {
                setViewScope("my");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                viewScope === "my"
                  ? "bg-white text-[#2A5CAA] shadow-xs"
                  : "text-[#64748B] hover:text-[#1C1C1E]"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>My Chamber Patients</span>
              <span className="px-2 py-0.5 rounded-full bg-[#E8EEF7] text-[#2A5CAA] text-[10px] font-bold">
                {patients.filter((p) => p.isMyPatient).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewScope("all");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                viewScope === "all"
                  ? "bg-white text-[#2A5CAA] shadow-xs"
                  : "text-[#64748B] hover:text-[#1C1C1E]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Clinic Patients</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[#475569] text-[10px] font-bold">
                {patients.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-[#64748B] px-3 font-medium">
            {viewScope === "my" ? (
              <span>Displaying patients assigned to your chamber (Dr. {currentDoctorName})</span>
            ) : (
              <span>Viewing all clinic patient records for coverage &amp; history lookups</span>
            )}
          </div>
        </div>
      )}

      {/* Top Search & Filter Bar */}
      <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-5 h-5 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search patient by name, mobile, card #, or doctor..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#E4E4E7] text-sm sm:text-base text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition shadow-2xs font-medium placeholder:text-[#6B7280]"
          />
        </div>

        {/* Doctor Filter for Clinic Admin / Receptionist Staff */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {!isPureDoctor && doctors.length > 0 && (
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#2A5CAA] shrink-0" />
              <select
                value={selectedDoctorFilter}
                onChange={(e) => {
                  setSelectedDoctorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2.5 rounded-2xl bg-white border border-[#E4E4E7] text-xs font-bold text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] shadow-2xs cursor-pointer"
                title="Filter patients by assigned dentist"
              >
                <option value="all">All Dentists ({patients.length})</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name} ({patients.filter((p) => p.assignedDoctorId === d.id).length})
                  </option>
                ))}
                <option value="unassigned">
                  Unassigned ({patients.filter((p) => !p.assignedDoctorId).length})
                </option>
              </select>
            </div>
          )}

          <span className="text-sm text-[#4B5563] font-medium whitespace-nowrap">
            Showing <strong>{filteredPatients.length}</strong> of {patients.length} patients
          </span>
        </div>
      </div>

      {/* Patients Table */}
      <div className="glass-panel rounded-3xl border border-[#E4E4E7] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]/70 text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                <th className="py-4 px-5">Card No</th>
                <th className="py-4 px-5">Patient Name</th>
                <th className="py-4 px-5">Phone</th>
                <th className="py-4 px-5">Age / Gender</th>
                <th className="py-4 px-5">Assigned Doctor</th>
                <th className="py-4 px-5">Allergies &amp; Alerts</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#6B7280]">
                    {search ? (
                      <div>
                        No patients matching &quot;<span className="font-semibold text-[#1C1C1E]">{search}</span>&quot;
                      </div>
                    ) : selectedDoctorFilter !== "all" ? (
                      <div>No patients currently assigned to this dentist.</div>
                    ) : (
                      <div>
                        No patients registered yet. Click &quot;Register New Patient&quot; to create the first record.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-white/80 transition group">
                    <td className="py-4 px-5">
                      <Link
                        href={`/app/patients/${p.id}`}
                        prefetch={false}
                        className="font-mono text-sm font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white transition px-2.5 py-1 rounded-lg inline-block"
                        title="Open patient record"
                      >
                        {p.cardNumber}
                      </Link>
                    </td>
                    <td className="py-4 px-5">
                      <Link
                        href={`/app/patients/${p.id}`}
                        prefetch={false}
                        className="font-extrabold text-base text-[#1C1C1E] group-hover:text-[#2A5CAA] group-hover:underline transition block"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-4 px-5 font-mono text-sm font-semibold text-[#4B5563]">
                      {formatBdPhone(p.phone)}
                    </td>
                    <td className="py-4 px-5 text-sm font-medium text-[#4B5563]">
                      {p.approxAge ? `${p.approxAge} yrs` : "—"} • {p.gender}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border shadow-2xs ${
                            p.assignedDoctorName
                              ? "bg-blue-50 text-[#2A5CAA] border-blue-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                        >
                          <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {p.assignedDoctorName ? `Dr. ${p.assignedDoctorName}` : "Unassigned"}
                          </span>
                        </span>
                        {doctors.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSwitchingPatient(p)}
                            className="p-1.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#2A5CAA] text-[#6B7280] hover:text-[#2A5CAA] hover:bg-[#E8EEF7] transition cursor-pointer shadow-2xs"
                            title={`Switch or reassign doctor for ${p.name}`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap gap-1.5">
                        {p.allergyFlags.map((flag) => (
                          <span
                            key={flag}
                            className="px-2 py-0.5 rounded-md bg-[#FFEBEA] text-[#FF453A] font-bold text-xs border border-[#FF453A]/20"
                          >
                            {flag}
                          </span>
                        ))}
                        {p.medicalConditions.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded-md bg-[#FFF7EB] text-[#FF9F0A] font-bold text-xs border border-[#FF9F0A]/20"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/app/patients/${p.id}`}
                          prefetch={false}
                          className="px-3 py-1.5 rounded-xl bg-[#F4F4F5] hover:bg-[#2A5CAA] hover:text-white text-xs font-bold text-[#1C1C1E] inline-flex items-center gap-1 transition shadow-2xs"
                          title="Open patient medical record"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setEditingPatientId(p.id)}
                          className="p-1.5 rounded-xl bg-white border border-[#E4E4E7] text-[#2A5CAA] hover:bg-[#E8EEF7] transition cursor-pointer"
                          title="Edit patient details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeletingPatient({
                              id: p.id,
                              name: p.name,
                              cardNumber: p.cardNumber,
                            })
                          }
                          className="p-1.5 rounded-xl bg-white border border-[#E4E4E7] text-red-500 hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                          title="Delete/archive patient"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Pagination Controls */}
      {filteredPatients.length > 0 && (
        <PaginationControls
          currentPage={safePage}
          totalItems={filteredPatients.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[25, 100]}
        />
      )}

      {/* Edit Patient Modal */}
      {editingPatientId && (
        <EditPatientModal
          isOpen={Boolean(editingPatientId)}
          onClose={() => setEditingPatientId(null)}
          patientId={editingPatientId}
          onSuccess={(updated) => {
            setPatients((prev) =>
              prev.map((item) =>
                item.id === updated.id
                  ? {
                      ...item,
                      name: updated.name,
                      phone: updated.phone,
                      cardNumber: updated.cardNumber,
                      gender: updated.gender,
                      approxAge: updated.approxAge,
                      allergyFlags: updated.allergyFlags || [],
                      medicalConditions: updated.medicalConditions || [],
                    }
                  : item
              )
            );
            router.refresh();
          }}
        />
      )}

      {/* Delete Patient Modal */}
      {deletingPatient && (
        <DeletePatientModal
          isOpen={Boolean(deletingPatient)}
          onClose={() => setDeletingPatient(null)}
          patientId={deletingPatient.id}
          patientName={deletingPatient.name}
          cardNumber={deletingPatient.cardNumber}
          onDeleted={() => {
            setPatients((prev) =>
              prev.filter((item) => item.id !== deletingPatient.id)
            );
            router.refresh();
          }}
        />
      )}

      {/* Switch Doctor Modal */}
      {switchingPatient && (
        <SwitchDoctorModal
          isOpen={Boolean(switchingPatient)}
          onClose={() => setSwitchingPatient(null)}
          patientId={switchingPatient.id}
          patientName={switchingPatient.name}
          currentDoctorId={switchingPatient.assignedDoctorId}
          currentDoctorName={switchingPatient.assignedDoctorName}
          doctors={doctors}
          onSuccess={(newDoctorId, newDoctorName) => {
            setPatients((prev) =>
              prev.map((it) =>
                it.id === switchingPatient.id
                  ? {
                      ...it,
                      assignedDoctorId: newDoctorId,
                      assignedDoctorName: newDoctorName,
                    }
                  : it
              )
            );
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
