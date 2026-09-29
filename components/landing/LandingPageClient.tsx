"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  ShieldCheck,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Download,
  ExternalLink,
  Eye,
  Activity,
  Sparkles,
  Layers,
  Tv,
  QrCode,
  Printer,
  Video,
  Play,
  Check,
  ChevronRight,
  Lock,
} from "lucide-react";

/**
 * Robust Logo component that attempts to load a custom logo (/logo.svg or /logo.png)
 * and falls back gracefully to the signature Oris EMR dental stethoscope emblem.
 */
function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg text-sm",
    md: "w-10 h-10 rounded-xl text-base",
    lg: "w-14 h-14 rounded-2xl text-xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <div className="flex items-center gap-3">
      {!imgError ? (
        <div className={`relative overflow-hidden bg-white flex items-center justify-center ${sizeClasses[size]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="ORIS EMR"
            className="w-full h-full object-contain"
            onError={(e) => {
              // Try PNG if SVG fails, else trigger fallback
              const target = e.currentTarget;
              if (target.src.endsWith(".svg")) {
                target.src = "/logo.png";
              } else {
                setImgError(true);
              }
            }}
          />
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} bg-gradient-to-br from-[#2A5CAA] to-[#1C3E75] flex items-center justify-center text-white font-bold shadow-md shadow-[#2A5CAA]/25`}
        >
          <Stethoscope className={iconSizes[size]} />
        </div>
      )}
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold tracking-tight text-[#1C1C1E]">
            Oris <span className="text-[#2A5CAA]">EMR</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E8EEF7] text-[#2A5CAA] border border-[#2A5CAA]/20">
            PRO
          </span>
        </div>
        <span className="block text-[11px] font-medium text-[#6B7280] tracking-tight">
          Dental Chamber Operating System
        </span>
      </div>
    </div>
  );
}

export default function LandingPageClient() {
  const [activeTab, setActiveTab] = useState<"rx" | "slots" | "queue" | "billing">("rx");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1C1C1E] selection:bg-[#2A5CAA] selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* Top Floating Announcement Bar */}
      <div className="bg-[#1C1C1E] text-white py-2 px-4 text-center text-xs font-medium border-b border-white/10 flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
        <span>Content Creator Kit &amp; Full Workflow PDF Guide v2.0 is now live</span>
        <a
          href="/ORIS_EMR_Features_and_Workflow_Guide.pdf"
          download="ORIS_EMR_Features_and_Workflow_Guide.pdf"
          className="ml-2 underline text-[#60A5FA] hover:text-[#93C5FD] font-semibold inline-flex items-center gap-1"
        >
          Download PDF Guide <Download className="w-3 h-3" />
        </a>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-50 glass-floating border-b border-[#E4E4E7]/80 px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="transition hover:opacity-90">
            <BrandLogo size="md" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#4B5563]">
            <a href="#features" className="hover:text-[#2A5CAA] transition">
              Key Features
            </a>
            <a href="#preview" className="hover:text-[#2A5CAA] transition">
              Chamber Demo
            </a>
            <a href="#workflow" className="hover:text-[#2A5CAA] transition">
              5-Phase Workflow
            </a>
            <a href="#creator-kit" className="hover:text-[#2A5CAA] transition flex items-center gap-1.5 text-[#2A5CAA]">
              <Video className="w-4 h-4 text-[#2A5CAA]" />
              Creator Script &amp; PDF
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="/ORIS_EMR_Features_and_Workflow_Guide.pdf"
              download="ORIS_EMR_Features_and_Workflow_Guide.pdf"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#E4E4E7] text-xs font-bold text-[#1C1C1E] hover:bg-[#F4F4F5] transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#2A5CAA]" />
              PDF Guide
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-xs sm:text-sm transition-all duration-150 shadow-md shadow-[#2A5CAA]/25 hover:shadow-lg hover:shadow-[#2A5CAA]/35 cursor-pointer"
            >
              <span>Access Chamber</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9]">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#2A5CAA]/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8EEF7] border border-[#2A5CAA]/20 text-[#2A5CAA] text-xs font-bold mb-8 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2A5CAA]" />
            <span>Multi-Tenant Clinical Dental Chamber Operating System</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#1C1C1E] tracking-tight leading-[1.12]"
          >
            Sub-60s Bangla Rx, Anti-Collision Slots &amp;{" "}
            <span className="bg-gradient-to-r from-[#2A5CAA] via-[#3B82F6] to-[#0D9488] bg-clip-text text-transparent">
              Whole-BDT Billing.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-[#4B5563] max-w-3xl mx-auto leading-relaxed font-normal"
          >
            Engineered exclusively for Bangladesh dental chambers. Eliminate waiting room chaos with
            barcode patient card check-ins, automated chair buffer scheduling, interactive 2-digit FDI tooth
            charting, and multi-channel bKash / Cash settlements.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-base shadow-xl shadow-[#2A5CAA]/30 hover:shadow-2xl hover:scale-[1.01] transition-all duration-200 flex items-center gap-2.5"
            >
              <span>Access Chamber Portal</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="/ORIS_EMR_Features_and_Workflow_Guide.pdf"
              download="ORIS_EMR_Features_and_Workflow_Guide.pdf"
              className="px-7 py-4 rounded-xl bg-white border border-[#E4E4E7] text-[#1C1C1E] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] font-bold text-base shadow-sm hover:shadow transition-all duration-150 flex items-center gap-2"
            >
              <Download className="w-5 h-5 text-[#2A5CAA]" />
              <span>Download PDF Guide (1.3 MB)</span>
            </a>

            <a
              href="/oris-features-guide.html"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] hover:text-[#0F172A] hover:bg-[#E2E8F0] font-semibold text-sm transition-all duration-150 flex items-center gap-1.5"
            >
              <span>Interactive Web Guide</span>
              <ExternalLink className="w-4 h-4 text-[#64748B]" />
            </a>
          </motion.div>

          {/* Trust Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-14 pt-8 border-t border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-left"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#E8EEF7] text-[#2A5CAA] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1C1C1E]">&lt; 60s Prescription</h4>
                <p className="text-xs text-[#6B7280]">FDI chart &amp; Bangla dosages</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#E8F8EE] text-[#30D158] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1C1C1E]">0 Overbooking</h4>
                <p className="text-xs text-[#6B7280]">GIST exclusion database locks</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#FFF7EB] text-[#FF9F0A] shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1C1C1E]">Whole-BDT Ledger</h4>
                <p className="text-xs text-[#6B7280]">Zero fractional paisa errors</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#F3E8FF] text-[#9333EA] shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1C1C1E]">CR80 Card Scan</h4>
                <p className="text-xs text-[#6B7280]">1D Barcode instant recognition</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* INTERACTIVE CHAMBER SHOWCASE / DEMO PREVIEW */}
      <section id="preview" className="py-16 md:py-24 bg-white border-y border-[#E4E4E7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs uppercase tracking-widest font-extrabold text-[#2A5CAA]">
              Live Software Experience
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-[#1C1C1E] tracking-tight">
              A Complete Chamber in Four Powerful Modules
            </p>
            <p className="mt-3 text-base text-[#6B7280]">
              Click through the modules to see how ORIS EMR operates during real patient consultations.
            </p>

            {/* Interactive Tab Switcher */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 p-1.5 bg-[#F4F4F5] rounded-2xl max-w-xl mx-auto border border-[#E4E4E7]">
              <button
                type="button"
                onClick={() => setActiveTab("rx")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "rx"
                    ? "bg-white text-[#2A5CAA] shadow-sm border border-[#E4E4E7]"
                    : "text-[#6B7280] hover:text-[#1C1C1E]"
                }`}
              >
                1. Clinical Rx &amp; FDI
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("slots")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "slots"
                    ? "bg-white text-[#2A5CAA] shadow-sm border border-[#E4E4E7]"
                    : "text-[#6B7280] hover:text-[#1C1C1E]"
                }`}
              >
                2. Anti-Collision Slots
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "queue"
                    ? "bg-white text-[#2A5CAA] shadow-sm border border-[#E4E4E7]"
                    : "text-[#6B7280] hover:text-[#1C1C1E]"
                }`}
              >
                3. Cards &amp; TV Queue
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("billing")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "billing"
                    ? "bg-white text-[#2A5CAA] shadow-sm border border-[#E4E4E7]"
                    : "text-[#6B7280] hover:text-[#1C1C1E]"
                }`}
              >
                4. Whole-BDT Billing
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="rounded-3xl border border-[#CBD5E1] bg-[#1E293B] shadow-2xl p-3 sm:p-5 overflow-hidden">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between pb-4 px-2 border-b border-white/10 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span className="ml-3 font-mono text-[11px] text-white/80">
                  oris-emr.cloud/app/prescriptions/new
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3 font-mono text-[11px]">
                <span className="text-[#30D158] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" /> Neon Postgres Active
                </span>
                <span>Tenant: Dhanmondi Dental Care</span>
              </div>
            </div>

            {/* Dynamic Interactive Body */}
            <div className="pt-5 pb-2 text-white">
              <AnimatePresence mode="wait">
                {activeTab === "rx" && (
                  <motion.div
                    key="rx"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    {/* Left Column: FDI Tooth Chart */}
                    <div className="lg:col-span-7 bg-[#0F172A] rounded-2xl p-5 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-[#60A5FA]" />
                          <h4 className="text-sm font-bold text-white">
                            Interactive 2-Digit FDI Tooth Chart
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                          Adult (32 Teeth)
                        </span>
                      </div>

                      {/* Mockup Quadrant Grid */}
                      <div className="grid grid-cols-8 gap-1.5 text-center text-xs font-mono mb-3">
                        {["18", "17", "16", "15", "14", "13", "12", "11"].map((tooth) => (
                          <div
                            key={tooth}
                            className={`p-2 rounded border transition ${
                              tooth === "16"
                                ? "bg-red-500/30 border-red-500 text-red-200 font-bold"
                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            {tooth}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-8 gap-1.5 text-center text-xs font-mono mb-4">
                        {["21", "22", "23", "24", "25", "26", "27", "28"].map((tooth) => (
                          <div
                            key={tooth}
                            className={`p-2 rounded border transition ${
                              tooth === "26"
                                ? "bg-amber-500/30 border-amber-500 text-amber-200 font-bold"
                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            {tooth}
                          </div>
                        ))}
                      </div>

                      {/* Clinical Condition Legend */}
                      <div className="flex flex-wrap gap-2 text-[11px] pt-3 border-t border-white/10">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                          Tooth 16: Deep Caries (Root Canal Recommended)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Tooth 26: Composite Restoration
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Bangla Prescriptions & Safety */}
                    <div className="lg:col-span-5 bg-[#0F172A] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-[#30D158]" />
                            Sub-60s Prescription Items
                          </h4>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                            Bangla Format
                          </span>
                        </div>

                        {/* Item Row 1 */}
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-2.5">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-white">
                              Tab. Moxaclav 625mg
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                              ১ + ০ + ১ (খাবারের পর)
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50 block mt-1">
                            ৫ দিন • ভরা পেটে খাবেন
                          </span>
                        </div>

                        {/* Item Row 2 */}
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-white">
                              Tab. Naproxen 500mg
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                              ১ + ০ + ১ (খাবারের পর)
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50 block mt-1">
                            ৩ দিন • ব্যথা থাকলে খাবেন
                          </span>
                        </div>

                        {/* Private Doctor Note Box */}
                        <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-500/40 text-purple-200 text-xs">
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            <Lock className="w-3.5 h-3.5 text-purple-400" />
                            <span>Private Clinical Note (Doctor Only)</span>
                          </div>
                          <p className="text-[11px] text-purple-300/80">
                            Pulp exposure visible in mesial wall. If pain persists after 48h, initiate
                            endodontic access opening immediately. (Hidden on patient print).
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                        <span>Penicillin Allergy Guard: Active</span>
                        <span className="text-emerald-400 font-bold">Audit Logged</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "slots" && (
                  <motion.div
                    key="slots"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 bg-[#0F172A] rounded-2xl border border-white/10"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-[#60A5FA]" />
                          Anti-Collision Scheduling &amp; Split Operational Shifts
                        </h4>
                        <p className="text-xs text-white/60 mt-1">
                          Calculates real open slots based on clinic shift intervals, past system time,
                          service duration (e.g., 30m Biopsy), and chair physical capacity.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg border border-blue-500/30">
                          Shift 1: 10:00 AM - 02:00 PM
                        </span>
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-500/30">
                          Shift 2: 05:00 PM - 09:00 PM
                        </span>
                      </div>
                    </div>

                    {/* Slots Demo Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center opacity-40">
                        <span className="text-xs font-mono block line-through">10:00 AM</span>
                        <span className="text-[10px] text-white/50">Past Time Filtered</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center opacity-40">
                        <span className="text-xs font-mono block line-through">10:30 AM</span>
                        <span className="text-[10px] text-white/50">Past Time Filtered</span>
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-center">
                        <span className="text-xs font-mono text-red-300 font-bold block">11:00 AM</span>
                        <span className="text-[10px] text-red-200">Booked (Dr. Karim)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center opacity-40">
                        <span className="text-xs font-mono block">11:20 AM</span>
                        <span className="text-[10px] text-white/50">Overlaps 30m slot</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-center hover:bg-emerald-500/30 cursor-pointer">
                        <span className="text-xs font-mono text-emerald-300 font-bold block">11:40 AM</span>
                        <span className="text-[10px] text-emerald-200">Open (Chair 1 &amp; 2)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-center hover:bg-emerald-500/30 cursor-pointer">
                        <span className="text-xs font-mono text-emerald-300 font-bold block">12:10 PM</span>
                        <span className="text-[10px] text-emerald-200">Open (Chair 1)</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#30D158]" />
                        GIST Database Exclusion Constraint (`tstzrange` no-overlap) Active
                      </span>
                      <span className="font-mono text-[11px] text-white/50">
                        Chair Buffer Spacing: 10 mins
                      </span>
                    </div>
                  </motion.div>
                )}

                {activeTab === "queue" && (
                  <motion.div
                    key="queue"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-[#0F172A] rounded-2xl border border-white/10"
                  >
                    {/* Column 1: Waiting Room */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                          <Users className="w-3.5 h-3.5" /> Waiting Lounge (3)
                        </h4>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                          Avg: 12 min
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span>A-102 • Tanvir Ahmed</span>
                            <span className="text-amber-400 font-mono">08m</span>
                          </div>
                          <span className="text-[10px] text-white/50 block mt-0.5">
                            Card: DDC-2026-091 • Scaling
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span>A-103 • Nusrat Jahan</span>
                            <span className="text-amber-400 font-mono">02m</span>
                          </div>
                          <span className="text-[10px] text-white/50 block mt-0.5">
                            Card: DDC-2026-092 • Consultation
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: In-Chair (Active Surgery) */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Stethoscope className="w-3.5 h-3.5" /> In-Chair (Active)
                        </h4>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">
                          Chair 1 &amp; 2
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30">
                          <div className="flex justify-between items-center text-xs font-bold text-blue-200">
                            <span>A-101 • Rafiqul Islam</span>
                            <span className="animate-pulse text-emerald-400">In Surgery</span>
                          </div>
                          <span className="text-[10px] text-white/60 block mt-0.5">
                            Dr. Farhana • Root Canal (Tooth 16)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Billing & Completed */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <CreditCard className="w-3.5 h-3.5" /> Ready for Checkout
                        </h4>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                          Whole-BDT
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                          <div className="flex justify-between items-center text-xs font-bold text-emerald-200">
                            <span>A-100 • Shahriar Kabir</span>
                            <span className="text-white font-mono">৳ 3,500</span>
                          </div>
                          <span className="text-[10px] text-white/60 block mt-0.5">
                            Auto-drafted from Rx • bKash / Cash
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "billing" && (
                  <motion.div
                    key="billing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 bg-[#0F172A] rounded-2xl border border-white/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <span className="text-xs font-mono text-emerald-400">INVOICE #INV-2026-0841</span>
                        <h4 className="text-base font-bold text-white">
                          Whole-Taka Ledger &amp; Multi-Channel Settlement
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-white/50 block">Payable Amount</span>
                        <span className="text-2xl font-black text-emerald-400 font-mono">৳ 4,500</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Services auto-loaded from Rx */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <h5 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                          Auto-Transferred Clinical Services
                        </h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span>Consultation &amp; FDI Examination</span>
                            <span className="font-mono">৳ 500</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Molar Root Canal Therapy (Tooth 16)</span>
                            <span className="font-mono">৳ 4,000</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-emerald-300">
                            <span>Subtotal (Whole-BDT)</span>
                            <span className="font-mono">৳ 4,500</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Split */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <h5 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                          Payment Reconciliation
                        </h5>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-pink-500" /> bKash Digital
                            </span>
                            <span className="font-mono font-bold">৳ 2,500 (TrxID: 9X738B)</span>
                          </div>
                          <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash Received
                            </span>
                            <span className="font-mono font-bold">৳ 2,000</span>
                          </div>
                          <div className="flex justify-between pt-1 text-[11px] text-emerald-400 font-bold">
                            <span>Balance Due: ৳ 0 (Fully Settled)</span>
                            <span>Money Receipt Printed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* CORE 6 FEATURES GRID */}
      <section id="features" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1 rounded-full bg-[#E8EEF7] text-[#2A5CAA] font-bold text-xs uppercase tracking-wider">
              Architecture &amp; Capability
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1C1C1E] tracking-tight">
              Built Specifically for the Realities of Dental Practice
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#6B7280]">
              Every module is designed to eliminate front-desk delays, enhance doctor diagnostic precision,
              and maintain an unyielding financial ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-7 border border-[#E4E4E7] shadow-sm hover:shadow-md hover:border-[#2A5CAA]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center mb-5">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">
                  Barcode Smart Cards &amp; Instant ID
                </h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Support for both instant auto-generated IDs and pre-printed CR80 plastic card batches.
                  Scan with any physical 1D USB barcode gun to open the patient profile in 0.2 seconds.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F4F4F5] flex items-center gap-2 text-xs font-bold text-[#2A5CAA]">
                <span>1D Barcode standard</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-7 border border-[#E4E4E7] shadow-sm hover:shadow-md hover:border-[#2A5CAA]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#E8F8EE] text-[#30D158] flex items-center justify-center mb-5">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">
                  Anti-Collision Slot Engine
                </h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Calculates real availability factoring in split operational shifts (e.g. 10AM-2PM &amp; 5PM-9PM),
                  past-time pruning, chair buffer spacing, and PostgreSQL GIST exclusion locks.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F4F4F5] flex items-center gap-2 text-xs font-bold text-[#30D158]">
                <span>Zero double bookings</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-7 border border-[#E4E4E7] shadow-sm hover:shadow-md hover:border-[#2A5CAA]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center mb-5">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">
                  Sub-60s Prescription &amp; FDI Chart
                </h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Dual-quadrant adult (32) and pediatric (20) teeth selector with 15+ dental conditions.
                  Rapid Bangla dosage picker (১+০+১, খাবার আগে/পরে) and active drug allergy safeguards.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F4F4F5] flex items-center gap-2 text-xs font-bold text-[#9333EA]">
                <span>FDI 2-digit standard</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-7 border border-[#E4E4E7] shadow-sm hover:shadow-md hover:border-[#2A5CAA]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FFF7EB] text-[#FF9F0A] flex items-center justify-center mb-5">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">
                  Private Clinical Notes &amp; Lightbox
                </h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Doctor-only private observation logs protected from patient prints. Built-in high-res
                  radiograph and intraoral photo lightbox with full zoom and rotation for diagnostic clarity.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F4F4F5] flex items-center gap-2 text-xs font-bold text-[#FF9F0A]">
                <span>Doctor privacy guaranteed</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-7 border border-[#E4E4E7] shadow-sm hover:shadow-md hover:border-[#2A5CAA]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center mb-5">
                  <Tv className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">
                  Live Patient Queue &amp; TV Lounge Mode
                </h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Drag-and-drop Kanban queue (Waiting, In-Chair, Billed, Done). Dedicated full-screen TV lounge
                  display that announces patient tokens with pleasant audio chimes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F4F4F5] flex items-center gap-2 text-xs font-bold text-[#3B82F6]">
                <span>Live token callout</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-7 border border-[#E4E4E7] shadow-sm hover:shadow-md hover:border-[#2A5CAA]/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center mb-5">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">
                  Whole-BDT Billing &amp; bKash Ledger
                </h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Strict Bangladeshi Taka integer ledger that prevents fractional paisa round-off issues.
                  Supports split payments across Cash, bKash, and Nagad with printed money receipts.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F4F4F5] flex items-center gap-2 text-xs font-bold text-[#059669]">
                <span>Bangladeshi Taka native</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-PHASE CLINICAL WORKFLOW TIMELINE */}
      <section id="workflow" className="py-20 bg-white border-t border-[#E4E4E7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1 rounded-full bg-[#E8F8EE] text-[#30D158] font-bold text-xs uppercase tracking-wider">
              Operational Sequence
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#1C1C1E] tracking-tight">
              The 5-Phase End-to-End Clinic Workflow
            </h2>
            <p className="mt-3 text-base text-[#6B7280]">
              From the instant a patient walks through the door to treatment completion and recall scheduling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {/* Step 1 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] relative">
              <span className="text-xs font-mono font-extrabold text-[#2A5CAA] bg-[#E8EEF7] px-2.5 py-1 rounded-md">
                Phase 01
              </span>
              <h4 className="text-sm font-bold text-[#1C1C1E] mt-3 mb-1">Reception &amp; Card Scan</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Scan pre-printed CR80 card or generate unique patient ID. Instant search by mobile number.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] relative">
              <span className="text-xs font-mono font-extrabold text-[#3B82F6] bg-[#EFF6FF] px-2.5 py-1 rounded-md">
                Phase 02
              </span>
              <h4 className="text-sm font-bold text-[#1C1C1E] mt-3 mb-1">Queue &amp; Lounge Token</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Patient enters waiting room. TV screen displays active token number and designated chair.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] relative">
              <span className="text-xs font-mono font-extrabold text-[#9333EA] bg-[#F3E8FF] px-2.5 py-1 rounded-md">
                Phase 03
              </span>
              <h4 className="text-sm font-bold text-[#1C1C1E] mt-3 mb-1">FDI Exam &amp; Bangla Rx</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Dentist marks tooth conditions, adds Bangla dosages, attaches X-rays, and logs private notes.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] relative">
              <span className="text-xs font-mono font-extrabold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-md">
                Phase 04
              </span>
              <h4 className="text-sm font-bold text-[#1C1C1E] mt-3 mb-1">Whole-BDT Billing</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Services auto-populate on invoice. Front desk collects payment via bKash/Cash and prints receipt.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] relative">
              <span className="text-xs font-mono font-extrabold text-[#D97706] bg-[#FEF3C7] px-2.5 py-1 rounded-md">
                Phase 05
              </span>
              <h4 className="text-sm font-bold text-[#1C1C1E] mt-3 mb-1">Follow-up &amp; Retention</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Next visit auto-scheduled. Patient receives appointment reminder emails with chamber details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT CREATOR VIDEO PRODUCTION KIT SECTION */}
      <section id="creator-kit" className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 p-8 sm:p-12 relative overflow-hidden">
            {/* Ambient Graphic */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold mb-4">
                  <Video className="w-3.5 h-3.5" />
                  <span>Content Creator &amp; Reviewer Kit</span>
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  Everything Creators Need to Produce an Outstanding Video
                </h3>

                <p className="mt-4 text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
                  We have prepared an end-to-end <strong>Features &amp; Workflow Production Guide</strong>.
                  It includes a ready-to-record 6-minute YouTube/Facebook script with timestamps, visual
                  B-roll cues, voiceover narration, key marketing talking points, and technical callouts.
                </p>

                <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/80">
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Complete 6-Minute Script
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> B-Roll Video Storyboard
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> High-Res Vector Diagrams
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant Role Matrix
                  </span>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a
                    href="/ORIS_EMR_Features_and_Workflow_Guide.pdf"
                    download="ORIS_EMR_Features_and_Workflow_Guide.pdf"
                    className="px-6 py-3.5 rounded-xl bg-white text-[#0F172A] hover:bg-[#F1F5F9] font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#2A5CAA]" />
                    <span>Download Production PDF (1.3 MB)</span>
                  </a>

                  <a
                    href="/oris-features-guide.html"
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-white font-semibold text-sm transition-all flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Interactive HTML Guide</span>
                  </a>
                </div>
              </div>

              {/* Graphic Showcase */}
              <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#2A5CAA] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  <Play className="w-8 h-8 ml-1" />
                </div>
                <h4 className="text-base font-bold text-white">6-Minute Video Script</h4>
                <p className="text-xs text-white/60 mt-1">
                  Introduction &bull; Smart Cards &bull; FDI Tooth Chart &bull; Anti-Collision Slots &bull;
                  Whole-BDT Billing &bull; Clinic Impact
                </p>
                <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-white/50">
                  Ready to print or prompt teleprompter
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND LOGO PLACEMENT GUIDANCE NOTE */}
      <section className="py-12 bg-[#F1F5F9] border-t border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-2xl p-6 border border-[#E4E4E7] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center shrink-0">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1C1C1E]">
                  Looking to Upload Your Chamber or Platform Logo?
                </h4>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Keep app logos in <code className="bg-[#F4F4F5] px-1.5 py-0.5 rounded text-[#2A5CAA] font-mono">public/logo.png</code> or <code className="bg-[#F4F4F5] px-1.5 py-0.5 rounded text-[#2A5CAA] font-mono">public/logo.svg</code>. Clinic letterheads can be uploaded directly via Chamber Settings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-[#2A5CAA] text-white text-xs font-semibold hover:bg-[#224b8c] transition"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#E4E4E7] bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo size="sm" />

          <div className="flex items-center gap-6 text-xs text-[#6B7280]">
            <a href="#features" className="hover:text-[#1C1C1E] transition">
              Features
            </a>
            <a href="#workflow" className="hover:text-[#1C1C1E] transition">
              Workflow
            </a>
            <a
              href="/ORIS_EMR_Features_and_Workflow_Guide.pdf"
              download="ORIS_EMR_Features_and_Workflow_Guide.pdf"
              className="hover:text-[#2A5CAA] font-bold transition"
            >
              PDF Guide
            </a>
            <Link href="/login" className="hover:text-[#1C1C1E] transition">
              Staff Login
            </Link>
            <Link href="/platform" className="hover:text-[#1C1C1E] transition">
              Superadmin Platform
            </Link>
          </div>

          <p className="text-xs text-[#9CA3AF]">
            &copy; {new Date().getFullYear()} ORIS EMR. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
