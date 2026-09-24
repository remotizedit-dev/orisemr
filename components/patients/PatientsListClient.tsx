"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBdPhone } from "@/lib/utils";
import { AlertCircle, Search, UserPlus, Users, ArrowRight } from "lucide-react";

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
}

interface PatientsListClientProps {
  initialPatients: PatientRow[];
}

export default function PatientsListClient({ initialPatients }: PatientsListClientProps) {
  const [search, setSearch] = useState("");

  const filteredPatients = initialPatients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.cardNumber.toLowerCase().includes(q) ||
      p.allergyFlags.some((f) => f.toLowerCase().includes(q)) ||
      p.medicalConditions.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="glass-panel p-5 rounded-3xl border border-[#E4E4E7] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-5 h-5 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient by name, mobile number, or card #..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#E4E4E7] text-sm sm:text-base text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition shadow-2xs font-medium placeholder:text-[#6B7280]"
          />
        </div>

        <span className="text-sm text-[#4B5563] self-end sm:self-center font-medium">
          Showing <strong>{filteredPatients.length}</strong> of {initialPatients.length} patients
        </span>
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
                <th className="py-4 px-5">Allergies &amp; Medical Alerts</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-[#6B7280]">
                    {search ? (
                      <div>
                        No patients matching &quot;<span className="font-semibold text-[#1C1C1E]">{search}</span>&quot;
                      </div>
                    ) : (
                      <div>
                        No patients registered yet. Click &quot;Register New Patient&quot; to create the first record.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-white/80 transition group">
                    <td className="py-4 px-5">
                      <Link
                        href={`/app/patients/${p.id}`}
                        className="font-mono text-sm font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white transition px-2.5 py-1 rounded-lg inline-block"
                        title="Open patient record"
                      >
                        {p.cardNumber}
                      </Link>
                    </td>
                    <td className="py-4 px-5">
                      <Link
                        href={`/app/patients/${p.id}`}
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
                      <Link
                        href={`/app/patients/${p.id}`}
                        className="px-3.5 py-2 rounded-xl bg-[#F4F4F5] hover:bg-[#2A5CAA] hover:text-white text-sm font-bold text-[#1C1C1E] inline-flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <span>Open File</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
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
