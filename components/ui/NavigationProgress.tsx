"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, finish the loading bar
  useEffect(() => {
    if (isLoading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept click on internal links to start progress bar instantly
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, downloads, hash links, or new tabs
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.getAttribute("target") === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's navigating to a different URL
      const currentUrl = window.location.pathname + window.location.search;
      if (href !== currentUrl) {
        setIsLoading(true);
        setProgress(25);

        // Incremental progress simulation while waiting for server response
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) {
              clearInterval(interval);
              return 85;
            }
            return prev + Math.floor(Math.random() * 15) + 5;
          });
        }, 150);

        return () => clearInterval(interval);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!isLoading && progress === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] pointer-events-none transition-opacity duration-300 ${
        isLoading ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Glowing animated line with CSS hardware-accelerated transition */}
      <div
        className="h-[3px] bg-gradient-to-r from-[#2A5CAA] via-[#30D158] to-[#2A5CAA] shadow-[0_0_12px_rgba(42,92,170,0.8),0_0_4px_rgba(48,209,88,0.6)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />

      {/* Floating subtle glow dot at the leading edge */}
      <div
        className="absolute top-1 w-3 h-3 rounded-full bg-[#2A5CAA] shadow-[0_0_8px_#2A5CAA] -translate-x-1/2 transition-all duration-200 ease-out"
        style={{ left: `${progress}%` }}
      />
    </div>
  );
}
