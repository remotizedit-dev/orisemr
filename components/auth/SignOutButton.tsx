"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { LogOut, Loader2 } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
  title?: string;
  iconClassName?: string;
  showText?: boolean;
}

export default function SignOutButton({
  className = "p-2 rounded-lg text-[#6B7280] hover:text-[#FF453A] hover:bg-white transition cursor-pointer flex items-center gap-2",
  title = "Sign Out",
  iconClassName = "w-4 h-4",
  showText = false,
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

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={className}
      title={title}
      aria-label="Sign Out"
    >
      {isSigningOut ? (
        <Loader2 className={`${iconClassName} animate-spin text-[#FF453A]`} />
      ) : (
        <LogOut className={iconClassName} />
      )}
      {showText && (
        <span className="text-xs font-medium">
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </span>
      )}
    </button>
  );
}
