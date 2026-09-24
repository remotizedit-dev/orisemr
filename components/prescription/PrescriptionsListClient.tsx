"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDhakaDate } from "@/lib/utils";
import {
  FileText,
  Search,
  Printer,
  User,
  Calendar,
  Sparkles,
  Stethoscope,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

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
  createdAt: Date;
}

interface Props {
  initialPrescriptions: PrescriptionSummary[];
}

export function PrescriptionsListClient({ initialPrescriptions }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by RX Code, Patient Name, Phone, Diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E4E4E7] rounded-xl text-xs outline-none focus:border-[#2A5CAA] shadow-xs"
          />
        </div>

        <div className="text-xs font-semibold text-[#6B7280]">
          Showing {filtered.length} of {initialPrescriptions.length} prescriptions
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] text-[#8E8E93] flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1C1C1E]">
              No prescriptions found
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              {searchTerm
                ? "No prescriptions matched your search query. Try searching for a different name, phone, or RX number."
                : "No prescriptions have been written for this clinic yet. You can create one directly from the patient profile or the in-chair queue."}
            </p>
            <div className="pt-2">
              <Link
                href="/app/patients"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white font-semibold text-xs transition"
              >
                Go to Patients List
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]/60 text-[#6B7280] uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">RX Code &amp; Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Clinical Notes &amp; Teeth</th>
                  <th className="py-3 px-4">Next Visit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {filtered.map((rx) => (
                  <tr
                    key={rx.id}
                    className="hover:bg-[#F4F4F5]/40 transition group"
                  >
                    {/* RX Code & Date */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-mono font-bold text-[#2A5CAA]">
                        {rx.rxCode}
                      </div>
                      <div className="text-[11px] text-[#8E8E93] mt-0.5">
                        {formatDhakaDate(rx.createdAt, "dd MMM yyyy, hh:mm a")}
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4 align-top">
                      <Link
                        href={`/app/patients/${rx.patientId}`}
                        className="font-bold text-[#1C1C1E] hover:text-[#2A5CAA] hover:underline flex items-center gap-1.5"
                      >
                        <span>{rx.patientName}</span>
                      </Link>
                      <div className="text-[11px] text-[#6B7280] font-mono mt-0.5">
                        Card: {rx.patientCardNumber}{" "}
                        {rx.patientPhone && `• ${rx.patientPhone}`}
                      </div>
                    </td>

                    {/* Doctor */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-semibold text-[#1C1C1E]">
                        {rx.doctorTitle || "Dr."} {rx.doctorName}
                      </div>
                      <div className="text-[10px] text-[#8E8E93] uppercase font-bold">
                        Dentist
                      </div>
                    </td>

                    {/* Clinical Notes & Teeth */}
                    <td className="py-3.5 px-4 align-top max-w-xs">
                      {rx.diagnosis ? (
                        <div className="font-semibold text-[#1C1C1E] line-clamp-1">
                          {rx.diagnosis}
                        </div>
                      ) : rx.chiefComplaint ? (
                        <div className="text-[#6B7280] line-clamp-1 italic">
                          C/C: {rx.chiefComplaint}
                        </div>
                      ) : (
                        <span className="text-[#8E8E93] italic">—</span>
                      )}

                      {rx.toothCodes && rx.toothCodes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rx.toothCodes.map((tooth) => (
                            <span
                              key={tooth}
                              className="px-1.5 py-0.2 bg-[#EBF2FC] text-[#2A5CAA] font-mono font-bold text-[10px] rounded border border-[#2A5CAA]/20"
                            >
                              T{tooth}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Next Visit */}
                    <td className="py-3.5 px-4 align-top">
                      {rx.nextVisitDate ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full">
                          <Calendar className="w-3 h-3" />
                          {rx.nextVisitDate}
                        </span>
                      ) : (
                        <span className="text-[#8E8E93] text-[11px]">As needed</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/print/prescription/${rx.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EBF2FC] hover:bg-[#2A5CAA] text-[#2A5CAA] hover:text-white font-bold text-[11px] transition shadow-2xs"
                        >
                          <Printer className="w-3 h-3" />
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
    </div>
  );
}
