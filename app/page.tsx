import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  Calendar,
  CreditCard,
  FileText,
  ShieldCheck,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    if (session.user.role === "SUPER_ADMIN") {
      redirect("/platform");
    } else {
      redirect("/app");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F4F5] via-[#FFFFFF] to-[#E8EEF7]/40 flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-[#E4E4E7]/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2A5CAA] flex items-center justify-center text-white font-bold shadow-md shadow-[#2A5CAA]/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[#1C1C1E]">
              Oris <span className="text-[#2A5CAA]">EMR</span>
            </span>
            <span className="block text-[10px] uppercase font-semibold text-[#6B7280] tracking-wider">
              Dental Chamber Cloud
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-medium text-sm transition-all duration-150 shadow-sm hover:shadow"
          >
            Staff Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-1 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8EEF7] border border-[#2A5CAA]/20 text-[#2A5CAA] text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>Purpose-Built for Bangladesh Dental Chambers</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#1C1C1E] tracking-tight leading-[1.15] max-w-4xl">
          Lightning-Fast EMR with{" "}
          <span className="text-[#2A5CAA]">Bangla Prescriptions</span> &amp; Live
          Queue
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#6B7280] max-w-2xl leading-relaxed">
          From patient card barcode scanning to sub-60-second prescriptions, slot
          engine overbooking prevention, and instant whole-Taka billing.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-7 py-3.5 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-base shadow-lg shadow-[#2A5CAA]/25 hover:shadow-xl transition-all duration-200"
          >
            Access Chamber Portal
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-3.5 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F4F4F5] font-semibold text-base transition-all duration-150"
          >
            Documentation &amp; Specs
          </a>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="glass-panel p-6 rounded-2xl hover:border-[#2A5CAA]/30 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#1C1C1E]">
              Precision Slot Engine
            </h3>
            <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
              Calculates real open slots with split shifts, buffer spacing, and
              GIST database exclusion constraints preventing double bookings.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-[#2A5CAA]/30 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#E8F8EE] text-[#30D158] flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#1C1C1E]">
              60-Second Bangla Rx
            </h3>
            <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
              FDI tooth chart, one-click Bangla dosage presets (১+০+১), and
              active clinical drug-class allergy blocking with audit logging.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-[#2A5CAA]/30 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#FFF7EB] text-[#FF9F0A] flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#1C1C1E]">
              Whole-Taka Billing
            </h3>
            <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
              Draft invoices generated automatically upon moving to Billing, with
              bKash/Nagad/Cash split payment reconciliation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E4E4E7] py-6 px-6 text-center text-xs text-[#6B7280]">
        &copy; {new Date().getFullYear()} Oris EMR. Multi-tenant SaaS EMR for
        Dental Chambers in Bangladesh.
      </footer>
    </div>
  );
}
