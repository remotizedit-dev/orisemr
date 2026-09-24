"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Stethoscope, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your work email");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.forgetPassword({
        email: email.trim().toLowerCase(),
        redirectTo: "/reset-password",
      });

      if (error) {
        toast.error(error.message || "Failed to send reset email");
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      toast.success("Password reset link sent to your email!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
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
            We will send a secure 1-hour reset link to your email.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 shadow-xl border border-[#E4E4E7]">
          {isSubmitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-[#30D158] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1C1C1E]">
                Check Your Email
              </h3>
              <p className="text-sm text-[#6B7280] mt-1 mb-6">
                If an account exists for <span className="font-semibold text-[#1C1C1E]">{email}</span>, you will receive password reset instructions.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2A5CAA] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
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
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#2A5CAA]/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
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
