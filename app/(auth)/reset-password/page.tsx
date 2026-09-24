"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Stethoscope, Lock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or expired password reset link");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (error) {
        toast.error(error.message || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully! You can now log in.");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="glass-panel rounded-2xl p-8 shadow-xl border border-[#E4E4E7] text-center space-y-4">
        <h2 className="text-base font-bold text-[#FF453A]">Invalid Reset Link</h2>
        <p className="text-xs text-[#6B7280]">
          The password reset token is missing or has expired. Please request a new link.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#2A5CAA] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Request New Reset Link</span>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="glass-panel rounded-2xl p-8 shadow-xl border border-[#E4E4E7] text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-[#30D158] mx-auto" />
        <h2 className="text-base font-bold text-[#1C1C1E]">
          Password Reset Complete!
        </h2>
        <p className="text-xs text-[#6B7280]">
          Your new password has been saved. Redirecting you to the sign in page...
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#2A5CAA] hover:underline"
        >
          <span>Sign In Now</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-8 shadow-xl border border-[#E4E4E7]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
            New Password: *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-3" />
            <input
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
            Confirm New Password: *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-3" />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Update Password &amp; Sign In</span>
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F4F5] via-[#FFFFFF] to-[#E8EEF7]/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2A5CAA] items-center justify-center text-white font-bold shadow-lg shadow-[#2A5CAA]/25 mb-4">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Create New Password
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Enter and confirm your new secure password.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="glass-panel p-8 rounded-2xl border border-[#E4E4E7] text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2A5CAA]" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
