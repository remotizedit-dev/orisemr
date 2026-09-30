import Link from "next/link";
import { ShieldAlert, PhoneCall, ArrowLeft } from "lucide-react";

export function ExpiredLinkScreen({ clinicName, phone }: { clinicName?: string; phone?: string | null }) {
  return (
    <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-4 font-sans select-none">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E4E4E7] shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">
            Security Notice: Link Expired
          </h1>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            For patient data confidentiality and medical privacy, this shared link has expired.
            Medical records and prescription links automatically expire to protect your health records.
          </p>
        </div>

        {clinicName && (
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E4E4E7] text-xs text-[#1C1C1E] text-left space-y-1">
            <p className="font-bold text-[#2A5CAA]">{clinicName}</p>
            {phone && (
              <p className="text-gray-600 flex items-center gap-1.5 pt-0.5">
                <PhoneCall className="w-3.5 h-3.5 text-gray-500" />
                <span>Contact: {phone}</span>
              </p>
            )}
          </div>
        )}

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-2.5 px-4 rounded-xl bg-[#2A5CAA] hover:bg-[#204785] text-white text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Clinic Staff Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
