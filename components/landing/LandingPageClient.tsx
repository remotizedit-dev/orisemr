"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MessageCircle,
  Play,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Users,
  Tv,
  Calendar,
  CreditCard,
  QrCode,
  Printer,
  Lock,
  Download,
  AlertCircle,
  Building,
} from "lucide-react";

import { formatYouTubeEmbedUrl } from "@/lib/youtube";
import { submitDemoLead } from "@/app/actions/lead";

declare global {
  interface Window {
    fbq?: (action: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.06 7.41C8.84 7.41 8.47 7.49 8.18 7.81C7.88 8.13 7.06 8.91 7.06 10.49C7.06 12.07 8.21 13.6 8.37 13.82C8.53 14.04 10.63 17.29 13.85 18.68C14.62 19.01 15.22 19.21 15.69 19.36C16.46 19.6 17.16 19.57 17.72 19.48C18.34 19.39 19.63 18.7 19.9 17.94C20.17 17.18 20.17 16.52 20.09 16.39C20.01 16.26 19.79 16.18 19.46 16.02C19.13 15.86 17.5 15.05 17.2 14.94C16.9 14.83 16.68 14.78 16.46 15.11C16.24 15.44 15.61 16.18 15.42 16.39C15.23 16.61 15.04 16.64 14.71 16.48C14.38 16.32 13.32 15.97 12.06 14.85C11.08 13.98 10.42 12.9 10.23 12.57C10.04 12.24 10.21 12.06 10.37 11.9C10.52 11.76 10.7 11.52 10.87 11.33C11.04 11.14 11.1 11 11.21 10.78C11.32 10.56 11.27 10.37 11.19 10.21C11.11 10.05 10.45 8.42 10.17 7.76C9.9 7.12 9.63 7.21 9.42 7.2C9.23 7.2 9.01 7.2 8.79 7.2L9.06 7.41Z" />
    </svg>
  );
}

function YoutubePlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
    </svg>
  );
}

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
    <div className="flex items-center gap-2.5 sm:gap-3">
      {!imgError ? (
        <div className={`relative overflow-hidden bg-white flex items-center justify-center ${sizeClasses[size]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Oris EMR"
            className="w-full h-full object-contain"
            onError={(e) => {
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
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#1C1C1E]">
            Oris <span className="text-[#2A5CAA]">EMR</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E8EEF7] text-[#2A5CAA] border border-[#2A5CAA]/20">
            PRO
          </span>
        </div>
        <span className="block text-[10px] sm:text-[11px] font-medium text-[#6B7280] tracking-tight">
          Dental Chamber Software
        </span>
      </div>
    </div>
  );
}

export default function LandingPageClient({
  initialVideoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
}: {
  initialVideoUrl?: string;
}) {
  // Language toggle state: Bangla (default) or English
  const [lang, setLang] = useState<"bn" | "en">("bn");

  // Lead capture form state
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadArea, setLeadArea] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Marketing UTM tracking
  const [utmParams, setUtmParams] = useState<{
    source?: string;
    campaign?: string;
    medium?: string;
  }>({});

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const source = searchParams.get("utm_source") || undefined;
      const campaign = searchParams.get("utm_campaign") || undefined;
      const medium = searchParams.get("utm_medium") || undefined;
      setUtmParams({ source, campaign, medium });
    }
  }, []);

  const handleWhatsAppClick = (locationTag = "hero_cta") => {
    // Fire Meta Pixel Contact conversion if present
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      try {
        window.fbq("track", "Contact", {
          content_name: "Oris EMR WhatsApp Demo Request",
          content_category: "Lead",
          location: locationTag,
        });
      } catch {
        // Safe ignore
      }
    }

    const baseMsg = "Oris EMR ডেমো দেখতে চাই।";
    const utmTag = utmParams.source ? ` (Source: ${utmParams.source})` : "";
    const fullMsg = encodeURIComponent(`${baseMsg}${utmTag}`);
    window.open(`https://wa.me/8801920709034?text=${fullMsg}`, "_blank");
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!leadPhone.trim() || leadPhone.trim().length < 8) {
      setFormError(lang === "bn" ? "অনুগ্রহ করে আপনার সঠিক মোবাইল নম্বরটি লিখুন।" : "Please enter a valid phone number.");
      return;
    }

    startTransition(async () => {
      const res = await submitDemoLead({
        name: leadName,
        phone: leadPhone,
        chamberArea: leadArea,
        source: "landing_callback_form",
        utmSource: utmParams.source,
        utmCampaign: utmParams.campaign,
        utmMedium: utmParams.medium,
      });

      if (res.success) {
        setFormSubmitted(true);
        if (typeof window !== "undefined" && typeof window.fbq === "function") {
          try {
            window.fbq("track", "Lead", {
              content_name: "Oris EMR Demo Callback",
            });
          } catch {
            // Safe ignore
          }
        }
      } else {
        setFormError(res.message);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1C1C1E] selection:bg-[#2A5CAA] selection:text-white flex flex-col justify-between overflow-x-hidden font-sans">
      {/* 1. STICKY TOP BAR (Mobile-First, One Clear WhatsApp CTA, No PDF Banner) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E4E4E7] px-4 sm:px-6 py-2.5 sm:py-3 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="transition hover:opacity-95">
            <BrandLogo size="sm" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === "bn" ? "en" : "bn")}
              className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-xs font-bold text-[#4B5563] hover:bg-[#F1F5F9] transition flex items-center gap-1 cursor-pointer"
              title="Toggle Bangla / English"
            >
              <span>{lang === "bn" ? "ENG" : "বাংলা"}</span>
            </button>

            {/* Direct Phone Call on Desktop */}
            <a
              href="tel:+8801920709034"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-[#2A5CAA] hover:text-[#1C3E75] px-2.5 py-1.5 rounded-lg bg-[#E8EEF7] transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+8801920709034</span>
            </a>

            {/* Top Bar Single Action Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleWhatsAppClick("top_bar")}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#25D366]/25 hover:shadow-lg transition cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>{lang === "bn" ? "ফ্রি ডেমো (WhatsApp)" : "Free Demo (WhatsApp)"}</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION (Pain/Outcome Hook, Single Primary WhatsApp CTA, Looping Rx Visual) */}
      <section className="relative pt-10 pb-14 sm:pt-16 sm:pb-20 overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9]">
        {/* Ambient Dental Blue Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[680px] h-[300px] bg-gradient-to-r from-[#2A5CAA]/15 via-[#38BDF8]/10 to-[#34D399]/15 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Mobile-Friendly Eyebrow Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E8EEF7] border border-[#2A5CAA]/20 text-[#2A5CAA] text-xs font-bold mb-5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2A5CAA]" />
            <span>{lang === "bn" ? "বাংলাদেশী ডেন্টাল চেম্বার সফটওয়্যার" : "Dental Chamber SaaS for Bangladesh"}</span>
          </motion.div>

          {/* Headline: Pain or Outcome Hook */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#1C1C1E] tracking-tight leading-[1.18] sm:leading-[1.15]"
          >
            {lang === "bn" ? (
              <>
                রোগী বসে আছে, আর আপনি{" "}
                <span className="bg-gradient-to-r from-[#2A5CAA] via-[#1D4ED8] to-[#0D9488] bg-clip-text text-transparent">
                  প্রেসক্রিপশন লিখছেন?
                </span>
              </>
            ) : (
              <>
                Patients are waiting, and you&apos;re still{" "}
                <span className="bg-gradient-to-r from-[#2A5CAA] via-[#1D4ED8] to-[#0D9488] bg-clip-text text-transparent">
                  writing prescriptions by hand?
                </span>
              </>
            )}
          </motion.h1>

          {/* Subline: Single Benefit Sentence */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 sm:mt-5 text-base sm:text-lg md:text-xl text-[#4B5563] max-w-2xl mx-auto leading-relaxed font-normal"
          >
            {lang === "bn"
              ? "চেম্বারের প্রেসক্রিপশন, অ্যাপয়েন্টমেন্ট আর হিসাব এক জায়গায়। ১৫ মিনিটে চালু।"
              : "Prescriptions, appointments, and billing in one place. Live in 15 minutes."}
          </motion.p>

          {/* Hero CTAs: One Dominant WhatsApp Button + One Small Video Link */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleWhatsAppClick("hero_primary")}
              className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-base shadow-lg shadow-[#25D366]/30 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
              <span>{lang === "bn" ? "ফ্রি ডেমো দেখুন (WhatsApp)" : "Request Free Demo (WhatsApp)"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </motion.button>

            <a
              href="#video"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#4B5563] hover:text-[#2A5CAA] px-4 py-2.5 rounded-lg hover:bg-white/80 transition"
            >
              <YoutubePlayIcon className="w-4 h-4 text-red-500" />
              <span>{lang === "bn" ? "ভিডিও ডেমো দেখুন" : "Watch Demo Video"}</span>
            </a>
          </motion.div>

          {/* 3. OFFER STRIP (Directly Under Hero, Completely Transparent) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8 sm:mt-10 max-w-xl mx-auto rounded-2xl bg-gradient-to-r from-[#FEF3C7] via-[#FFFBEB] to-[#FEF3C7] border border-amber-300/80 p-3.5 sm:p-4 text-amber-950 shadow-sm"
          >
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>{lang === "bn" ? "চলতি মাসের স্পেশাল অফার" : "Special Limited Offer"}</span>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-950">
              {lang === "bn"
                ? "৩ মাস সম্পূর্ণ ফ্রি! মাত্র ২,০০০ টাকায় ৪ মাস (দৈনিক মাত্র ~১৬.৬৭ টাকা)।"
                : "3 Months Free! Get 4 Months for BDT 2,000 (only ~BDT 16.67/day)."}
            </div>
            <div className="mt-1 text-xs text-amber-800/90 font-medium">
              {lang === "bn"
                ? "৪ মাস পর মাসিক ২,০০০ টাকা (দৈনিক ~৬৭ টাকা) — কোনো লুকানো শর্ত নেই, যেকোনো সময় বাতিলযোগ্য।"
                : "After month 4, the price is BDT 2,000/month (~BDT 67/day). No hidden contracts, cancel anytime."}
            </div>
          </motion.div>

          {/* REALISTIC SCREENSHOT / INTERACTIVE BANGLA RX PREVIEW */}
          <div className="mt-10 sm:mt-12 rounded-2xl sm:rounded-3xl border border-[#CBD5E1] bg-white shadow-xl p-3 sm:p-5 text-left overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-semibold text-gray-700 ml-2">
                  {lang === "bn" ? "ডাক্তারের প্রেসক্রিপশন স্ক্রিন" : "Doctor Rx Consultation Screen"}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {lang === "bn" ? "১ মিনিটে প্রেসক্রিপশন" : "1-Minute Prescription"}
              </span>
            </div>

            {/* Mockup Consultation Interface */}
            <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Patient & Tooth Info */}
              <div className="md:col-span-5 bg-[#F8FAFC] rounded-xl p-3.5 border border-gray-200 text-xs space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    {lang === "bn" ? "রোগীর বিবরণ" : "Patient Info"}
                  </span>
                  <div className="font-bold text-sm text-[#1C1C1E]">
                    {lang === "bn" ? "মোঃ রফিকুল ইসলাম (বয়স: ৪২ বছর, পুরুষ)" : "Md. Rafiqul Islam (Age: 42, Male)"}
                  </div>
                  <span className="text-[11px] text-gray-500">ID: ORIS-2026-048 • Phone: 01712-XXXXXX</span>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    {lang === "bn" ? "আক্রান্ত দাঁত (FDI Chart)" : "Affected Tooth (FDI)"}
                  </span>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                    <span>Tooth 16 (Upper Right First Molar)</span>
                  </div>
                  <span className="block text-[11px] text-red-600 mt-1">
                    {lang === "bn" ? "ডায়াগনোসিস: পাল্পাইটিস • রুট ক্যানেল থেরাপি" : "Diagnosis: Pulpitis • Root Canal Therapy"}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600">{lang === "bn" ? "চেয়ারসাইড ভিজিট ফি:" : "Chairside Visit Fee:"}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">৳ ১,০০০</span>
                </div>
              </div>

              {/* Bangla Dosage Presets */}
              <div className="md:col-span-7 bg-[#F8FAFC] rounded-xl p-3.5 border border-gray-200 text-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                    {lang === "bn" ? "প্রেসক্রিপশন ওষুধ ও বাংলা ডোজ প্রিসেট" : "Prescribed Drugs & Bangla Dosage"}
                  </span>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-white border border-gray-200 flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900">1. Tab. Moxaclav 625mg</div>
                        <span className="text-[11px] text-gray-500">
                          {lang === "bn" ? "অ্যান্টিবায়োটিক • ৫ দিন ভরা পেটে" : "Antibiotic • 5 days after food"}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 text-xs">
                        ১ + ০ + ১ (খাওয়ার পর)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-gray-200 flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900">2. Tab. Naproxen 500mg</div>
                        <span className="text-[11px] text-gray-500">
                          {lang === "bn" ? "ব্যথানাশক • ৩ দিন ব্যথা থাকলে" : "Pain Relief • 3 days if pain persists"}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 text-xs">
                        ১ + ০ + ১ (খাওয়ার পর)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {lang === "bn" ? "অ্যালার্জি চেক: নিরাপদ" : "Allergy check: Safe"}
                  </span>
                  <span className="font-semibold text-[#2A5CAA]">
                    {lang === "bn" ? "১ ক্লিকে প্রিন্ট ও ফলো-আপ তারিখ" : "1-Click Print & Follow-up Recall"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PAIN STRIP (3 Items, Icons, in Bangla, High Empathy) */}
      <section className="py-10 bg-white border-y border-[#E4E4E7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-red-600">
              {lang === "bn" ? "চেম্বারের পরিচিত সমস্যা" : "Common Daily Struggles"}
            </h2>
            <p className="text-xl sm:text-2xl font-black text-[#1C1C1E] mt-1">
              {lang === "bn" ? "এই ঝামেলাগুলো কি আপনার চেম্বারেও হয়?" : "Does your chamber still deal with these?"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1C1C1E]">
                  {lang === "bn" ? "সিরিয়ালে রোগীর দীর্ঘ অপেক্ষা" : "Long Waiting Queue Chaos"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {lang === "bn"
                    ? "ওয়েটিং রুমে রোগীদের ভিড় ও অস্থিরতা। নাম ধরে ডাকাডাকিতে চেম্বারের পরিবেশ নষ্ট হয়।"
                    : "Crowded waiting lounge, patient restlessness, and shouting names creates unnecessary chaos."}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1C1C1E]">
                  {lang === "bn" ? "বারবার হাতে প্রেসক্রিপশন লেখা" : "Rewriting Same Rx by Hand"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {lang === "bn"
                    ? "ফলো-আপে আগের প্রেসক্রিপশন খুঁজে বের করা এবং একই ওষুধ আবার হাতে লিখতে গিয়ে সময় নষ্ট।"
                    : "Searching old files and repeatedly writing out the same dosage instructions causes doctor fatigue."}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-200 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1C1C1E]">
                  {lang === "bn" ? "খাতা বা ডায়েরিতে হিসাব হারানো" : "Lost Accounts & Khata Dues"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {lang === "bn"
                    ? "দিনশেষে ক্যাশ ও বিকাশের কালেকশন মেলাতে গিয়ে ভুল, রোগীর বাকি মনে না থাকা ও আর্থিক ক্ষতি।"
                    : "Paper khata ledger mismatches between Cash and bKash, uncollected dues, and daily revenue loss."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. THREE HERO FEATURES (Big Visual Cards, What Dentists Care Most About) */}
      <section id="features" className="py-14 sm:py-20 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="px-3 py-1 rounded-full bg-[#E8EEF7] text-[#2A5CAA] font-bold text-xs uppercase tracking-wider border border-[#2A5CAA]/20">
              {lang === "bn" ? "প্রধান ফিচারসমূহ" : "Core Capabilities"}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1C1C1E] mt-2 tracking-tight">
              {lang === "bn" ? "ডাক্তারদের সবচেয়ে পছন্দের ৩টি সুবিধা" : "The 3 Features Dentists Love Most"}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              {lang === "bn"
                ? "কোনো জটিল টেকনিক্যাল ট্রেনিং ছাড়াই যেকোনো ডাক্তার বা সহকারী প্রথম দিন থেকেই ব্যবহার করতে পারেন।"
                : "Zero complex training required. Any doctor or receptionist can master it on day one."}
            </p>
          </div>

          <div className="space-y-8">
            {/* Hero Feature 1: Bangla Rx with Dosage Presets */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-[#2A5CAA] text-xs font-bold mb-3 border border-blue-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === "bn" ? "ফিচার ০১" : "Feature 01"}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#1C1C1E]">
                  {lang === "bn" ? "বাংলায় প্রেসক্রিপশন ও ওষুধের ডোজ প্রিসেট" : "Bangla Rx & Dosage Presets"}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {lang === "bn"
                    ? "হাতে লেখার দিন শেষ! ড্রপডাউন থেকে ওষুধ বাছাই করলেই স্বয়ংক্রিয়ভাবে '১+০+১ ভরা পেটে ৫ দিন' বসে যায়। সাথে ড্রাগ অ্যালার্জি ওয়ার্নিং ও প্রিন্ট রেডি ফরম্যাট।"
                    : "Select dental drugs with pre-configured Bangla dosage shortcuts (১+০+১ খাওয়ার পর). Includes automatic allergy warning and instant print layout."}
                </p>
                <div className="mt-4 space-y-2 text-xs font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "১ মিনিটে নির্ভুল ডিজিটাল প্রেসক্রিপশন" : "Complete prescription in 1 minute"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "বাংলা ও ইংরেজি উভয় ভাষায় নির্দেশনা" : "Bangla instructions for patient clarity"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "পেনিসিলিন বা ড্রাগ অ্যালার্জি সেফটি চেক" : "Drug allergy safety auto-check"}</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-6 rounded-xl overflow-hidden border border-gray-200 shadow-md bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brochure-assets/4-prescription-builder.png"
                  alt="Bangla Prescription Builder"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            {/* Hero Feature 2: 1-Click Follow-Up Rx */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-6 md:order-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lang === "bn" ? "ফিচার ০২" : "Feature 02"}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#1C1C1E]">
                  {lang === "bn" ? "১-ক্লিকে রি-ভিজিট ফলো-আপ প্রেসক্রিপশন" : "1-Click Follow-up Rx Rewrite"}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {lang === "bn"
                    ? "রোগী ২য় বা ৩য় বার ফলো-আপে আসলে পুরোনো ফাইল খোঁজার প্রয়োজন নেই। ১ ক্লিকেই আগের প্রেসক্রিপশন ও দাঁতের তথ্য লোড হয়ে যায়। ডাক্তার শুধু নতুন নোট বা ওষুধ যোগ করবেন।"
                    : "When a patient returns for recall, 1-click loads their previous prescription and tooth records. Doctor simply reviews and updates in seconds."}
                </p>
                <div className="mt-4 space-y-2 text-xs font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "পুরোনো প্রেসক্রিপশন খোঁজার ঝামেলা চিরতরে শেষ" : "Zero time wasted searching paper archives"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "রোগীর সম্পূর্ণ ট্রিটমেন্ট হিস্ট্রি সংরক্ষিত" : "Full clinical history preserved chronologically"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "ডাক্তার ও রোগী উভয়ের সময় বাঁচে ৯০%" : "Saves 90% doctor consultation rewrite time"}</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-6 md:order-1 rounded-xl overflow-hidden border border-gray-200 shadow-md bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brochure-assets/5-printable-rx.png"
                  alt="Printable Prescription Flow"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            {/* Hero Feature 3: TV Queue Calling */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold mb-3 border border-purple-200">
                  <Tv className="w-3.5 h-3.5" />
                  <span>{lang === "bn" ? "ফিচার ০৩" : "Feature 03"}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#1C1C1E]">
                  {lang === "bn" ? "ওয়েটিং রুম লাইভ টিভি কলিং" : "Waiting Lounge TV Calling"}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {lang === "bn"
                    ? "চেম্বারের যেকোনো সাধারণ স্মার্ট টিভি বা মনিটরে টোকেন ও ডক্টর রুম নম্বর কল হয় অডিও সংকেত সহ। রিসেপশনে নাম ধরে চিৎকার শেষ, চেম্বার থাকে শান্ত ও পরিপাটি।"
                    : "Display live patient tokens and assigned chairs on any smart TV with audio chimes. Eliminates reception shouting and maintains clinic decorum."}
                </p>
                <div className="mt-4 space-y-2 text-xs font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "যেকোনো স্মার্ট টিভিতে ব্রাউজার দিয়েই চলবে" : "Runs on any smart TV or browser"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "কোনো ব্যয়বহুল টোকেন মেশিনের দরকার নেই" : "No expensive dedicated token hardware required"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === "bn" ? "রোগীরা সিরিয়াল দেখে নিশ্চিন্তে অপেক্ষা করতে পারে" : "Patients relax seeing their turn on screen"}</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-6 rounded-xl overflow-hidden border border-gray-200 shadow-md bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brochure-assets/3-live-queue.png"
                  alt="Waiting Lounge Live Queue"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          {/* COMPACT "WHAT ELSE YOU GET" GRID */}
          <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-base sm:text-lg font-black text-[#1C1C1E] text-center mb-6">
              {lang === "bn" ? "আরও যা যা পাচ্ছেন Oris EMR-এ" : "Everything Else Included in Oris EMR"}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#2A5CAA] transition">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2A5CAA] flex items-center justify-center mx-auto mb-2">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  {lang === "bn" ? "FDI দাঁতের চার্ট" : "FDI Tooth Chart"}
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {lang === "bn" ? "৩২ দাঁতের চার্ট" : "Adult 32-tooth"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#2A5CAA] transition">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  {lang === "bn" ? "চেয়ার শিডিউলিং" : "Chair Buffer"}
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {lang === "bn" ? "ডাবল বুকিং মুক্ত" : "Zero overlap slots"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#2A5CAA] transition">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  {lang === "bn" ? "বিকাশ/নগদ হিসাব" : "bKash & Cash"}
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {lang === "bn" ? "পূর্ণ টাকা লেজার" : "Whole-BDT ledger"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#2A5CAA] transition">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-2">
                  <QrCode className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  {lang === "bn" ? "বারকোড কার্ড" : "CR80 Cards"}
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {lang === "bn" ? "১ সেকেন্ডে চেক-ইন" : "1-sec barcode scan"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#2A5CAA] transition">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  {lang === "bn" ? "ডাক্তার প্রাইভেসি" : "Doctor Privacy"}
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {lang === "bn" ? "নিজস্ব রোগী তালিকা" : "Isolated register"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#2A5CAA] transition">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2">
                  <Printer className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  {lang === "bn" ? "সহজ প্রিন্ট" : "Easy Printing"}
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  {lang === "bn" ? "A4 ও প্যাড প্রিন্ট" : "A4 or pad ready"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VIDEO DEMO TOUR (Clean Embed, No Internal Admin Notes) */}
      <section id="video" className="py-14 sm:py-20 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold mb-3 border border-red-500/30">
            <YoutubePlayIcon className="w-4 h-4 text-red-400" />
            <span>{lang === "bn" ? "লাইভ ভিডিও ডেমো" : "Live Video Demo"}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            {lang === "bn" ? "বাস্তব চেম্বারে Oris EMR কীভাবে কাজ করে দেখুন" : "See Oris EMR In Real-World Clinic Action"}
          </h2>

          <p className="mt-2 text-sm sm:text-base text-gray-300 max-w-xl mx-auto">
            {lang === "bn"
              ? "বারকোড চেক-ইন থেকে ১ মিনিটে প্রেসক্রিপশন, টিভি কলিং এবং দিনশেষের হিসাব — সম্পূর্ণ ডেমো।"
              : "Watch our complete workflow: barcode check-in, 1-minute prescription authoring, live lounge TV calling, and billing."}
          </p>

          {/* Clean Responsive Video Cinema Frame */}
          <div className="mt-8 rounded-2xl p-2 sm:p-3 bg-white/10 border border-white/15 shadow-2xl backdrop-blur-md">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
              <iframe
                src={formatYouTubeEmbedUrl(initialVideoUrl)}
                title="Oris EMR Dental Chamber Software Walkthrough"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>

          {/* Direct CTA under video */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => handleWhatsAppClick("video_section")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-lg transition cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>{lang === "bn" ? "ভিডিও ভালো লেগেছে? ফ্রি ডেমো নিন" : "Liked the demo? Get started on WhatsApp"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 7. SOCIAL PROOF & PILOT CHAMBER TRUST */}
      <section className="py-14 sm:py-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider border border-emerald-200">
              {lang === "bn" ? "ডাক্তারদের অভিজ্ঞতা" : "Doctor Feedback"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C1C1E] mt-2 tracking-tight">
              {lang === "bn" ? "৫০+ ডেন্টাল চেম্বার ইতিমধ্যে ট্রায়াল দিচ্ছেন" : "50+ Dental Chambers Already on Board"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {lang === "bn"
                ? "বাস্তব ডেন্টাল প্র্যাকটিসে ব্যবহারকারী সম্মানিত চিকিৎসকদের মতামত"
                : "Honest feedback from practicing dentists in Bangladesh"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-200 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">
                {lang === "bn"
                  ? "“আগে প্রতি প্রেসক্রিপশন লিখতে ৫-৭ মিনিট লাগত, এখন ১ মিনিটে পুরো প্রেসক্রিপশন প্রিন্ট করে দিই। রোগীরাও স্পষ্ট বাংলা নির্দেশিকা দেখে খুব খুশি।”"
                  : "“Prescriptions used to take 5-7 minutes each. Now I print a complete Bangla prescription in 1 minute. Patients love the clarity.”"}
              </p>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="font-bold text-xs text-[#1C1C1E]">
                  {lang === "bn" ? "ড. তানভীর হোসেন (বিডিএস, পিজিটি)" : "Dr. Tanvir Hossain (BDS, PGT)"}
                </div>
                <div className="text-[11px] text-gray-500">
                  {lang === "bn" ? "ধানমন্ডি ডেন্টাল কেয়ার, ঢাকা" : "Dhanmondi Dental Care, Dhaka"}
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-200 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">
                {lang === "bn"
                  ? "“ফলো-আপে আগের প্রেসক্রিপশন ১ ক্লিকে চলে আসে। আর ওয়েটিং রুমের টিভি কলিংয়ের কারণে চেম্বারের পরিবেশ একদম শান্ত ও পরিপাটি থাকে।”"
                  : "“1-click follow-up reload saves immense time. The waiting lounge TV calling keeps the clinic quiet and professional.”"}
              </p>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="font-bold text-xs text-[#1C1C1E]">
                  {lang === "bn" ? "ড. সাদিয়া আফরিন (বিডিএস)" : "Dr. Sadia Afrin (BDS)"}
                </div>
                <div className="text-[11px] text-gray-500">
                  {lang === "bn" ? "মিরপুর ডেন্টাল চেম্বার, ঢাকা" : "Mirpur Dental Chamber, Dhaka"}
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-200 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">
                {lang === "bn"
                  ? "“বিকাশ আর ক্যাশ কালেকশনের হিসাব মেলাতে প্রতিদিন রাতে খাতা দেখা লাগত। এখন দিন শেষে রিসেপশনিস্টের কালেকশন এক পলকেই সম্পূর্ণ ক্লিয়ার।”"
                  : "“Reconciling bKash and cash used to take hours of ledger checking every night. Now end-of-day revenue is completely clear in seconds.”"}
              </p>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="font-bold text-xs text-[#1C1C1E]">
                  {lang === "bn" ? "ড. নাজমুল হক (বিডিএস)" : "Dr. Nazmul Haque (BDS)"}
                </div>
                <div className="text-[11px] text-gray-500">
                  {lang === "bn" ? "উত্তরা ডেন্টাল ক্লিনিক, ঢাকা" : "Uttara Dental Clinic, Dhaka"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SIMPLE COMPARISON TABLE (4 Rows Only, Paper Khata vs Oris EMR) */}
      <section id="comparison" className="py-14 sm:py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full bg-[#E8EEF7] text-[#2A5CAA] font-bold text-xs uppercase tracking-wider border border-[#2A5CAA]/20">
              {lang === "bn" ? "সহজ তুলনা" : "Clear Comparison"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C1C1E] mt-2 tracking-tight">
              {lang === "bn" ? "প্রচলিত খাতা বনাম Oris EMR" : "Paper Khata vs Oris EMR"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {lang === "bn" ? "কেন প্রতিটি আধুনিক ডেন্টাল চেম্বার সফটওয়্যারে শিফট করছে" : "Why modern clinics are making the switch"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 bg-gray-50 p-3 sm:p-4 border-b border-gray-200 text-xs font-bold text-gray-700">
              <div className="col-span-4 sm:col-span-4">{lang === "bn" ? "কাজের ধরণ" : "Workflow"}</div>
              <div className="col-span-4 sm:col-span-4 text-gray-500">{lang === "bn" ? "প্রচলিত খাতা / ডায়েরি" : "Paper Khata"}</div>
              <div className="col-span-4 sm:col-span-4 text-[#2A5CAA] font-extrabold">{lang === "bn" ? "Oris EMR" : "Oris EMR"}</div>
            </div>

            <div className="divide-y divide-gray-100 text-xs sm:text-sm">
              {/* Row 1: Prescription Time */}
              <div className="grid grid-cols-12 p-3.5 sm:p-4 items-center">
                <div className="col-span-4 font-bold text-gray-900">
                  {lang === "bn" ? "প্রেসক্রিপশন সময়" : "Prescription Time"}
                </div>
                <div className="col-span-4 text-red-600 flex items-center gap-1.5">
                  <X className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{lang === "bn" ? "হাতে লিখতে ৪-৬ মিনিট" : "4-6 mins by hand"}</span>
                </div>
                <div className="col-span-4 text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{lang === "bn" ? "১ মিনিটে বাংলা প্রিসেট" : "1 min with presets"}</span>
                </div>
              </div>

              {/* Row 2: Follow-up Recall */}
              <div className="grid grid-cols-12 p-3.5 sm:p-4 items-center bg-gray-50/50">
                <div className="col-span-4 font-bold text-gray-900">
                  {lang === "bn" ? "ফলো-আপ ভিজিট" : "Follow-up Recall"}
                </div>
                <div className="col-span-4 text-red-600 flex items-center gap-1.5">
                  <X className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{lang === "bn" ? "পুরোনো প্রেসক্রিপশন খোঁজাখুঁজি" : "Searching old files"}</span>
                </div>
                <div className="col-span-4 text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{lang === "bn" ? "১ ক্লিকে আগের তথ্য লোড" : "1-click instant reload"}</span>
                </div>
              </div>

              {/* Row 3: Double Booking */}
              <div className="grid grid-cols-12 p-3.5 sm:p-4 items-center">
                <div className="col-span-4 font-bold text-gray-900">
                  {lang === "bn" ? "অ্যাপয়েন্টমেন্ট" : "Appointments"}
                </div>
                <div className="col-span-4 text-red-600 flex items-center gap-1.5">
                  <X className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{lang === "bn" ? "ডাবল বুকিং ও সিরিয়াল বাগবিতণ্ডা" : "Double bookings & chaos"}</span>
                </div>
                <div className="col-span-4 text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{lang === "bn" ? "সুনির্দিষ্ট চেয়ার স্লট ও বাফার" : "Clean non-overlapping slots"}</span>
                </div>
              </div>

              {/* Row 4: Due Tracking */}
              <div className="grid grid-cols-12 p-3.5 sm:p-4 items-center bg-gray-50/50">
                <div className="col-span-4 font-bold text-gray-900">
                  {lang === "bn" ? "বকেয়া ও হিসাব" : "Dues & Ledger"}
                </div>
                <div className="col-span-4 text-red-600 flex items-center gap-1.5">
                  <X className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{lang === "bn" ? "খাতায় গরমিল ও টাকা হারানো" : "Lost records & paisa errors"}</span>
                </div>
                <div className="col-span-4 text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{lang === "bn" ? "প্রতি রোগীর স্বচ্ছ অটো-লেজার" : "Transparent per-patient ledger"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. HOW IT STARTS (3 Simple Steps) */}
      <section className="py-14 sm:py-20 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#2A5CAA] font-bold text-xs uppercase tracking-wider border border-blue-200">
              {lang === "bn" ? "অনবোর্ডিং" : "How It Starts"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C1C1E] mt-2 tracking-tight">
              {lang === "bn" ? "৩টি সহজ ধাপে চেম্বারে চালু করুন" : "Get Started in 3 Easy Steps"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-gray-200 text-center">
              <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center mx-auto mb-3 font-bold text-base shadow-sm">
                ১
              </div>
              <h3 className="font-bold text-sm text-[#1C1C1E]">
                {lang === "bn" ? "WhatsApp করুন" : "Send WhatsApp"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "bn"
                  ? "আমাদের WhatsApp নম্বরে একটি মেসেজ দিন। আমাদের টিম আপনাকে সাথে সাথে সফটওয়্যারের লাইভ ডেমো দেখাবে।"
                  : "Message us on WhatsApp. Our team will show you a live interactive walkthrough."}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-gray-200 text-center">
              <div className="w-10 h-10 rounded-full bg-[#2A5CAA] text-white flex items-center justify-center mx-auto mb-3 font-bold text-base shadow-sm">
                ২
              </div>
              <h3 className="font-bold text-sm text-[#1C1C1E]">
                {lang === "bn" ? "১৫ মিনিটে সেটআপ" : "Setup in 15 Mins"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "bn"
                  ? "আপনার চেম্বারের নাম, ডাক্তার আইডি এবং প্রেসক্রিপশনের প্যাড তথ্য আমাদের টিম ১৫ মিনিটে সেট করে দেবে।"
                  : "We configure your clinic name, doctor credentials, and prescription format in 15 minutes."}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-gray-200 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 font-bold text-base shadow-sm">
                ৩
              </div>
              <h3 className="font-bold text-sm text-[#1C1C1E]">
                {lang === "bn" ? "চেম্বারে শুরু করুন" : "Start Consultations"}
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {lang === "bn"
                  ? "প্রথম দিন থেকেই ১ মিনিটে রোগীকে ডিজিটাল বাংলা প্রেসক্রিপশন দিন এবং নিখুঁত হিসাব রাখুন।"
                  : "Start authoring digital Bangla prescriptions and tracking patient accounts from day one."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. PRICING BOX & SHORT FAQ */}
      <section id="pricing" className="py-14 sm:py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider border border-emerald-200">
              {lang === "bn" ? "স্বচ্ছ মূল্যতালিকা" : "Transparent Pricing"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C1C1E] mt-2 tracking-tight">
              {lang === "bn" ? "একটি সহজ প্ল্যান, সবকিছু আনলিমিটেড" : "One Simple Plan, Unlimited Access"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {lang === "bn" ? "কোনো ইনস্টলেশন চার্জ নেই, কোনো হিডেন ফি নেই" : "No installation charges, zero hidden fees"}
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto bg-white rounded-3xl border-2 border-[#2A5CAA] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#2A5CAA] text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-bl-xl">
              {lang === "bn" ? "সবচেয়ে জনপ্রিয়" : "Most Popular"}
            </div>

            <div className="text-center pb-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {lang === "bn" ? "Oris EMR চেম্বার লাইসেন্স" : "Oris EMR Chamber License"}
              </h3>
              <div className="mt-4 flex items-baseline justify-center gap-1.5">
                <span className="text-4xl sm:text-5xl font-black text-[#1C1C1E]">৳ ২,০০০</span>
                <span className="text-sm font-semibold text-gray-500">/ {lang === "bn" ? "মাস" : "month"}</span>
              </div>

              {/* Special 4-Month Offer Highlight */}
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-900">
                <span className="font-bold text-amber-950 block text-sm">
                  {lang === "bn" ? "৪ মাসের স্পেশাল অফার: মাত্র ২,০০০ টাকা!" : "4-Month Special Offer: Only BDT 2,000!"}
                </span>
                <span>
                  {lang === "bn"
                    ? "(৩ মাস ফ্রি + ১ মাস অগ্রিম = প্রথম ৪ মাস দৈনিক মাত্র ~১৬.৬৭ টাকা)"
                    : "(3 months free + 1 month advance = ~BDT 16.67/day)"}
                </span>
                <span className="block mt-1 text-[11px] text-amber-800">
                  {lang === "bn" ? "৪ মাস পর নিয়মিত ফি মাসিক ২,০০০ টাকা (দৈনিক ~৬৭ টাকা)।" : "After month 4, BDT 2,000/month (~BDT 67/day)."}
                </span>
              </div>
            </div>

            <div className="py-6 space-y-3 text-xs sm:text-sm text-gray-700">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === "bn" ? "আনলিমিটেড রোগী ও প্রেসক্রিপশন" : "Unlimited patients & prescriptions"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === "bn" ? "একাধিক ডক্টর ও রিসেপশন স্টাফ লগইন" : "Multiple doctor & staff logins"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === "bn" ? "ওয়েটিং রুম লাইভ টিভি কলিং ডিসপ্লে" : "Waiting lounge TV display system"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === "bn" ? "স্বয়ংক্রিয় রোগী লেজার ও পেমেন্ট হিসাব" : "Patient financial ledger & receipt printing"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === "bn" ? "প্রতিদিনের ক্লাউড অটোমেটিক ডেটা ব্যাকআপ" : "Daily automatic secure cloud backups"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === "bn" ? "সরাসরি WhatsApp ও ফোন সাপোর্ট (সকাল ৯টা-রাত ১০টা)" : "Direct WhatsApp & phone support"}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleWhatsAppClick("pricing_box")}
              className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>{lang === "bn" ? "অফারটি নিতে WhatsApp করুন" : "Claim Offer on WhatsApp"}</span>
            </button>
          </div>

          {/* Short FAQ Section */}
          <div className="mt-14 max-w-2xl mx-auto">
            <h3 className="text-lg font-black text-[#1C1C1E] text-center mb-6">
              {lang === "bn" ? "সাধারণ জিজ্ঞাসা (FAQ)" : "Frequently Asked Questions"}
            </h3>

            <div className="space-y-3 text-xs sm:text-sm">
              {[
                {
                  q: lang === "bn" ? "আমার চেম্বারের রোগীর ডেটা কি নিরাপদ থাকবে?" : "Is my clinic and patient data secure?",
                  a: lang === "bn"
                    ? "হ্যাঁ, সম্পূর্ণ নিরাপদ। আপনার সব ডেটা নিরাপদ ক্লাউড সার্ভারে এনক্রিপ্টেড থাকে এবং প্রতিদিন একাধিকবার অটোমেটিক ব্যাকআপ হয়।"
                    : "Yes. All data is encrypted on secure cloud servers with daily automated backups.",
                },
                {
                  q: lang === "bn" ? "সফটওয়্যার চালাতে কি উচ্চগতির ইন্টারনেট লাগবে?" : "Does it require high-speed internet?",
                  a: lang === "bn"
                    ? "না। যেকোনো সাধারণ ব্রডব্যান্ড বা মোবাইলের সাধারণ 4G ডাটা / হটস্পট দিয়েই Oris EMR দ্রুতগতিতে চলে।"
                    : "No. It runs smoothly on standard broadband or simple 4G mobile hotspot.",
                },
                {
                  q: lang === "bn" ? "প্রেসক্রিপশন কীভাবে প্রিন্ট করব?" : "How do I print prescriptions?",
                  a: lang === "bn"
                    ? "যেকোনো সাধারণ A4 প্রিন্টার অথবা আপনার চেম্বারের নিজস্ব লেটারহেড প্যাডে খুব সহজেই প্রিন্ট করতে পারবেন।"
                    : "You can print on any standard A4 laser printer or directly onto your chamber letterhead.",
                },
                {
                  q: lang === "bn" ? "৪ মাস পর কন্টিনিউ না করতে চাইলে আমার ডেটার কী হবে?" : "What happens if I cancel after 4 months?",
                  a: lang === "bn"
                    ? "কোনো বাধ্যবাধকতা নেই। আপনি চাইলে ১ ক্লিকেই আপনার সব রোগীর তালিকা ও প্রেসক্রিপশন হিস্ট্রি এক্সপোর্ট করে নিতে পারবেন।"
                    : "No lock-in contracts. You can export all your patient records and history with a single click anytime.",
                },
                {
                  q: lang === "bn" ? "সাপোর্ট বা কোনো সমস্যা হলে কার সাথে কথা বলব?" : "How do I get technical support?",
                  a: lang === "bn"
                    ? "আমাদের ডেডিকেটেড টিম সকাল ৯টা থেকে রাত ১০টা পর্যন্ত সরাসরি WhatsApp ও ফোনে সাপোর্ট প্রদান করে।"
                    : "Our support team is directly reachable via WhatsApp and phone from 9 AM to 10 PM every day.",
                },
              ].map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full p-4 text-left font-bold text-gray-900 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-gray-600 leading-relaxed border-t border-gray-100 pt-2 text-xs sm:text-sm">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA & FALLBACK LEAD FORM */}
      <section id="contact" className="py-14 sm:py-20 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#1C3E75] via-[#2A5CAA] to-[#1C3E75] rounded-3xl p-6 sm:p-10 text-white shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left Column: Direct Call & WhatsApp */}
              <div className="md:col-span-7">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white font-bold text-xs uppercase tracking-wider inline-block mb-3">
                  {lang === "bn" ? "ফ্রি ডেমো রিকোয়েস্ট" : "Free Demo Request"}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {lang === "bn" ? "আপনার চেম্বারকে আজই ডিজিটাল করুন" : "Modernize Your Dental Practice Today"}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-white/80 leading-relaxed">
                  {lang === "bn"
                    ? "সরাসরি WhatsApp-এ মেসেজ দিন অথবা আপনার ফোন নম্বর দিন, আমাদের টিম আপনাকে ১৫ মিনিটে ফ্রি ডেমো দেখাবে।"
                    : "Message us on WhatsApp or leave your number below. Our team will reach out in 15 minutes."}
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => handleWhatsAppClick("final_cta")}
                    className="px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <WhatsAppIcon className="w-4 h-4 fill-white" />
                    <span>WhatsApp: +8801920709034</span>
                  </button>

                  <a
                    href="tel:+8801920709034"
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-sm text-center transition flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>কল করুন: 01920-709034</span>
                  </a>
                </div>

                <div className="mt-4 text-[11px] text-white/60 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span>sales@orisemr.com</span>
                </div>
              </div>

              {/* Right Column: Lead Form Fallback */}
              <div className="md:col-span-5 bg-white text-gray-900 p-5 rounded-2xl shadow-lg">
                <h4 className="font-extrabold text-sm text-[#1C1C1E] mb-1">
                  {lang === "bn" ? "কল পেতে ফোন নম্বর দিন" : "Request a Callback"}
                </h4>
                <p className="text-[11px] text-gray-500 mb-3">
                  {lang === "bn" ? "আমাদের টিম দ্রুত আপনাকে কল করে ডেমো দেবে।" : "We will call you back to demonstrate."}
                </p>

                {formSubmitted ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                    <div className="font-bold text-emerald-800 text-sm">
                      {lang === "bn" ? "ধন্যবাদ!" : "Thank you!"}
                    </div>
                    <p className="text-gray-600 mt-1">
                      {lang === "bn" ? "আমাদের টিম দ্রুত আপনার সাথে যোগাযোগ করবে।" : "We will call you shortly."}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppClick("form_success_btn")}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-bold text-xs"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                      <span>{lang === "bn" ? "সরাসরি WhatsApp-এ কথা বলুন" : "Chat on WhatsApp now"}</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "bn" ? "ডাক্তার বা চেম্বারের নাম" : "Doctor / Chamber Name"}
                      </label>
                      <input
                        type="text"
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder={lang === "bn" ? "যেমন: ড. তানভীর" : "e.g. Dr. Tanvir"}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#2A5CAA]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "bn" ? "মোবাইল নম্বর *" : "Phone Number *"}
                      </label>
                      <input
                        type="tel"
                        required
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#2A5CAA]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        {lang === "bn" ? "এলাকা / জেলা" : "Chamber Location"}
                      </label>
                      <input
                        type="text"
                        value={leadArea}
                        onChange={(e) => setLeadArea(e.target.value)}
                        placeholder={lang === "bn" ? "যেমন: ধানমন্ডি, ঢাকা" : "e.g. Dhanmondi, Dhaka"}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#2A5CAA]"
                      />
                    </div>

                    {formError && (
                      <p className="text-[11px] text-red-600 font-semibold">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-2.5 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-bold text-xs shadow transition cursor-pointer disabled:opacity-50"
                    >
                      {isPending
                        ? (lang === "bn" ? "পাঠানো হচ্ছে..." : "Submitting...")
                        : (lang === "bn" ? "ফ্রি ডেমোর জন্য কল বুক করুন" : "Book Free Demo Call")}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. MINIMAL FOOTER (Superadmin link permanently removed) */}
      <footer className="border-t border-[#E4E4E7] bg-white py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />

          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap justify-center">
            <a
              href="/ORIS_EMR_Doctor_Clinic_Brochure.pdf"
              download="ORIS_EMR_Doctor_Clinic_Brochure.pdf"
              className="text-[#2A5CAA] hover:underline font-bold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === "bn" ? "ডাক্তার ব্রোশিওর (PDF)" : "Doctor Brochure (PDF)"}</span>
            </a>
            <span>&bull;</span>
            <a href="tel:+8801920709034" className="hover:text-gray-900 transition">
              +8801920709034
            </a>
            <span>&bull;</span>
            <a href="mailto:sales@orisemr.com" className="hover:text-gray-900 transition">
              sales@orisemr.com
            </a>
            <span>&bull;</span>
            {/* Small discreet Staff Login link for existing clients */}
            <Link href="/login" className="text-gray-400 hover:text-gray-700 transition">
              {lang === "bn" ? "স্টাফ লগইন" : "Staff Login"}
            </Link>
          </div>

          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Oris EMR. All rights reserved.
          </p>
        </div>
      </footer>

      {/* 13. STICKY WHATSAPP FLOATING BUTTON ON MOBILE (Always Visible, Prefilled Msg, Pixel Tracked) */}
      <div className="fixed bottom-4 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleWhatsAppClick("sticky_floating_button")}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm shadow-2xl shadow-[#25D366]/40 cursor-pointer border-2 border-white"
          title="WhatsApp-এ ডেমো দেখতে চাই"
        >
          <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
          <span className="hidden xs:inline">{lang === "bn" ? "ফ্রি ডেমো (WhatsApp)" : "Free Demo"}</span>
        </motion.button>
      </div>
    </div>
  );
}
