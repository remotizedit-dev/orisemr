"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Armchair,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  Stethoscope,
  Users,
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  getLiveQueueItemsAction,
  getPublicQueueDataAction,
  type QueueItem,
} from "@/app/(tenant)/app/queue/actions";

interface QueueTvDisplayProps {
  initialItems: QueueItem[];
  tenantName: string;
  brandColor?: string | null;
  tenantSlug?: string;
  isPublic?: boolean;
}

// Gentle audio synthesizer for hospital/clinic waiting room chime (two-tone chord)
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.95);

    // Tone 2: G#5 (830.61 Hz) after 0.22s
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(830.61, now + 0.22);
    gain2.gain.setValueAtTime(0, now + 0.22);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.27);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 1.25);
  } catch {
    // Audio context may be restricted by browser policy before user interaction
  }
}

export function QueueTvDisplay({
  initialItems,
  tenantName,
  brandColor = "#2A5CAA",
  tenantSlug,
  isPublic = false,
}: QueueTvDisplayProps) {
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const prevInChairIdsRef = useRef<Set<string>>(
    new Set(initialItems.filter((i) => i.status === "in_chair").map((i) => i.id))
  );

  // Digital Live Dhaka Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now)
      );
      setCurrentDate(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(now)
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-Time Background Polling (Every 3.5 seconds)
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        let freshItems: QueueItem[] | undefined;

        if (isPublic && tenantSlug) {
          const res = await getPublicQueueDataAction(tenantSlug);
          if (res.success && res.items) {
            freshItems = res.items;
          }
        } else {
          freshItems = await getLiveQueueItemsAction();
        }

        if (isMounted && freshItems) {
          // Detect newly called patients to sound chime
          const newInChairIds = new Set(
            freshItems.filter((i) => i.status === "in_chair").map((i) => i.id)
          );

          const hasNewlyCalled = Array.from(newInChairIds).some(
            (id) => !prevInChairIdsRef.current.has(id)
          );

          if (hasNewlyCalled && isAudioEnabled) {
            playChime();
          }

          prevInChairIdsRef.current = newInChairIds;
          setItems(freshItems);
        }
      } catch {
        // Silently swallow polling network blips on public displays
      }
    };

    const interval = setInterval(poll, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isPublic, tenantSlug, isAudioEnabled]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const inChairItems = items
    .filter((i) => i.status === "in_chair")
    .sort((a, b) => (a.serialNo || 999999) - (b.serialNo || 999999));

  const waitingItems = items
    .filter((i) => i.status === "waiting")
    .sort((a, b) => (a.serialNo || 999999) - (b.serialNo || 999999));

  const recentlyDoneItems = items
    .filter((i) => i.status === "done" || i.status === "billing")
    .slice(-6);

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top Ambient Glow Accent */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 blur-[100px] pointer-events-none opacity-20"
        style={{ backgroundColor: brandColor || "#2A5CAA" }}
      />

      {/* Top Header Bar */}
      <header className="relative z-10 px-6 sm:px-10 py-5 border-b border-white/10 bg-[#0F1626]/80 backdrop-blur-xl flex items-center justify-between gap-4">
        {/* Left: Clinic Identity */}
        <div className="flex items-center gap-4">
          {!isPublic && (
            <Link
              href="/app/queue"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition flex items-center justify-center cursor-pointer"
              title="Return to Staff Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}

          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg"
            style={{ backgroundColor: brandColor || "#2A5CAA" }}
          >
            <Stethoscope className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {tenantName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Screen
              </span>
            </div>
            <p className="text-xs font-semibold text-white/50 tracking-wide">
              Patient Care & Chamber Queue Monitor
            </p>
          </div>
        </div>

        {/* Right: Clock & Screen Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Audio Chime Notification Toggle */}
          <button
            onClick={() => {
              const next = !isAudioEnabled;
              setIsAudioEnabled(next);
              if (next) playChime();
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
              isAudioEnabled
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-white/5 text-white/40 border-white/10 hover:text-white"
            }`}
            title={isAudioEnabled ? "Chime enabled (click to mute)" : "Click to enable audio chime on call"}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAudioEnabled ? "Sound ON" : "Sound OFF"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (F11)"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Digital Clock */}
          <div className="text-right border-l border-white/10 pl-5 sm:pl-6 hidden sm:block">
            <div className="text-2xl font-black tracking-tight text-white font-mono tabular-nums">
              {currentTime || "00:00:00"}
            </div>
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
              {currentDate}
            </div>
          </div>
        </div>
      </header>

      {/* Main Dual-Zone Queue Grid */}
      <main className="flex-1 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 min-h-0 overflow-y-auto">
        {/* Left 7 Columns: NOW SERVING IN DENTAL CHAIR (Hero Zone) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Armchair className="w-6 h-6 text-emerald-400" />
                Now in Dental Chair
              </h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">
              Active Treatment
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {inChairItems.length > 0 ? (
                inChairItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -15 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#12233B] via-[#0E1C30] to-[#0A1322] border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                  >
                    {/* Left: Serial Number Badge & Patient Name */}
                    <div className="flex items-center gap-6">
                      <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-500/20">
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                          SERIAL
                        </span>
                        <span className="text-4xl sm:text-5xl font-black text-white font-mono leading-none">
                          #{item.serialNo ? String(item.serialNo).padStart(2, "0") : "--"}
                        </span>
                      </div>

                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold uppercase tracking-wider mb-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          {item.chairName || "Dental Chair"}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {item.patientName}
                        </h3>
                        <p className="text-sm font-semibold text-white/60 mt-1 flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-emerald-400" />
                          Attending: <span className="text-white font-bold">{item.doctorName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Status Pill */}
                    <div className="sm:text-right shrink-0">
                      <span className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-black uppercase tracking-widest inline-block shadow-sm">
                        In Progress
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 min-h-[300px] rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 text-white/30">
                    <Armchair className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white/60">
                    Dental Chairs Currently Ready
                  </h3>
                  <p className="text-xs text-white/40 max-w-sm mt-1">
                    Waiting for next patient to be called to the dental chair.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right 5 Columns: WAITING LOUNGE LIST */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Users className="w-6 h-6 text-amber-400" />
                Waiting in Lounge
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs font-black">
              {waitingItems.length} Waiting
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            <AnimatePresence mode="popLayout">
              {waitingItems.length > 0 ? (
                waitingItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`p-4 sm:p-5 rounded-2xl border transition flex items-center justify-between gap-4 ${
                      index === 0
                        ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.1)]"
                        : "bg-[#0F1626]/60 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center shrink-0 font-mono font-black ${
                          index === 0
                            ? "bg-amber-500 text-[#0B0F19] shadow-md shadow-amber-500/20"
                            : "bg-white/10 text-white border border-white/10"
                        }`}
                      >
                        <span className="text-[9px] font-extrabold tracking-wider uppercase">
                          {index === 0 ? "NEXT" : "SL"}
                        </span>
                        <span className="text-xl sm:text-2xl font-black leading-none">
                          #{item.serialNo ? String(item.serialNo).padStart(2, "0") : "--"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base sm:text-lg font-extrabold text-white truncate">
                            {item.patientName}
                          </h4>
                          {index === 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 font-black text-[10px] uppercase tracking-wider shrink-0">
                              Up Next
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 truncate mt-0.5">
                          Doctor: <span className="text-white/80 font-semibold">{item.doctorName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-xs font-mono text-white/40">
                      <Clock className="w-3.5 h-3.5 inline mr-1 text-white/30" />
                      {item.startTime}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 min-h-[200px] rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center p-6">
                  <CheckCircle2 className="w-10 h-10 text-white/20 mb-2" />
                  <p className="text-sm font-bold text-white/50">Lounge is clear</p>
                  <p className="text-xs text-white/30">No patients waiting in queue</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Bottom Ticker & Completed Visits Banner */}
      <footer className="relative z-10 px-6 sm:px-10 py-3.5 border-t border-white/10 bg-[#0F1626]/90 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Left: Welcome Announcement */}
        <div className="flex items-center gap-2 text-white/60">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">
            Please be seated in the waiting lounge until your Serial Number is announced.
          </span>
        </div>

        {/* Right: Recently Completed Patients */}
        {recentlyDoneItems.length > 0 && (
          <div className="flex items-center gap-2 text-white/50 overflow-x-auto max-w-full">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 shrink-0">
              Recently Completed:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {recentlyDoneItems.map((d) => (
                <span
                  key={d.id}
                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70 text-[11px] font-mono"
                >
                  #{d.serialNo} {d.patientName.split(" ")[0]}
                </span>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
