"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  Stethoscope,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 30-second cooldown timer for resending
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const triggerReset = async (targetEmail: string) => {
    try {
      await authClient.requestPasswordReset({
        email: targetEmail.trim().toLowerCase(),
        redirectTo: "/reset-password",
      });
    } catch (err: any) {
      console.error("[PASSWORD RESET DISPATCH]:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid work email address");
      return;
    }

    // 1. Instant UI Level Confirmation
    setIsSubmitted(true);
    setResendCooldown(30);
    toast.success("Password reset link dispatched!");

    // 2. Background backend email dispatch
    triggerReset(cleanEmail);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setResendCooldown(30);
    toast.success("A fresh reset link has been dispatched to your email!");
    triggerReset(cleanEmail);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F4F5] via-[#FFFFFF] to-[#E8EEF7]/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2A5CAA] items-center justify-center text-white font-bold shadow-lg shadow-[#2A5CAA]/25 mb-4">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Reset Password
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Secure 1-hour password reset link for Oris EMR users.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 shadow-xl border border-[#E4E4E7]">
          {isSubmitted ? (
            <div className="text-center py-2 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#30D158] flex items-center justify-center mx-auto shadow-xs animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-[#1C1C1E]">
                  Check Your Email
                </h3>
                <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                  If an account exists for{" "}
                  <strong className="text-[#1C1C1E] font-bold">{email}</strong>,
                  we have sent password reset instructions to your inbox.
                </p>
              </div>

              {/* Security Details Card */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-left text-xs text-[#475569] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
                  <Clock className="w-3.5 h-3.5 text-[#2A5CAA]" />
                  <span>Link valid for 1 hour</span>
                </div>
                <p className="text-[11px] leading-normal text-[#64748B]">
                  Please click the link inside the email to choose a new password. If you don't see it within a minute, remember to check your Spam or Junk folder.
                </p>
              </div>

              {/* Actions: Resend or Edit Email */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#E4E4E7] bg-white hover:bg-[#F4F4F5] text-xs font-bold text-[#1C1C1E] flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend link in ${resendCooldown}s`
                      : "Resend Reset Link"}
                  </span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="text-[#6B7280] hover:text-[#1C1C1E] underline cursor-pointer"
                  >
                    Use a different email
                  </button>

                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 font-bold text-[#2A5CAA] hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Login</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase text-[#1C1C1E] tracking-wider mb-2"
                >
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@chamber.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#2A5CAA]/20 transition cursor-pointer"
              >
                <span>Send Reset Link</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#1C1C1E] transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
