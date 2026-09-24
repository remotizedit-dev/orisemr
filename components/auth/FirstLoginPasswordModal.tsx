"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeFirstLoginPasswordAction } from "@/app/(tenant)/app/auth-actions";
import { Lock, ShieldAlert, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  mustChange: boolean;
  userName: string;
}

export function FirstLoginPasswordModal({ mustChange, userName }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(mustChange);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg("Please enter your current temporary password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await changeFirstLoginPasswordAction({
        currentPassword,
        newPassword,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update password");
        setIsLoading(false);
        return;
      }

      toast.success("Password changed successfully! Welcome to Oris EMR.");
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-7 border border-[#E4E4E7] shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#EBF2FC] text-[#2A5CAA] flex items-center justify-center mx-auto mb-2 border border-[#2A5CAA]/20">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-[#1C1C1E] tracking-tight">
            Update Initial Password
          </h2>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Welcome, <strong>{userName}</strong>. Your account was provisioned with a temporary password. For security, please choose a new private password before continuing.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FFEBEA] border border-[#FF453A]/30 text-[#FF453A] text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
              Temporary / Current Password: *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8E8E93] absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F4F4F5]/50 border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
              New Password (min 8 chars): *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8E8E93] absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Choose a strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F4F4F5]/50 border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1E] mb-1">
              Confirm New Password: *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8E8E93] absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F4F4F5]/50 border border-[#E4E4E7] rounded-xl outline-none focus:border-[#2A5CAA] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#2A5CAA] hover:bg-[#1E4282] text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save New Password &amp; Enter Chamber</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
