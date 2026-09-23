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
      <div className="glass-panel p-4 rounded-2xl border border-[#E4E4E7] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient by name, mobile number, or card #..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#E4E4E7] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition"
          />
        </div>

        <span className="text-xs text-[#6B7280] self-end sm:self-center">
          Showing <strong>{filteredPatients.length}</strong> of {initialPatients.length} patients
        </span>
      </div>

      {/* Patients Table */}
      <div className="glass-panel rounded-2xl border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-white/60 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Card No</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Allergies &amp; Medical Alerts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#6B7280]">
                    {search ? (
                      <div>
                        No patients matching "<span className="font-semibold text-[#1C1C1E]">{search}</span>"
                      </div>
                    ) : (
                      <div>
                        No patients registered yet. Click "Register New Patient" to create the first record.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-white/80 transition group">
                    <td className="py-3 px-4">
                      <Link
                        href={`/app/patients/${p.id}`}
                        className="font-mono text-xs font-bold text-[#2A5CAA] bg-[#E8EEF7] hover:bg-[#2A5CAA] hover:text-white transition px-2 py-0.5 rounded inline-block"
                        title="Open patient record"
                      >
                        {p.cardNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/app/patients/${p.id}`}
                        className="font-bold text-xs text-[#1C1C1E] group-hover:text-[#2A5CAA] group-hover:underline transition block"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#6B7280]">
                      {formatBdPhone(p.phone)}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6B7280]">
                      {p.approxAge ? `${p.approxAge} yrs` : "—"} • {p.gender}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {p.allergyFlags.map((flag) => (
                          <span
                            key={flag}
                            className="px-1.5 py-0.5 rounded bg-[#FFEBEA] text-[#FF453A] font-bold text-[10px]"
                          >
                            {flag}
                          </span>
                        ))}
                        {p.medicalConditions.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.5 rounded bg-[#FFF7EB] text-[#FF9F0A] font-bold text-[10px]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/app/patients/${p.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#F4F4F5] hover:bg-[#2A5CAA] hover:text-white text-xs font-semibold text-[#1C1C1E] inline-flex items-center gap-1 transition"
                      >
                        <span>Open File</span>
                        <ArrowRight className="w-3 h-3" />
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
