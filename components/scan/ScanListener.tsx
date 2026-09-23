"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { resolveCode } from "@/lib/barcode/resolve-code";
import { toast } from "sonner";

interface ScanListenerProps {
  tenantId: string;
  tenantShortCode: string;
}

/**
 * Global Hardware Scanner Listener (USB / Bluetooth keyboard wedge).
 * Listens for rapid burst keystrokes (<35ms), prevents input contamination,
 * and routes scanned barcodes instantly.
 */
export function ScanListener({ tenantId, tenantShortCode }: ScanListenerProps) {
  const router = useRouter();
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const activeInputSnapshotRef = useRef<{
    element: HTMLInputElement | HTMLTextAreaElement;
    value: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const now = performance.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const activeElement = document.activeElement as HTMLElement | null;
      const isInput =
        activeElement &&
        (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA");
      const isScanTarget = activeElement?.hasAttribute("data-scan-target");

      // Reset buffer if gap exceeds 100ms
      if (timeDiff > 100) {
        bufferRef.current = "";
        activeInputSnapshotRef.current = null;
      }

      // If typing inside a normal text field (not a scan target), snapshot value before burst
      if (isInput && !isScanTarget && bufferRef.current.length === 0) {
        const inputEl = activeElement as HTMLInputElement | HTMLTextAreaElement;
        activeInputSnapshotRef.current = {
          element: inputEl,
          value: inputEl.value,
        };
      }

      // Enter key indicates end of barcode transmission
      if (e.key === "Enter") {
        const scannedCode = bufferRef.current.trim();
        // Scanner burst: at least 6 characters arriving with rapid timing
        if (scannedCode.length >= 6) {
          e.preventDefault();
          e.stopPropagation();

          // Restore normal input value to prevent barcode dump
          if (activeInputSnapshotRef.current) {
            activeInputSnapshotRef.current.element.value =
              activeInputSnapshotRef.current.value;
            activeInputSnapshotRef.current = null;
          }

          bufferRef.current = "";

          toast.info(`Processing scan: ${scannedCode}...`);

          try {
            const result = await resolveCode(scannedCode, tenantId, tenantShortCode);

            if (result.found && result.url) {
              if (result.canCheckIn && result.todayAppointment) {
                // Patient has today's appointment ready to check in
                toast.success(
                  `Checked in ${result.patient?.name || "Patient"} for today's visit!`,
                  {
                    action: {
                      label: "View Queue",
                      onClick: () => router.push("/app/queue"),
                    },
                  }
                );
              } else {
                toast.success(`Found ${result.type}: opening record...`);
              }
              router.push(result.url);
            } else {
              toast.error(result.message || `No record found for ${scannedCode}`);
            }
          } catch (err: any) {
            toast.error("Failed to resolve scanned code");
          }
        }
        bufferRef.current = "";
        return;
      }

      // Collect printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [tenantId, tenantShortCode, router]);

  return null;
}
