"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { LogOut, Loader2 } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
  title?: string;
  iconClassName?: string;
  showText?: boolean;
  text?: string;
}

export default function SignOutButton({
  className,
  title = "Log Out",
  iconClassName = "w-4 h-4",
  showText = false,
  text = "Log Out",
}: SignOutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    // 1. Instantly clear Better Auth session cookies from browser
    const pastDate = "Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `better-auth.session_token=; path=/; expires=${pastDate}; SameSite=Lax;`;
    document.cookie = `better-auth.session_data=; path=/; expires=${pastDate}; SameSite=Lax;`;

    // 2. Dispatch server-side session invalidation in background without blocking
    try {
      signOut().catch(() => {});
    } catch {}

    // 3. Immediately redirect to login in < 20ms
    window.location.replace("/login");
  };

  const defaultClasses =
    className ??
    "p-2 rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2]/50 transition cursor-pointer flex items-center gap-2";

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={defaultClasses}
      title={title}
      aria-label={title}
    >
      {isSigningOut ? (
        <Loader2 className={`${iconClassName} animate-spin text-current`} />
      ) : (
        <LogOut className={iconClassName} />
      )}
      {showText && (
        <span className="font-semibold">
          {isSigningOut ? "Logging out..." : text}
        </span>
      )}
    </button>
  );
}
