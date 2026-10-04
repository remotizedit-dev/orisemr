"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDhakaDate } from "@/lib/utils";
import {
  FileText,
  Search,
  Printer,
  Eye,
  User,
  Calendar,
  Sparkles,
  Stethoscope,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { PrescriptionViewModal } from "./PrescriptionViewModal";
import PaginationControls from "@/components/ui/PaginationControls";

interface PrescriptionSummary {
  id: string;
  rxCode: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  patientCardNumber: string;
  patientGender: string;
  patientApproxAge: number | null;
  doctorId: string;
  doctorName: string;
  doctorTitle: string | null;
  diagnosis: string | null;
  chiefComplaint: string | null;
  toothCodes: string[];
  nextVisitDate: string | null;
  notes?: string | null;
  createdAt: Date;
}

interface Props {
  initialPrescriptions: PrescriptionSummary[];
  canPrescribe?: boolean;
}

export function PrescriptionsListClient({
  initialPrescriptions,
  canPrescribe = false,
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingRxId, setViewingRxId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filtered = initialPrescriptions.filter((rx) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      rx.rxCode.toLowerCase().includes(q) ||
      rx.patientName.toLowerCase().includes(q) ||
      (rx.patientPhone && rx.patientPhone.toLowerCase().includes(q)) ||
      rx.patientCardNumber.toLowerCase().includes(q) ||
      (rx.diagnosis && rx.diagnosis.toLowerCase().includes(q)) ||
      (rx.chiefComplaint && rx.chiefComplaint.toLowerCase().includes(q)) ||
      rx.doctorName.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function handleSearchChange(val: string) {
    setSearchTerm(val);
    setCurrentPage(1);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by RX Code, Patient Name, Phone, Diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E4E4E7] rounded-2xl text-sm font-medium outline-none focus:border-[#2A5CAA] shadow-2xs"
          />
        </div>

        <div className="text-sm font-semibold text-[#4B5563]">
          Showing {filtered.length} of {initialPrescriptions.length} prescriptions
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-3xl border border-[#E4E4E7] overflow-hidden shadow-2xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F4F4F5] text-[#8E8E93] flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#1C1C1E]">
              No prescriptions found
            </h3>
            <p className="text-sm text-[#6B7280] max-w-sm mx-auto">
              {searchTerm
                ? "No prescriptions matched your search query. Try searching for a different name, phone, or RX number."
                : "No prescriptions have been written for this clinic yet. You can create one directly from the patient profile or the in-chair queue."}
            </p>
            <div className="pt-2">
              <Link
                href="/app/patients"
                prefetch={false}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-bold text-sm transition"
              >
                Go to Patients List
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]/70 text-[#4B5563] uppercase tracking-wider text-xs font-bold">
                  <th className="py-4 px-5">RX Code &amp; Date</th>
                  <th className="py-4 px-5">Patient</th>
                  <th className="py-4 px-5">Doctor</th>
                  <th className="py-4 px-5">Clinical Notes &amp; Teeth</th>
                  <th className="py-4 px-5">Next Visit</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {paginated.map((rx) => (
                  <tr
                    key={rx.id}
                    className="hover:bg-[#F4F4F5]/50 transition group"
                  >
                    {/* RX Code & Date */}
                    <td className="py-4 px-5 align-top">
                      <div className="font-mono font-bold text-[#2A5CAA] text-sm">
                        {rx.rxCode}
                      </div>
                      <div className="text-xs text-[#6B7280] mt-1 font-medium">
                        {formatDhakaDate(rx.createdAt, "dd MMM yyyy, hh:mm a")}
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-4 px-5 align-top">
                      <Link
                        href={`/app/patients/${rx.patientId}`}
                        prefetch={false}
                        className="font-extrabold text-base text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline flex items-center gap-1.5"
                      >
                        <span>{rx.patientName}</span>
                      </Link>
                      <div className="text-xs text-[#4B5563] font-mono font-semibold mt-1">
                        Card: {rx.patientCardNumber}{" "}
                        {rx.patientPhone && `• ${rx.patientPhone}`}
                      </div>
                    </td>

                    {/* Doctor */}
                    <td className="py-4 px-5 align-top">
                      <div className="font-bold text-sm text-[#1C1C1E]">
                        {rx.doctorTitle || "Dr."} {rx.doctorName}
                      </div>
                      <div className="text-xs text-[#6B7280] uppercase font-bold mt-0.5">
                        Dental Surgeon
                      </div>
                    </td>

                    {/* Clinical Notes & Teeth */}
                    <td className="py-4 px-5 align-top max-w-xs">
                      {rx.diagnosis ? (
                        <div className="font-bold text-sm text-[#1C1C1E] line-clamp-1">
                          {rx.diagnosis}
                        </div>
                      ) : rx.chiefComplaint ? (
                        <div className="text-sm text-[#4B5563] line-clamp-1 italic">
                          C/C: {rx.chiefComplaint}
                        </div>
                      ) : (
                        <span className="text-[#8E8E93] italic text-sm">—</span>
                      )}

                      {rx.toothCodes && rx.toothCodes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {rx.toothCodes.map((tooth) => (
                            <span
                              key={tooth}
                              className="px-2 py-0.5 bg-[#EBF2FC] text-[#2A5CAA] font-mono font-black text-xs rounded-md border border-[#2A5CAA]/20"
                            >
                              T{tooth}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Next Visit */}
                    <td className="py-4 px-5 align-top">
                      {rx.nextVisitDate ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-1 rounded-full">
                          <Calendar className="w-3.5 h-3.5" />
                          {rx.nextVisitDate}
                        </span>
                      ) : (
                        <span className="text-[#6B7280] text-xs">As needed</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingRxId(rx.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#1C1C1E] font-bold text-xs transition shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#2A5CAA]" />
                          <span>View</span>
                        </button>
                        <Link
                          href={`/print/prescription/${rx.id}`}
                          prefetch={false}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EBF2FC] hover:bg-[#2A5CAA] text-[#2A5CAA] hover:text-white font-bold text-xs transition shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <PaginationControls
          currentPage={safePage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[25, 100]}
        />
      )}

      {/* Prescription View & Quick Edit Modal */}
      <PrescriptionViewModal
        prescriptionId={viewingRxId}
        isOpen={!!viewingRxId}
        onClose={() => setViewingRxId(null)}
        onUpdated={() => router.refresh()}
        canEdit={canPrescribe}
      />
    </div>
  );
}
