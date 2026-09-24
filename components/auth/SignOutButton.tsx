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

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
          onError: () => {
            // Even on error, force redirect to login
            window.location.href = "/login";
          },
        },
      });
    } catch {
      window.location.href = "/login";
    }
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
