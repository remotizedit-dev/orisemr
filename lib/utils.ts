import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind classes cleanly with conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a Bangladeshi mobile number into standard 11-digit format (01XXXXXXXXX).
 * Accepts:
 *   - +8801XXXXXXXXX
 *   - 8801XXXXXXXXX
 *   - 01XXXXXXXXX
 * Validates prefixes for all Bangladeshi operators (GP 017/013, Robi/Airtel 018/016, BL 019/014, Teletalk 015).
 * Returns null if invalid.
 */
export function normalizeBdPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  let normalized = digits;

  if (digits.startsWith("880") && digits.length === 13) {
    normalized = digits.slice(2);
  } else if (digits.startsWith("88") && digits.length === 13) {
    normalized = digits.slice(2);
  }

  // Must match strict Bangladeshi 11-digit mobile format: 01[3-9]XXXXXXXX
  const bdRegex = /^01[3-9]\d{8}$/;
  if (bdRegex.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Formats an 11-digit BD mobile number for visual display: e.g. "01712-345678"
 */
export function formatBdPhone(phone: string): string {
  const normalized = normalizeBdPhone(phone);
  if (!normalized) return phone;
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

/**
 * Formats an integer whole-Taka amount into Bangladeshi currency standard: e.g. "৳1,500" or "৳1,25,000"
 */
export function formatBdt(amountInTaka: number | null | undefined): string {
  if (amountInTaka === null || amountInTaka === undefined || isNaN(amountInTaka)) {
    return "৳0";
  }
  const isNegative = amountInTaka < 0;
  const absVal = Math.abs(Math.round(amountInTaka)).toString();

  // Bangladeshi / Indian numbering format: last 3 digits, then groups of 2 digits
  let result = "";
  if (absVal.length > 3) {
    const lastThree = absVal.slice(-3);
    const rest = absVal.slice(0, -3);
    const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${restFormatted},${lastThree}`;
  } else {
    result = absVal;
  }

  return `${isNegative ? "-" : ""}৳${result}`;
}

/**
 * Formats a given date to Asia/Dhaka time zone standard string.
 * Supports:
 * - "hh:mm" or "hh:mm a": returns 12-hour formatted time (e.g. "06:00 PM")
 * - "dd MMM yyyy": returns date only (e.g. "24 Sep 2026")
 * - "dd MMM yyyy, hh:mm a" (default): returns full date and time (e.g. "24 Sep 2026, 06:00 PM")
 */
export function formatDhakaDate(
  date: Date | string | number | null | undefined,
  formatStr: string = "dd MMM yyyy, hh:mm a"
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  if (formatStr === "hh:mm" || formatStr === "hh:mm a") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  if (formatStr === "dd MMM yyyy") {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Formats a given date/time to Asia/Dhaka 12-hour time string e.g. "06:00 PM"
 */
export function formatDhakaTime(date: Date | string | number | null | undefined): string {
  return formatDhakaDate(date, "hh:mm a");
}

/**
 * Generates an alphanumeric secure random token.
 */
export function generateRandomCode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
