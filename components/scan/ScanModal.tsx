"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Scan,
  Barcode,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { resolveCode } from "@/lib/barcode/resolve-code";

interface ScanModalProps {
  tenantId: string;
  tenantShortCode: string;
  triggerButton?: boolean;
}

export function ScanModal({
  tenantId,
  tenantShortCode,
  triggerButton = true,
}: ScanModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [scannedValue, setScannedValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    title: string;
    description: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Play high-pitch POS scanner beep using Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, ctx.currentTime); // 1.8kHz crisp POS beep
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio playback restrictions or fallback
    }
  };

  // Keyboard shortcut: F2 or Ctrl+B opens scanner modal
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "b")) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Auto-focus the input whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setScannedValue("");
      setLastResult(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleProcessScan = async (codeToProcess: string) => {
    const cleanCode = codeToProcess.trim();
    if (!cleanCode) return;

    setIsProcessing(true);
    try {
      const result = await resolveCode(cleanCode, tenantId, tenantShortCode);

      if (result.found && result.url) {
        playBeep();
        setLastResult({
          success: true,
          title: `Recognized ${result.type?.toUpperCase()}`,
          description: result.patient?.name
            ? `Patient: ${result.patient.name} (${result.patient.cardNumber || cleanCode})`
            : `Navigating to record...`,
        });

        if (result.canCheckIn && result.todayAppointment) {
          toast.success(`Checked in ${result.patient?.name || "Patient"} for today's visit!`);
        } else {
          toast.success(`Found ${result.type}: opening record`);
        }

        // Brief delay so user sees visual confirmation, then navigate
        setTimeout(() => {
          setIsOpen(false);
          router.push(result.url!);
        }, 400);
      } else {
        setLastResult({
          success: false,
          title: "Not Found",
          description: result.message || `No record matched code "${cleanCode}"`,
        });
        toast.error(result.message || `No record found for ${cleanCode}`);
        inputRef.current?.select();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process barcode");
      setLastResult({
        success: false,
        title: "Scan Error",
        description: err.message || "Communication failure",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProcessScan(scannedValue);
    }
  };

  return (
    <>
      {triggerButton && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2A5CAA] to-[#1E4282] hover:from-[#224b8c] hover:to-[#173366] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          title="Open USB Barcode Scanner (Shortcut: F2)"
        >
          <Scan className="w-4 h-4 text-[#93C5FD]" />
          <span className="hidden sm:inline">Scan Barcode</span>
          <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded font-mono hidden md:inline">
            F2
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E4E4E7] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8EEF7] text-[#2A5CAA] flex items-center justify-center shadow-2xs">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1C1E] flex items-center gap-2">
                    USB Barcode Scanner
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#30D158] bg-[#30D158]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-ping" />
                      Ready
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">
                    Point your USB or wireless handheld barcode gun &amp; pull the trigger.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1C1C1E] hover:bg-[#F4F4F5] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanner Target Area */}
            <div className="p-6 space-y-5">
              {/* Animated HUD Viewport */}
              <div className="relative rounded-2xl border-2 border-dashed border-[#2A5CAA]/40 bg-gradient-to-b from-[#E8EEF7]/40 via-white to-[#E8EEF7]/20 p-8 text-center overflow-hidden">
                {/* Visual red laser scanning line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF453A] to-transparent shadow-[0_0_12px_#FF453A] animate-bounce" />

                <div className="relative z-10 space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-[#E4E4E7] shadow-sm flex items-center justify-center text-[#2A5CAA]">
                    <Scan className="w-8 h-8 animate-pulse text-[#2A5CAA]" />
                  </div>
                  <p className="text-xs font-bold text-[#1C1C1E]">
                    Awaiting Barcode Transmission
                  </p>
                  <p className="text-[11px] text-[#6B7280] max-w-xs mx-auto">
                    Supports Patient Health Cards, Appointment Slips, Billing Invoices, and Prescription QR codes.
                  </p>
                </div>
              </div>

              {/* Direct Scanner Input Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1C1C1E]">
                  Barcode Gun Input Target (Auto-Focused):
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    data-scan-target="true"
                    type="text"
                    value={scannedValue}
                    onChange={(e) => setScannedValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isProcessing}
                    placeholder="Pull trigger on scanner or type code..."
                    className="w-full px-4 py-3 text-sm font-mono font-bold text-[#1C1C1E] bg-white border-2 border-[#2A5CAA] rounded-xl outline-none focus:ring-4 focus:ring-[#2A5CAA]/15 transition pr-24"
                    autoComplete="off"
                    autoFocus
                  />
                  <div className="absolute right-2 top-2">
                    <button
                      type="button"
                      onClick={() => handleProcessScan(scannedValue)}
                      disabled={isProcessing || !scannedValue.trim()}
                      className="px-3 py-1.5 rounded-lg bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Submit</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {lastResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-150 ${
                    lastResult.success
                      ? "bg-[#30D158]/10 border-[#30D158]/30 text-[#1C1C1E]"
                      : "bg-[#FF453A]/10 border-[#FF453A]/30 text-[#FF453A]"
                  }`}
                >
                  {lastResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#FF453A] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">{lastResult.title}</span>
                    <span className="text-[11px] opacity-90">{lastResult.description}</span>
                  </div>
                </div>
              )}

              {/* Quick instructions footer */}
              <div className="pt-2 border-t border-[#E4E4E7] flex items-center justify-between text-[11px] text-[#6B7280]">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-[#2A5CAA]" /> Audio Beep Enabled
                </span>
                <span>Press Enter or trigger gun to submit</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
