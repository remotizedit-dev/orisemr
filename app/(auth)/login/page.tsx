"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Stethoscope, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authClient.signIn.email({
        email,
        password,
      });

      if (response.error) {
        toast.error(response.error.message || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      toast.success("Login successful. Preparing your workspace...");
      setIsRedirecting(true);

      // Direct zero-delay navigation to target portal without intermediate redirect hops
      const targetUrl =
        (response.data?.user as any)?.role === "SUPER_ADMIN" ? "/platform" : "/app";
      window.location.replace(targetUrl);
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F4F5] via-[#FFFFFF] to-[#E8EEF7]/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#2A5CAA] items-center justify-center text-white font-bold shadow-lg shadow-[#2A5CAA]/25 mb-4">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
            Sign in to Oris EMR
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Dental Chamber Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-xl border border-[#E4E4E7]">
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
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@chamber.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase text-[#1C1C1E] tracking-wider"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#2A5CAA] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm text-[#1C1C1E] focus:outline-none focus:border-[#2A5CAA] focus:ring-2 focus:ring-[#E8EEF7] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-lg bg-[#2A5CAA] hover:bg-[#224b8c] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#2A5CAA]/20 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Seed accounts helper hint */}
          <div className="mt-8 pt-6 border-t border-[#E4E4E7] text-xs text-[#6B7280] space-y-1 bg-[#F4F4F5]/60 p-3 rounded-xl">
            <span className="font-semibold text-[#1C1C1E] block">
              Default Seed Accounts:
            </span>
            <div className="flex justify-between">
              <span>Super Admin:</span>
              <code className="text-[#2A5CAA]">admin@orisemr.com</code>
            </div>
            <div className="flex justify-between">
              <span>Demo Dentist:</span>
              <code className="text-[#2A5CAA]">admin@demo.test</code>
            </div>
            <div className="flex justify-between">
              <span>Password:</span>
              <code className="text-[#1C1C1E]">SuperAdmin123! / Demo@12345</code>
            </div>
          </div>
        </div>
      </div>

      {/* Smooth Lazy Redirect Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/95 border border-[#E4E4E7] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2A5CAA] flex items-center justify-center text-white shadow-lg shadow-[#2A5CAA]/25">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <span className="text-sm font-bold text-[#1C1C1E]">
              Authenticating...
            </span>
            <span className="text-xs text-[#6B7280]">
              Redirecting to your workspace
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
